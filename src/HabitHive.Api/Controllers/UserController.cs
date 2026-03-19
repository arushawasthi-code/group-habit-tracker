using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HabitHive.Api.Data;
using HabitHive.Api.Models;
using HabitHive.Api.Models.Dtos;

namespace HabitHive.Api.Controllers;

[ApiController]
[Route("api/user")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly HabitHiveDbContext _db;

    public UserController(HabitHiveDbContext db)
    {
        _db = db;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var user = await _db.Users.FindAsync(GetUserId());
        if (user == null) return NotFound();
        return Ok(new UserSettingsResponse(user.DefaultVisibility));
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateSettingsRequest request)
    {
        var user = await _db.Users.FindAsync(GetUserId());
        if (user == null) return NotFound();

        user.DefaultVisibility = request.DefaultVisibility;
        await _db.SaveChangesAsync();

        return Ok(new UserSettingsResponse(user.DefaultVisibility));
    }
}
