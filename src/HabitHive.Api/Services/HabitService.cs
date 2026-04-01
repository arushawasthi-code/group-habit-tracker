using Microsoft.EntityFrameworkCore;
using HabitHive.Api.Data;
using HabitHive.Api.Models;
using HabitHive.Api.Models.Dtos;

namespace HabitHive.Api.Services;

public class HabitService
{
    private readonly HabitHiveDbContext _db;

    public HabitService(HabitHiveDbContext db)
    {
        _db = db;
    }

    public async Task<List<HabitResponse>> GetHabitsAsync(Guid userId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var habits = await _db.Habits
            .Where(h => h.UserId == userId)
            .Include(h => h.Completions.Where(c => c.CompletedDate == today))
            .Include(h => h.GroupVisibilities)
                .ThenInclude(v => v.Group)
            .OrderByDescending(h => h.CreatedAt)
            .ToListAsync();

        return habits.Select(h => new HabitResponse(
            h.Id, h.Name, h.Description, h.Frequency, h.CustomDays,
            h.CurrentStreak, h.LongestStreak,
            h.Completions.Any(c => c.CompletedDate == today),
            h.GroupVisibilities.Select(v => new HabitVisibilityInfo(v.GroupId, v.Group.Name)).ToList()
        )).ToList();
    }

    public async Task<HabitResponse> CreateHabitAsync(Guid userId, CreateHabitRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 100)
            throw new ArgumentException("Habit name must be 1-100 characters");

        if (request.Description?.Length > 500)
            throw new ArgumentException("Description must be 500 characters or less");

        if (request.Frequency == HabitFrequency.Custom && string.IsNullOrWhiteSpace(request.CustomDays))
            throw new ArgumentException("Custom frequency requires at least one day selected");

        var habit = new Habit
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Frequency = request.Frequency,
            CustomDays = request.CustomDays,
            CurrentStreak = 0,
            LongestStreak = 0,
            CreatedAt = DateTime.UtcNow
        };

        _db.Habits.Add(habit);

        // Apply default visibility
        var user = await _db.Users.FindAsync(userId);
        if (user?.DefaultVisibility == DefaultVisibility.ShareAll)
        {
            var groupIds = await _db.GroupMembers
                .Where(gm => gm.UserId == userId && gm.LeftAt == null)
                .Select(gm => gm.GroupId)
                .ToListAsync();

            foreach (var groupId in groupIds)
            {
                _db.HabitGroupVisibilities.Add(new HabitGroupVisibility
                {
                    HabitId = habit.Id,
                    GroupId = groupId
                });
            }
        }

        await _db.SaveChangesAsync();

        return new HabitResponse(
            habit.Id, habit.Name, habit.Description, habit.Frequency, habit.CustomDays,
            0, 0, false, new List<HabitVisibilityInfo>());
    }

    public async Task<HabitResponse> UpdateHabitAsync(Guid userId, Guid habitId, UpdateHabitRequest request)
    {
        var habit = await _db.Habits
            .Include(h => h.GroupVisibilities).ThenInclude(v => v.Group)
            .FirstOrDefaultAsync(h => h.Id == habitId && h.UserId == userId)
            ?? throw new KeyNotFoundException("Habit not found");

        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 100)
            throw new ArgumentException("Habit name must be 1-100 characters");

        habit.Name = request.Name.Trim();
        habit.Description = request.Description?.Trim();
        habit.Frequency = request.Frequency;
        habit.CustomDays = request.CustomDays;

        await _db.SaveChangesAsync();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var completedToday = await _db.HabitCompletions.AnyAsync(c => c.HabitId == habitId && c.CompletedDate == today);

        return new HabitResponse(
            habit.Id, habit.Name, habit.Description, habit.Frequency, habit.CustomDays,
            habit.CurrentStreak, habit.LongestStreak, completedToday,
            habit.GroupVisibilities.Select(v => new HabitVisibilityInfo(v.GroupId, v.Group.Name)).ToList());
    }

    public async Task DeleteHabitAsync(Guid userId, Guid habitId)
    {
        var habit = await _db.Habits
            .Include(h => h.Completions)
            .Include(h => h.GroupVisibilities)
            .FirstOrDefaultAsync(h => h.Id == habitId && h.UserId == userId)
            ?? throw new KeyNotFoundException("Habit not found");

        _db.HabitCompletions.RemoveRange(habit.Completions);
        _db.HabitGroupVisibilities.RemoveRange(habit.GroupVisibilities);
        _db.Habits.Remove(habit);
        await _db.SaveChangesAsync();
    }

    public async Task<CompleteHabitResponse> CompleteHabitAsync(Guid userId, Guid habitId, CompleteHabitRequest request)
    {
        var habit = await _db.Habits
            .Include(h => h.Completions)
            .FirstOrDefaultAsync(h => h.Id == habitId && h.UserId == userId)
            ?? throw new KeyNotFoundException("Habit not found");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        if (habit.Completions.Any(c => c.CompletedDate == today))
            throw new InvalidOperationException("Already completed today");

        var completion = new HabitCompletion
        {
            Id = Guid.NewGuid(),
            HabitId = habitId,
            CompletedDate = today,
            CompletedAt = DateTime.UtcNow,
            PhotoUrl = request.PhotoUrl,
            Note = request.Note
        };

        _db.HabitCompletions.Add(completion);

        // Calculate streak
        CalculateStreak(habit, today);

        await _db.SaveChangesAsync();

        return new CompleteHabitResponse(today, habit.CurrentStreak, habit.LongestStreak);
    }

    private void CalculateStreak(Habit habit, DateOnly today)
    {
        var completions = habit.Completions
            .Select(c => c.CompletedDate)
            .Append(today)
            .Distinct()
            .OrderByDescending(d => d)
            .ToList();

        int streak = 0;

        switch (habit.Frequency)
        {
            case HabitFrequency.Daily:
                var expected = today;
                foreach (var date in completions)
                {
                    if (date == expected)
                    {
                        streak++;
                        expected = expected.AddDays(-1);
                    }
                    else if (date < expected)
                    {
                        break;
                    }
                }
                break;

            case HabitFrequency.Weekly:
                var currentWeekStart = GetWeekStart(today);
                var weekStarts = completions
                    .Select(d => GetWeekStart(d))
                    .Distinct()
                    .OrderByDescending(d => d)
                    .ToList();

                var expectedWeek = currentWeekStart;
                foreach (var weekStart in weekStarts)
                {
                    if (weekStart == expectedWeek)
                    {
                        streak++;
                        expectedWeek = expectedWeek.AddDays(-7);
                    }
                    else if (weekStart < expectedWeek)
                    {
                        break;
                    }
                }
                break;

            case HabitFrequency.Custom:
                if (string.IsNullOrEmpty(habit.CustomDays))
                {
                    streak = 1;
                    break;
                }

                var requiredDays = habit.CustomDays.Split(',')
                    .Select(d => Enum.Parse<DayOfWeek>(d.Trim(), true))
                    .ToHashSet();

                var checkDate = today;
                bool counting = true;
                while (counting)
                {
                    if (requiredDays.Contains(checkDate.DayOfWeek))
                    {
                        if (completions.Contains(checkDate))
                        {
                            streak++;
                            checkDate = checkDate.AddDays(-1);
                        }
                        else
                        {
                            counting = false;
                        }
                    }
                    else
                    {
                        checkDate = checkDate.AddDays(-1);
                    }

                    if (checkDate < today.AddDays(-90)) break;
                }
                break;
        }

        habit.CurrentStreak = streak;
        if (streak > habit.LongestStreak)
            habit.LongestStreak = streak;
    }

    private static DateOnly GetWeekStart(DateOnly date)
    {
        var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
        return date.AddDays(-diff);
    }

    public async Task UpdateVisibilityAsync(Guid userId, Guid habitId, UpdateVisibilityRequest request)
    {
        var habit = await _db.Habits
            .Include(h => h.GroupVisibilities)
            .FirstOrDefaultAsync(h => h.Id == habitId && h.UserId == userId)
            ?? throw new KeyNotFoundException("Habit not found");

        // Verify user is a member of all requested groups
        var userGroupIds = await _db.GroupMembers
            .Where(gm => gm.UserId == userId && gm.LeftAt == null)
            .Select(gm => gm.GroupId)
            .ToListAsync();

        var invalidGroups = request.GroupIds.Except(userGroupIds).ToList();
        if (invalidGroups.Any())
            throw new ArgumentException("You are not a member of one or more specified groups");

        // Remove existing
        _db.HabitGroupVisibilities.RemoveRange(habit.GroupVisibilities);

        // Add new
        foreach (var groupId in request.GroupIds)
        {
            _db.HabitGroupVisibilities.Add(new HabitGroupVisibility
            {
                HabitId = habitId,
                GroupId = groupId
            });
        }

        await _db.SaveChangesAsync();
    }

    public async Task<List<Guid>> GetSharedGroupIdsAsync(Guid habitId)
    {
        return await _db.HabitGroupVisibilities
            .Where(v => v.HabitId == habitId)
            .Select(v => v.GroupId)
            .ToListAsync();
    }
}
