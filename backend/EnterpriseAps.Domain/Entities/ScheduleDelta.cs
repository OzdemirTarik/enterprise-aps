namespace EnterpriseAps.Domain.Entities;

public class ScheduleDelta
{
    public string TriggeredByOperationId { get; set; } = string.Empty;
    public List<Operation> AffectedOperations { get; set; } = new();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public bool Success { get; set; } = true;
    public string? ErrorMessage { get; set; }
}
