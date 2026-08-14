namespace EnterpriseAps.Domain.Entities;

public class ShiftSchedule
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string StartTime { get; set; } = "08:00"; // HH:mm
    public string EndTime { get; set; } = "16:00";   // HH:mm
    public List<int> DaysOfWeek { get; set; } = new() { 1, 2, 3, 4, 5, 6, 7 }; // 1=Monday, 7=Sunday
    public string ColorCode { get; set; } = "#06b6d4";
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public static List<ShiftSchedule> GetDefaultThreeShifts() => new()
    {
        new()
        {
            Id = "SHIFT-01",
            Name = "1. Vardiya (Gündüz / 08:00 - 16:00)",
            StartTime = "08:00",
            EndTime = "16:00",
            DaysOfWeek = new() { 1, 2, 3, 4, 5, 6, 7 },
            ColorCode = "#06b6d4",
            IsActive = true,
            DisplayOrder = 1
        },
        new()
        {
            Id = "SHIFT-02",
            Name = "2. Vardiya (Akşam / 16:00 - 00:00)",
            StartTime = "16:00",
            EndTime = "00:00",
            DaysOfWeek = new() { 1, 2, 3, 4, 5, 6, 7 },
            ColorCode = "#f59e0b",
            IsActive = true,
            DisplayOrder = 2
        },
        new()
        {
            Id = "SHIFT-03",
            Name = "3. Vardiya (Gece / 00:00 - 08:00)",
            StartTime = "00:00",
            EndTime = "08:00",
            DaysOfWeek = new() { 1, 2, 3, 4, 5, 6, 7 },
            ColorCode = "#8b5cf6",
            IsActive = true,
            DisplayOrder = 3
        }
    };
}
