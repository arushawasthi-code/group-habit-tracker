namespace HabitHive.Api.Models;

public class Group
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string InviteCode { get; set; } = string.Empty;
    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User CreatedBy { get; set; } = null!;
    public ICollection<GroupMember> Members { get; set; } = new List<GroupMember>();
    public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
}
