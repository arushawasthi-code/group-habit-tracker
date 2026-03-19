using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HabitHive.Api.Models.Dtos;
using HabitHive.Api.Services;

namespace HabitHive.Api.Controllers;

[ApiController]
[Route("api/habits")]
[Authorize]
public class HabitsController : ControllerBase
{
    private readonly HabitService _habitService;

    public HabitsController(HabitService habitService)
    {
        _habitService = habitService;
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
            var result = await _habitService.CompleteHabitAsync(GetUserId(), id, request);
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
