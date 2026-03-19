namespace HabitHive.Api.Models;

public class Habit
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public HabitFrequency Frequency { get; set; }
    public string? CustomDays { get; set; }
    public int CurrentStreak { get; set; }
    public int LongestStreak { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public ICollection<HabitCompletion> Completions { get; set; } = new List<HabitCompletion>();
    public ICollection<HabitGroupVisibility> GroupVisibilities { get; set; } = new List<HabitGroupVisibility>();
}
