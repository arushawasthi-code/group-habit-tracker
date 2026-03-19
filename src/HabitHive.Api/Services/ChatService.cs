using Microsoft.EntityFrameworkCore;
using HabitHive.Api.Data;
using HabitHive.Api.Models;
using HabitHive.Api.Models.Dtos;

namespace HabitHive.Api.Services;

public class ChatService
{
    private readonly HabitHiveDbContext _db;

    public ChatService(HabitHiveDbContext db)
    {
        _db = db;
    }

    public async Task<MessagesResponse> GetMessagesAsync(Guid groupId, Guid userId, DateTime? before, int limit = 50)
    {
        await VerifyMembership(groupId, userId);

        var query = _db.ChatMessages
            .Where(m => m.GroupId == groupId);

        if (before.HasValue)
            query = query.Where(m => m.CreatedAt < before.Value);

        var messages = await query
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit + 1)
            .Include(m => m.Sender)
            .Include(m => m.ReferencedHabit)
            .Include(m => m.Suggestion)
                .ThenInclude(s => s!.TargetUser)
            .Include(m => m.Suggestion)
                .ThenInclude(s => s!.TargetHabit)
            .ToListAsync();

        var hasMore = messages.Count > limit;
        var result = messages.Take(limit).Select(MapToResponse).Reverse().ToList();

        return new MessagesResponse(result, hasMore);
    }

    public async Task<ChatMessageResponse> SaveMessageAsync(Guid groupId, Guid senderId, SendMessageRequest request)
    {
        await VerifyMembership(groupId, senderId);

        var message = new ChatMessage
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            SenderId = senderId,
            MessageType = request.Type,
            Content = request.Content,
            ReferencedHabitId = request.ReferencedHabitId,
            CreatedAt = DateTime.UtcNow
        };

        _db.ChatMessages.Add(message);
        await _db.SaveChangesAsync();

        // Reload with includes
        var saved = await _db.ChatMessages
            .Include(m => m.Sender)
            .Include(m => m.ReferencedHabit)
            .FirstAsync(m => m.Id == message.Id);

        return MapToResponse(saved);
    }

    public async Task<ChatMessageResponse> SaveSpecialMessageAsync(
        Guid groupId, Guid senderId, SendSpecialMessageRequest request)
    {
        await VerifyMembership(groupId, senderId);

        var habit = await _db.Habits.FindAsync(request.TargetHabitId)
            ?? throw new KeyNotFoundException("Habit not found");

        // Verify habit is shared with this group
        var isShared = await _db.HabitGroupVisibilities
            .AnyAsync(v => v.HabitId == request.TargetHabitId && v.GroupId == groupId);
        if (!isShared)
            throw new InvalidOperationException("This habit is not shared with this group");

        // Cannot target own habit
        if (habit.UserId == senderId)
            throw new InvalidOperationException("You can't send a special message for your own habit");

        var content = System.Text.Json.JsonSerializer.Serialize(new
        {
            template = request.Template.ToString(),
            caption = request.Caption
        });

        var message = new ChatMessage
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            SenderId = senderId,
            MessageType = MessageType.SpecialMessage,
            Content = content,
            ReferencedHabitId = request.TargetHabitId,
            CreatedAt = DateTime.UtcNow
        };

        _db.ChatMessages.Add(message);
        await _db.SaveChangesAsync();

        var saved = await _db.ChatMessages
            .Include(m => m.Sender)
            .Include(m => m.ReferencedHabit)
            .FirstAsync(m => m.Id == message.Id);

        return MapToResponse(saved);
    }

    public async Task<ChatMessageResponse> SaveHabitSuggestionAsync(
        Guid groupId, Guid senderId, SendHabitSuggestionRequest request)
    {
        await VerifyMembership(groupId, senderId);

        var habit = await _db.Habits.Include(h => h.User).FirstOrDefaultAsync(h => h.Id == request.TargetHabitId)
            ?? throw new KeyNotFoundException("Habit not found");

        var isShared = await _db.HabitGroupVisibilities
            .AnyAsync(v => v.HabitId == request.TargetHabitId && v.GroupId == groupId);
        if (!isShared)
            throw new InvalidOperationException("This habit is not shared with this group");

        var content = System.Text.Json.JsonSerializer.Serialize(new
        {
            suggestionType = request.SuggestionType.ToString(),
            payload = request.SuggestionPayload
        });

        var message = new ChatMessage
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            SenderId = senderId,
            MessageType = MessageType.HabitSuggestion,
            Content = content,
            ReferencedHabitId = request.TargetHabitId,
            CreatedAt = DateTime.UtcNow
        };

        var suggestion = new HabitSuggestion
        {
            Id = Guid.NewGuid(),
            ChatMessageId = message.Id,
            TargetUserId = habit.UserId,
            TargetHabitId = request.TargetHabitId,
            SuggestionType = request.SuggestionType,
            SuggestionPayload = request.SuggestionPayload,
            Status = SuggestionStatus.Pending
        };

        _db.ChatMessages.Add(message);
        _db.HabitSuggestions.Add(suggestion);
        await _db.SaveChangesAsync();

        var saved = await _db.ChatMessages
            .Include(m => m.Sender)
            .Include(m => m.ReferencedHabit)
            .Include(m => m.Suggestion).ThenInclude(s => s!.TargetUser)
            .Include(m => m.Suggestion).ThenInclude(s => s!.TargetHabit)
            .FirstAsync(m => m.Id == message.Id);

        return MapToResponse(saved);
    }

    public async Task<SuggestionStatus> RespondToSuggestionAsync(Guid suggestionId, Guid userId, bool accepted)
    {
        var suggestion = await _db.HabitSuggestions
            .Include(s => s.TargetHabit)
            .FirstOrDefaultAsync(s => s.Id == suggestionId)
            ?? throw new KeyNotFoundException("Suggestion not found");

        if (suggestion.TargetUserId != userId)
            throw new UnauthorizedAccessException("Only the habit owner can respond to suggestions");

        if (suggestion.Status != SuggestionStatus.Pending)
            throw new InvalidOperationException("This suggestion has already been responded to");

        suggestion.Status = accepted ? SuggestionStatus.Accepted : SuggestionStatus.Dismissed;

        if (accepted)
        {
            await ApplySuggestionAsync(suggestion);
        }

        await _db.SaveChangesAsync();
        return suggestion.Status;
    }

    private async Task ApplySuggestionAsync(HabitSuggestion suggestion)
    {
        var habit = suggestion.TargetHabit;
        var payload = System.Text.Json.JsonDocument.Parse(suggestion.SuggestionPayload);

        switch (suggestion.SuggestionType)
        {
            case SuggestionType.Reword:
                if (payload.RootElement.TryGetProperty("newName", out var newName))
                    habit.Name = newName.GetString() ?? habit.Name;
                if (payload.RootElement.TryGetProperty("newDescription", out var newDesc))
                    habit.Description = newDesc.GetString();
                break;

            case SuggestionType.Split:
                if (payload.RootElement.TryGetProperty("newHabits", out var newHabits))
                {
                    var visibilities = await _db.HabitGroupVisibilities
                        .Where(v => v.HabitId == habit.Id)
                        .ToListAsync();

                    foreach (var item in newHabits.EnumerateArray())
                    {
                        var name = item.GetProperty("name").GetString() ?? "New Habit";
                        var newHabit = new Habit
                        {
                            Id = Guid.NewGuid(),
                            UserId = suggestion.TargetUserId,
                            Name = name,
                            Frequency = habit.Frequency,
                            CustomDays = habit.CustomDays,
                            CreatedAt = DateTime.UtcNow
                        };
                        _db.Habits.Add(newHabit);

                        // Copy visibility
                        foreach (var v in visibilities)
                        {
                            _db.HabitGroupVisibilities.Add(new HabitGroupVisibility
                            {
                                HabitId = newHabit.Id,
                                GroupId = v.GroupId
                            });
                        }
                    }

                    // Delete original
                    _db.HabitGroupVisibilities.RemoveRange(visibilities);
                    var completions = await _db.HabitCompletions.Where(c => c.HabitId == habit.Id).ToListAsync();
                    _db.HabitCompletions.RemoveRange(completions);
                    _db.Habits.Remove(habit);
                }
                break;

            case SuggestionType.Combine:
                // Payload contains habitIds to combine and a new name
                if (payload.RootElement.TryGetProperty("newName", out var combinedName) &&
                    payload.RootElement.TryGetProperty("habitIds", out var habitIds))
                {
                    habit.Name = combinedName.GetString() ?? habit.Name;

                    foreach (var idElem in habitIds.EnumerateArray())
                    {
                        var otherHabitId = Guid.Parse(idElem.GetString()!);
                        if (otherHabitId == habit.Id) continue;

                        var otherHabit = await _db.Habits
                            .Include(h => h.Completions)
                            .Include(h => h.GroupVisibilities)
                            .FirstOrDefaultAsync(h => h.Id == otherHabitId && h.UserId == suggestion.TargetUserId);

                        if (otherHabit != null)
                        {
                            _db.HabitCompletions.RemoveRange(otherHabit.Completions);
                            _db.HabitGroupVisibilities.RemoveRange(otherHabit.GroupVisibilities);
                            _db.Habits.Remove(otherHabit);
                        }
                    }
                }
                break;
        }
    }

    private ChatMessageResponse MapToResponse(ChatMessage m)
    {
        HabitSuggestionResponse? suggestionResponse = null;
        if (m.Suggestion != null)
        {
            suggestionResponse = new HabitSuggestionResponse(
                m.Suggestion.Id,
                m.Suggestion.TargetUserId,
                m.Suggestion.TargetUser?.DisplayName ?? "",
                m.Suggestion.TargetHabitId,
                m.Suggestion.TargetHabit?.Name ?? "",
                m.Suggestion.SuggestionType,
                m.Suggestion.SuggestionPayload,
                m.Suggestion.Status);
        }

        return new ChatMessageResponse(
            m.Id, m.GroupId, m.SenderId,
            m.Sender?.DisplayName ?? "",
            m.MessageType, m.Content,
            m.ReferencedHabitId,
            m.ReferencedHabit?.Name,
            m.CreatedAt,
            suggestionResponse);
    }

    private async Task VerifyMembership(Guid groupId, Guid userId)
    {
        var isMember = await _db.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId && gm.LeftAt == null);
        if (!isMember)
            throw new UnauthorizedAccessException("You are not a member of this group");
    }
}
