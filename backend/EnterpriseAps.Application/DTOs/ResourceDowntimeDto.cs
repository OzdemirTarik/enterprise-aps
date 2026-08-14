namespace EnterpriseAps.Application.DTOs;

public class ResourceDowntimeDto
{
    public string Id { get; set; } = string.Empty;
    public string ResourceId { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public bool IsPlanned { get; set; } = true;
}
