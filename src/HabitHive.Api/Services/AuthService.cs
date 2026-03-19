using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using HabitHive.Api.Data;
using HabitHive.Api.Models;
using HabitHive.Api.Models.Dtos;

namespace HabitHive.Api.Services;

public class AuthService
{
    private readonly HabitHiveDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(HabitHiveDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        if (request.Username.Length < 3 || request.Username.Length > 20)
            throw new ArgumentException("Username must be 3-20 characters");

        if (!System.Text.RegularExpressions.Regex.IsMatch(request.Username, @"^[a-zA-Z0-9_]+$"))
            throw new ArgumentException("Username can only contain letters, numbers, and underscores");

        if (request.Password.Length < 8)
            throw new ArgumentException("Password must be at least 8 characters");

        if (await _db.Users.AnyAsync(u => u.Username.ToLower() == request.Username.ToLower()))
            throw new InvalidOperationException("That username's taken — the hive is competitive 🐝");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username.ToLower(),
            DisplayName = request.DisplayName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            DefaultVisibility = DefaultVisibility.HideAll,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = GenerateToken(user);
        return new AuthResponse(user.Id, user.DisplayName, token);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == request.Username.ToLower());

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Wrong password. Happens to the best of us.");

        var token = GenerateToken(user);
        return new AuthResponse(user.Id, user.DisplayName, token);
    }

    private string GenerateToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            _config["Jwt:Key"] ?? throw new InvalidOperationException("JWT key not configured")));

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim("displayName", user.DisplayName)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
