using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HabitHive.Api.Models.Dtos;
using HabitHive.Api.Services;

namespace HabitHive.Api.Controllers;

[ApiController]
[Route("api/groups")]
[Authorize]
public class GroupsController : ControllerBase
{
    private readonly GroupService _groupService;
    private readonly ChatService _chatService;

    public GroupsController(GroupService groupService, ChatService chatService)
    {
        _groupService = groupService;
        _chatService = chatService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetGroups()
    {
        var groups = await _groupService.GetGroupsAsync(GetUserId());
        return Ok(groups);
    }

    [HttpPost]
    public async Task<IActionResult> CreateGroup([FromBody] CreateGroupRequest request)
    {
        try
        {
            var group = await _groupService.CreateGroupAsync(GetUserId(), request);
            return StatusCode(201, group);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPost("join")]
    public async Task<IActionResult> JoinGroup([FromBody] JoinGroupRequest request)
    {
        try
        {
            var group = await _groupService.JoinGroupAsync(GetUserId(), request);
            return Ok(group);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetMembers(Guid id)
    {
        try
        {
            var members = await _groupService.GetMembersAsync(id, GetUserId());
            return Ok(members);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [HttpGet("{id}/habits")]
    public async Task<IActionResult> GetGroupHabits(Guid id)
    {
        try
        {
            var habits = await _groupService.GetGroupHabitsAsync(id, GetUserId());
            return Ok(habits);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [HttpGet("{id}/messages")]
    public async Task<IActionResult> GetMessages(Guid id, [FromQuery] DateTime? before, [FromQuery] int limit = 50)
    {
        try
        {
            var messages = await _chatService.GetMessagesAsync(id, GetUserId(), before, limit);
            return Ok(messages);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [HttpPost("{id}/leave")]
    public async Task<IActionResult> LeaveGroup(Guid id)
    {
        try
        {
            await _groupService.LeaveGroupAsync(id, GetUserId());
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteGroup(Guid id)
    {
        try
        {
            await _groupService.DeleteGroupAsync(id, GetUserId());
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }
}
