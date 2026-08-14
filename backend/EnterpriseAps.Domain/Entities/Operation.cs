using EnterpriseAps.Domain.Enums;

namespace EnterpriseAps.Domain.Entities;

public class Operation
{
    public string Id { get; set; } = string.Empty;
    public string WorkOrderId { get; set; } = string.Empty;
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
    public OperationStatus Status { get; set; } = OperationStatus.Planned;
    public string ColorCode { get; set; } = "#38bdf8";
    public bool IsLocked { get; set; } = false;
    public List<string> PrecedenceOperationIds { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Helper clone for fast in-memory undo/delta evaluation
    public Operation Clone()
    {
        return new Operation
        {
            Id = Id,
            WorkOrderId = WorkOrderId,
            SequenceIndex = SequenceIndex,
            Name = Name,
            ProductType = ProductType,
            RequiredResourceId = RequiredResourceId,
            DurationMinutes = DurationMinutes,
            SetupDurationMinutes = SetupDurationMinutes,
            PlannedStartTime = PlannedStartTime,
            PlannedEndTime = PlannedEndTime,
            ActualStartTime = ActualStartTime,
            ActualEndTime = ActualEndTime,
            Status = Status,
            ColorCode = ColorCode,
            IsLocked = IsLocked,
            PrecedenceOperationIds = new List<string>(PrecedenceOperationIds),
            CreatedAt = CreatedAt
        };
    }
}
