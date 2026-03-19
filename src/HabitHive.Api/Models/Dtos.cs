namespace HabitHive.Api.Models.Dtos;

// Auth
public record RegisterRequest(string Username, string DisplayName, string Password);
public record LoginRequest(string Username, string Password);
public record AuthResponse(Guid UserId, string DisplayName, string Token);

// Habits
public record CreateHabitRequest(string Name, string? Description, HabitFrequency Frequency, string? CustomDays);
public record UpdateHabitRequest(string Name, string? Description, HabitFrequency Frequency, string? CustomDays);
public record CompleteHabitRequest(string? PhotoUrl, string? Note);
public record HabitResponse(
    Guid Id, string Name, string? Description, HabitFrequency Frequency, string? CustomDays,
    int CurrentStreak, int LongestStreak, bool CompletedToday,
    List<HabitVisibilityInfo> Visibility);
public record HabitVisibilityInfo(Guid GroupId, string GroupName);
public record CompleteHabitResponse(DateOnly CompletedDate, int CurrentStreak, int LongestStreak);
public record UpdateVisibilityRequest(List<Guid> GroupIds);

// Groups
public record CreateGroupRequest(string Name, string? Description);
public record JoinGroupRequest(string InviteCode);
public record GroupResponse(Guid Id, string Name, string? Description, string InviteCode, int MemberCount, bool IsCreator);
public record GroupMemberResponse(Guid UserId, string DisplayName, DateTime JoinedAt);
public record GroupHabitsResponse(Guid UserId, string DisplayName, List<SharedHabitInfo> Habits);
public record SharedHabitInfo(Guid Id, string Name, HabitFrequency Frequency, int CurrentStreak, bool CompletedToday);

// Chat
public record ChatMessageResponse(
    Guid Id, Guid GroupId, Guid SenderId, string SenderDisplayName,
    MessageType MessageType, string Content, Guid? ReferencedHabitId,
    string? ReferencedHabitName, DateTime CreatedAt,
    HabitSuggestionResponse? Suggestion);
public record HabitSuggestionResponse(
    Guid Id, Guid TargetUserId, string TargetDisplayName,
    Guid TargetHabitId, string TargetHabitName,
    SuggestionType SuggestionType, string SuggestionPayload, SuggestionStatus Status);
public record MessagesResponse(List<ChatMessageResponse> Messages, bool HasMore);

// SignalR
public record SendMessageRequest(MessageType Type, string Content, Guid? ReferencedHabitId);
public record SendSpecialMessageRequest(SpecialMessageTemplate Template, Guid TargetHabitId, string? Caption);
public record SendHabitSuggestionRequest(Guid TargetHabitId, SuggestionType SuggestionType, string SuggestionPayload);

// GIF
public record GifResult(string Id, string Url, string PreviewUrl, int Width, int Height);

// Upload
public record UploadResponse(string Url);

// User settings
public record UpdateSettingsRequest(DefaultVisibility DefaultVisibility);
public record UserSettingsResponse(DefaultVisibility DefaultVisibility);
