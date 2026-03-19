namespace HabitHive.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DefaultVisibility DefaultVisibility { get; set; } = DefaultVisibility.HideAll;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Habit> Habits { get; set; } = new List<Habit>();
    public ICollection<GroupMember> GroupMemberships { get; set; } = new List<GroupMember>();
}
