namespace HabitHive.Api.Models;

public class ChatMessage
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public Guid SenderId { get; set; }
    public MessageType MessageType { get; set; }
    public string Content { get; set; } = string.Empty;
    public Guid? ReferencedHabitId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Group Group { get; set; } = null!;
    public User Sender { get; set; } = null!;
    public Habit? ReferencedHabit { get; set; }
    public HabitSuggestion? Suggestion { get; set; }
}
