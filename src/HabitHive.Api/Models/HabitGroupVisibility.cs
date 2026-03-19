namespace HabitHive.Api.Models;

public class HabitGroupVisibility
{
    public Guid HabitId { get; set; }
    public Guid GroupId { get; set; }

    public Habit Habit { get; set; } = null!;
    public Group Group { get; set; } = null!;
}
