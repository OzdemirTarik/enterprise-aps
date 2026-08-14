namespace EnterpriseAps.Domain.Entities;

public class SetupMatrixItem
{
    public int Id { get; set; }
    public string? ResourceId { get; set; }
    public string FromProductType { get; set; } = string.Empty;
    public string ToProductType { get; set; } = string.Empty;
    public int SetupMinutes { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
