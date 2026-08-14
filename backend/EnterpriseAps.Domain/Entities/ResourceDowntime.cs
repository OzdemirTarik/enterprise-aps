namespace EnterpriseAps.Domain.Entities;

public class ResourceDowntime
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ResourceId { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public bool IsPlanned { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
