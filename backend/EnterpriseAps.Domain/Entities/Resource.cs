using EnterpriseAps.Domain.Enums;

namespace EnterpriseAps.Domain.Entities;

public class Resource
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public ResourceType Type { get; set; } = ResourceType.CncMachine;
    public double Capacity { get; set; } = 1.0;
    public double WorkingHoursPerDay { get; set; } = 16.0;
    public decimal HourlyRate { get; set; } = 150.00m;
    public string ColorHex { get; set; } = "#3b82f6";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public List<SetupMatrixItem> SetupMatrices { get; set; } = new();
    public List<ResourceDowntime> Downtimes { get; set; } = new();
}
