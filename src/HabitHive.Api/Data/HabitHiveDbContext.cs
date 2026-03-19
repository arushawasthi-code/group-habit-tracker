using Microsoft.EntityFrameworkCore;
using HabitHive.Api.Models;

namespace HabitHive.Api.Data;

public class HabitHiveDbContext : DbContext
{
    public HabitHiveDbContext(DbContextOptions<HabitHiveDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Habit> Habits => Set<Habit>();
    public DbSet<HabitCompletion> HabitCompletions => Set<HabitCompletion>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();
    public DbSet<HabitGroupVisibility> HabitGroupVisibilities => Set<HabitGroupVisibility>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<HabitSuggestion> HabitSuggestions => Set<HabitSuggestion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // User
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Username).IsUnique();
            e.Property(u => u.Username).HasMaxLength(20);
            e.Property(u => u.DisplayName).HasMaxLength(50);
        });

        // Habit
        modelBuilder.Entity<Habit>(e =>
        {
            e.HasKey(h => h.Id);
            e.HasIndex(h => h.UserId);
            e.Property(h => h.Name).HasMaxLength(100);
            e.Property(h => h.Description).HasMaxLength(500);
            e.HasOne(h => h.User).WithMany(u => u.Habits).HasForeignKey(h => h.UserId);
        });

        // HabitCompletion
        modelBuilder.Entity<HabitCompletion>(e =>
        {
            e.HasKey(hc => hc.Id);
            e.HasIndex(hc => new { hc.HabitId, hc.CompletedDate }).IsUnique();
            e.HasOne(hc => hc.Habit).WithMany(h => h.Completions).HasForeignKey(hc => hc.HabitId);
        });

        // Group
        modelBuilder.Entity<Group>(e =>
        {
            e.HasKey(g => g.Id);
            e.HasIndex(g => g.InviteCode).IsUnique();
            e.Property(g => g.Name).HasMaxLength(50);
            e.Property(g => g.Description).HasMaxLength(200);
            e.Property(g => g.InviteCode).HasMaxLength(6);
            e.HasOne(g => g.CreatedBy).WithMany().HasForeignKey(g => g.CreatedByUserId);
        });

        // GroupMember (composite key)
        modelBuilder.Entity<GroupMember>(e =>
        {
            e.HasKey(gm => new { gm.GroupId, gm.UserId });
            e.HasIndex(gm => gm.UserId);
            e.HasOne(gm => gm.Group).WithMany(g => g.Members).HasForeignKey(gm => gm.GroupId);
            e.HasOne(gm => gm.User).WithMany(u => u.GroupMemberships).HasForeignKey(gm => gm.UserId);
        });

        // HabitGroupVisibility (composite key)
        modelBuilder.Entity<HabitGroupVisibility>(e =>
        {
            e.HasKey(v => new { v.HabitId, v.GroupId });
            e.HasOne(v => v.Habit).WithMany(h => h.GroupVisibilities).HasForeignKey(v => v.HabitId);
            e.HasOne(v => v.Group).WithMany().HasForeignKey(v => v.GroupId);
        });

        // ChatMessage
        modelBuilder.Entity<ChatMessage>(e =>
        {
            e.HasKey(m => m.Id);
            e.HasIndex(m => new { m.GroupId, m.CreatedAt });
            e.HasOne(m => m.Group).WithMany(g => g.Messages).HasForeignKey(m => m.GroupId);
            e.HasOne(m => m.Sender).WithMany().HasForeignKey(m => m.SenderId);
            e.HasOne(m => m.ReferencedHabit).WithMany().HasForeignKey(m => m.ReferencedHabitId);
        });

        // HabitSuggestion
        modelBuilder.Entity<HabitSuggestion>(e =>
        {
            e.HasKey(s => s.Id);
            e.HasIndex(s => s.ChatMessageId);
            e.HasOne(s => s.ChatMessage).WithOne(m => m.Suggestion).HasForeignKey<HabitSuggestion>(s => s.ChatMessageId);
            e.HasOne(s => s.TargetUser).WithMany().HasForeignKey(s => s.TargetUserId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne(s => s.TargetHabit).WithMany().HasForeignKey(s => s.TargetHabitId).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
