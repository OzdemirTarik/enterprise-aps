namespace EnterpriseAps.Application.DTOs;

public class OperationDto
{
    public string Id { get; set; } = string.Empty;
    public string WorkOrderId { get; set; } = string.Empty;
    public string WorkOrderNumber { get; set; } = string.Empty;
    public int SequenceIndex { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ProductType { get; set; } = string.Empty;
    public string RequiredResourceId { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public int SetupDurationMinutes { get; set; }
    public DateTime PlannedStartTime { get; set; }
    public DateTime PlannedEndTime { get; set; }
    public DateTime? ActualStartTime { get; set; }
    public DateTime? ActualEndTime { get; set; }
    public string Status { get; set; } = "Planned";
    public string ColorCode { get; set; } = "#38bdf8";
    public bool IsLocked { get; set; } = false;
    public List<string> PrecedenceOperationIds { get; set; } = new();
}
