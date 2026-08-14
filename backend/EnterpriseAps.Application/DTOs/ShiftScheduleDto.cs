namespace EnterpriseAps.Application.DTOs;

public class ShiftScheduleDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string StartTime { get; set; } = "08:00";
    public string EndTime { get; set; } = "16:00";
    public List<int> DaysOfWeek { get; set; } = new();
    public string ColorCode { get; set; } = "#06b6d4";
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; } = 1;
}

public class UpdateShiftPatternRequest
{
    public List<ShiftScheduleDto> Shifts { get; set; } = new();
}
