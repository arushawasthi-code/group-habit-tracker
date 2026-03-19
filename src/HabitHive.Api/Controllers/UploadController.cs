using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HabitHive.Api.Models.Dtos;

namespace HabitHive.Api.Controllers;

[ApiController]
[Route("api/upload")]
[Authorize]
public class UploadController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private const long MaxFileSize = 5 * 1024 * 1024; // 5MB
    private static readonly HashSet<string> AllowedExtensions = new() { ".jpg", ".jpeg", ".png" };

    public UploadController(IWebHostEnvironment env)
    {
        _env = env;
    }

    [HttpPost("photo")]
    public async Task<IActionResult> UploadPhoto(IFormFile file)
    {
        if (file.Length > MaxFileSize)
            return StatusCode(413, new { message = "That photo's too thicc (5MB max)" });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
            return StatusCode(415, new { message = "Only JPEG and PNG files are supported" });

        var uploadsDir = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads");
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsDir, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        return Ok(new UploadResponse($"/uploads/{fileName}"));
    }
}
