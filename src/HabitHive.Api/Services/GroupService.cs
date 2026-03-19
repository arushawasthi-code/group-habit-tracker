using Microsoft.EntityFrameworkCore;
using HabitHive.Api.Data;
using HabitHive.Api.Models;
using HabitHive.Api.Models.Dtos;

namespace HabitHive.Api.Services;

public class GroupService
{
    private const int MaxMembers = 8;
    private const int MaxGroupsPerUser = 5;
    private static readonly char[] InviteCodeChars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789".ToCharArray();

    private readonly HabitHiveDbContext _db;

    public GroupService(HabitHiveDbContext db)
    {
        _db = db;
    }

    public async Task<List<GroupResponse>> GetGroupsAsync(Guid userId)
    {
        var groups = await _db.GroupMembers
            .Where(gm => gm.UserId == userId && gm.LeftAt == null)
            .Include(gm => gm.Group)
                .ThenInclude(g => g.Members.Where(m => m.LeftAt == null))
            .Select(gm => gm.Group)
            .ToListAsync();

        return groups.Select(g => new GroupResponse(
            g.Id, g.Name, g.Description, g.InviteCode,
            g.Members.Count(m => m.LeftAt == null),
            g.CreatedByUserId == userId
        )).ToList();
    }

    public async Task<GroupResponse> CreateGroupAsync(Guid userId, CreateGroupRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length < 3 || request.Name.Length > 50)
            throw new ArgumentException("Group name must be 3-50 characters");

        var activeGroupCount = await _db.GroupMembers
            .CountAsync(gm => gm.UserId == userId && gm.LeftAt == null);

        if (activeGroupCount >= MaxGroupsPerUser)
            throw new InvalidOperationException(
                "You're in 5 groups already — that's a lot of hives! Leave one to join another.");

        var inviteCode = await GenerateUniqueInviteCode();

        var group = new Group
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            InviteCode = inviteCode,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        var membership = new GroupMember
        {
            GroupId = group.Id,
            UserId = userId,
            JoinedAt = DateTime.UtcNow
        };

        _db.Groups.Add(group);
        _db.GroupMembers.Add(membership);
        await _db.SaveChangesAsync();

        return new GroupResponse(group.Id, group.Name, group.Description, group.InviteCode, 1, true);
    }

    public async Task<GroupResponse> JoinGroupAsync(Guid userId, JoinGroupRequest request)
    {
        var code = request.InviteCode.Trim().ToUpperInvariant();
        var group = await _db.Groups
            .Include(g => g.Members.Where(m => m.LeftAt == null))
            .FirstOrDefaultAsync(g => g.InviteCode == code)
            ?? throw new KeyNotFoundException("That code doesn't match any hive. Double-check it?");

        // Check if already a member (including soft-deleted)
        var existingMembership = await _db.GroupMembers
            .FirstOrDefaultAsync(gm => gm.GroupId == group.Id && gm.UserId == userId);

        if (existingMembership != null && existingMembership.LeftAt == null)
            throw new InvalidOperationException("You're already in this hive!");

        var activeMemberCount = group.Members.Count(m => m.LeftAt == null);
        if (activeMemberCount >= MaxMembers)
            throw new InvalidOperationException("This hive is full! (8/8) Ask them to make room 🐝");

        var activeGroupCount = await _db.GroupMembers
            .CountAsync(gm => gm.UserId == userId && gm.LeftAt == null);
        if (activeGroupCount >= MaxGroupsPerUser)
            throw new InvalidOperationException(
                "You're in 5 groups already — that's a lot of hives! Leave one to join another.");

        if (existingMembership != null)
        {
            // Re-join: clear the LeftAt
            existingMembership.LeftAt = null;
            existingMembership.JoinedAt = DateTime.UtcNow;
        }
        else
        {
            _db.GroupMembers.Add(new GroupMember
            {
                GroupId = group.Id,
                UserId = userId,
                JoinedAt = DateTime.UtcNow
            });
        }

        // Apply default visibility for new member
        var user = await _db.Users.FindAsync(userId);
        if (user?.DefaultVisibility == DefaultVisibility.ShareAll)
        {
            var userHabitIds = await _db.Habits
                .Where(h => h.UserId == userId)
                .Select(h => h.Id)
                .ToListAsync();

            foreach (var habitId in userHabitIds)
            {
                var exists = await _db.HabitGroupVisibilities
                    .AnyAsync(v => v.HabitId == habitId && v.GroupId == group.Id);
                if (!exists)
                {
                    _db.HabitGroupVisibilities.Add(new HabitGroupVisibility
                    {
                        HabitId = habitId,
                        GroupId = group.Id
                    });
                }
            }
        }

        await _db.SaveChangesAsync();

        return new GroupResponse(
            group.Id, group.Name, group.Description, group.InviteCode,
            activeMemberCount + 1, group.CreatedByUserId == userId);
    }

    public async Task<List<GroupMemberResponse>> GetMembersAsync(Guid groupId, Guid userId)
    {
        await VerifyMembership(groupId, userId);

        return await _db.GroupMembers
            .Where(gm => gm.GroupId == groupId && gm.LeftAt == null)
            .Include(gm => gm.User)
            .Select(gm => new GroupMemberResponse(gm.UserId, gm.User.DisplayName, gm.JoinedAt))
            .ToListAsync();
    }

    public async Task<List<GroupHabitsResponse>> GetGroupHabitsAsync(Guid groupId, Guid userId)
    {
        await VerifyMembership(groupId, userId);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var members = await _db.GroupMembers
            .Where(gm => gm.GroupId == groupId && gm.LeftAt == null)
            .Include(gm => gm.User)
            .ToListAsync();

        var result = new List<GroupHabitsResponse>();

        foreach (var member in members)
        {
            var sharedHabits = await _db.HabitGroupVisibilities
                .Where(v => v.GroupId == groupId && v.Habit.UserId == member.UserId)
                .Include(v => v.Habit)
                    .ThenInclude(h => h.Completions.Where(c => c.CompletedDate == today))
                .Select(v => v.Habit)
                .ToListAsync();

            var habitInfos = sharedHabits.Select(h => new SharedHabitInfo(
                h.Id, h.Name, h.Frequency, h.CurrentStreak,
                h.Completions.Any(c => c.CompletedDate == today)
            )).ToList();

            result.Add(new GroupHabitsResponse(member.UserId, member.User.DisplayName, habitInfos));
        }

        return result;
    }

    public async Task LeaveGroupAsync(Guid groupId, Guid userId)
    {
        var membership = await _db.GroupMembers
            .FirstOrDefaultAsync(gm => gm.GroupId == groupId && gm.UserId == userId && gm.LeftAt == null)
            ?? throw new KeyNotFoundException("Not a member of this group");

        membership.LeftAt = DateTime.UtcNow;

        // Remove visibility entries for this user's habits in this group
        var visibilities = await _db.HabitGroupVisibilities
            .Where(v => v.GroupId == groupId && v.Habit.UserId == userId)
            .ToListAsync();
        _db.HabitGroupVisibilities.RemoveRange(visibilities);

        await _db.SaveChangesAsync();
    }

    public async Task DeleteGroupAsync(Guid groupId, Guid userId)
    {
        var group = await _db.Groups
            .FirstOrDefaultAsync(g => g.Id == groupId)
            ?? throw new KeyNotFoundException("Group not found");

        if (group.CreatedByUserId != userId)
            throw new UnauthorizedAccessException("Only the group creator can delete the group");

        // Remove all related data
        var visibilities = await _db.HabitGroupVisibilities.Where(v => v.GroupId == groupId).ToListAsync();
        var messages = await _db.ChatMessages.Where(m => m.GroupId == groupId).ToListAsync();
        var suggestions = await _db.HabitSuggestions
            .Where(s => messages.Select(m => m.Id).Contains(s.ChatMessageId))
            .ToListAsync();
        var memberships = await _db.GroupMembers.Where(gm => gm.GroupId == groupId).ToListAsync();

        _db.HabitSuggestions.RemoveRange(suggestions);
        _db.ChatMessages.RemoveRange(messages);
        _db.HabitGroupVisibilities.RemoveRange(visibilities);
        _db.GroupMembers.RemoveRange(memberships);
        _db.Groups.Remove(group);

        await _db.SaveChangesAsync();
    }

    private async Task VerifyMembership(Guid groupId, Guid userId)
    {
        var isMember = await _db.GroupMembers
            .AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId && gm.LeftAt == null);
        if (!isMember)
            throw new UnauthorizedAccessException("You are not a member of this group");
    }

    private async Task<string> GenerateUniqueInviteCode()
    {
        var random = new Random();
        string code;
        do
        {
            code = new string(Enumerable.Range(0, 6)
                .Select(_ => InviteCodeChars[random.Next(InviteCodeChars.Length)])
                .ToArray());
        } while (await _db.Groups.AnyAsync(g => g.InviteCode == code));

        return code;
    }
}
