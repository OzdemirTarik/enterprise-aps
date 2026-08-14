namespace EnterpriseAps.Application.DTOs;

public class ResourceDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public double Capacity { get; set; } = 1.0;
    public double WorkingHoursPerDay { get; set; } = 16.0;
    public decimal HourlyRate { get; set; } = 150.00m;
    public string ColorHex { get; set; } = "#3b82f6";
    public bool IsActive { get; set; } = true;
}
