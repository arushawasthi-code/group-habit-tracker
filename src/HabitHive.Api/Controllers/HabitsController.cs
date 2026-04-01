using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using HabitHive.Api.Hubs;
using HabitHive.Api.Models;
using HabitHive.Api.Models.Dtos;
using HabitHive.Api.Services;

namespace HabitHive.Api.Controllers;

[ApiController]
[Route("api/habits")]
[Authorize]
public class HabitsController : ControllerBase
{
    private readonly HabitService _habitService;
    private readonly ChatService _chatService;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly ILogger<HabitsController> _logger;

    public HabitsController(HabitService habitService, ChatService chatService,
        IHubContext<ChatHub> hubContext, ILogger<HabitsController> logger)
    {
        _habitService = habitService;
        _chatService = chatService;
        _hubContext = hubContext;
        _logger = logger;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetHabits()
    {
        var habits = await _habitService.GetHabitsAsync(GetUserId());
        return Ok(habits);
    }

    [HttpPost]
    public async Task<IActionResult> CreateHabit([FromBody] CreateHabitRequest request)
    {
        try
        {
            var habit = await _habitService.CreateHabitAsync(GetUserId(), request);
            return StatusCode(201, habit);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateHabit(Guid id, [FromBody] UpdateHabitRequest request)
    {
        try
        {
            var habit = await _habitService.UpdateHabitAsync(GetUserId(), id, request);
            return Ok(habit);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Habit not found" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteHabit(Guid id)
    {
        try
        {
            await _habitService.DeleteHabitAsync(GetUserId(), id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Habit not found" });
        }
    }

    [HttpPost("{id}/complete")]
    public async Task<IActionResult> CompleteHabit(Guid id, [FromBody] CompleteHabitRequest request)
    {
        try
        {
            var userId = GetUserId();
            var result = await _habitService.CompleteHabitAsync(userId, id, request);

            // Auto-post completion message to all groups this habit is shared with
            var groupIds = await _habitService.GetSharedGroupIdsAsync(userId, id);
            if (groupIds.Count > 0)
            {
                var content = System.Text.Json.JsonSerializer.Serialize(new
                {
                    streak = result.CurrentStreak,
                    photoUrl = request.PhotoUrl,
                    note = request.Note
                });
                var msgRequest = new SendMessageRequest(MessageType.HabitCompletion, content, id);

                foreach (var groupId in groupIds)
                {
                    try
                    {
                        var msg = await _chatService.SaveMessageAsync(groupId, userId, msgRequest);
                        await _hubContext.Clients.Group(groupId.ToString()).SendAsync("ReceiveMessage", msg);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex,
                            "Failed to post completion message to group {GroupId} for habit {HabitId}",
                            groupId, id);
                    }
                }
            }

            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Habit not found" });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPut("{id}/visibility")]
    public async Task<IActionResult> UpdateVisibility(Guid id, [FromBody] UpdateVisibilityRequest request)
    {
        try
        {
            await _habitService.UpdateVisibilityAsync(GetUserId(), id, request);
            return Ok();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Habit not found" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
