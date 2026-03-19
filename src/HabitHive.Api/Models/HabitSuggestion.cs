namespace HabitHive.Api.Models;

public class HabitSuggestion
{
    public Guid Id { get; set; }
    public Guid ChatMessageId { get; set; }
    public Guid TargetUserId { get; set; }
    public Guid TargetHabitId { get; set; }
    public SuggestionType SuggestionType { get; set; }
    public string SuggestionPayload { get; set; } = string.Empty;
    public SuggestionStatus Status { get; set; } = SuggestionStatus.Pending;

    public ChatMessage ChatMessage { get; set; } = null!;
    public User TargetUser { get; set; } = null!;
    public Habit TargetHabit { get; set; } = null!;
}
