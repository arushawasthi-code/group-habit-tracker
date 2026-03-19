using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HabitHive.Api.Models.Dtos;

namespace HabitHive.Api.Controllers;

[ApiController]
[Route("api/gif")]
[Authorize]
public class GifController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;

    public GifController(IConfiguration config, IHttpClientFactory httpClientFactory)
    {
        _config = config;
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] int limit = 20)
    {
        var apiKey = _config["Tenor:ApiKey"];
        if (string.IsNullOrEmpty(apiKey))
            return Ok(Array.Empty<GifResult>());

        var client = _httpClientFactory.CreateClient();
        var url = $"https://tenor.googleapis.com/v2/search?q={Uri.EscapeDataString(q)}&key={apiKey}&limit={limit}&media_filter=gif,tinygif";

        var response = await client.GetAsync(url);
        if (!response.IsSuccessStatusCode)
            return Ok(Array.Empty<GifResult>());

        var json = await response.Content.ReadFromJsonAsync<TenorResponse>();
        var results = json?.Results?.Select(r =>
        {
            var gif = r.MediaFormats?.GetValueOrDefault("gif");
            var preview = r.MediaFormats?.GetValueOrDefault("tinygif");
            return new GifResult(
                r.Id ?? "",
                gif?.Url ?? "",
                preview?.Url ?? gif?.Url ?? "",
                gif?.Dims?.ElementAtOrDefault(0) ?? 0,
                gif?.Dims?.ElementAtOrDefault(1) ?? 0);
        }).Where(g => !string.IsNullOrEmpty(g.Url)).ToList() ?? new List<GifResult>();

        return Ok(results);
    }

    private class TenorResponse
    {
        public List<TenorResult>? Results { get; set; }
    }

    private class TenorResult
    {
        public string? Id { get; set; }
        public Dictionary<string, TenorMedia>? MediaFormats { get; set; }
    }

    private class TenorMedia
    {
        public string? Url { get; set; }
        public List<int>? Dims { get; set; }
    }
}
