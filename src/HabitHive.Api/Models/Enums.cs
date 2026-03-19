namespace HabitHive.Api.Models;

public enum HabitFrequency
{
    Daily,
    Weekly,
    Custom
}

public enum DefaultVisibility
{
    HideAll,
    ShareAll
}

public enum MessageType
{
    Text,
    Gif,
    HabitCompletion,
    SpecialMessage,
    HabitSuggestion
}

public enum SpecialMessageTemplate
{
    LockIn,
    YouCanDoThis,
    StopBeingLazy
}

public enum SuggestionType
{
    Split,
    Combine,
    Reword
}

public enum SuggestionStatus
{
    Pending,
    Accepted,
    Dismissed
}
