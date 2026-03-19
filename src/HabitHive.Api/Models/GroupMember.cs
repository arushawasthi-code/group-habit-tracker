namespace HabitHive.Api.Models;

public class GroupMember
{
    public Guid GroupId { get; set; }
    public Guid UserId { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LeftAt { get; set; }

    public Group Group { get; set; } = null!;
    public User User { get; set; } = null!;
}
