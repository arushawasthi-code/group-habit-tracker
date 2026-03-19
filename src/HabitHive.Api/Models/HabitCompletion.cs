namespace HabitHive.Api.Models;

public class HabitCompletion
{
    public Guid Id { get; set; }
    public Guid HabitId { get; set; }
    public DateOnly CompletedDate { get; set; }
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
    public string? PhotoUrl { get; set; }
    public string? Note { get; set; }

    public Habit Habit { get; set; } = null!;
}
