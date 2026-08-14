namespace EnterpriseAps.Application.DTOs;

public class ScheduleDeltaDto
{
    public string TriggeredByOperationId { get; set; } = string.Empty;
    public List<OperationDto> AffectedOperations { get; set; } = new();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public bool Success { get; set; } = true;
    public string? ErrorMessage { get; set; }
}
