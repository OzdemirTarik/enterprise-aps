namespace EnterpriseAps.Application.DTOs;

public class SetupMatrixDto
{
    public string? ResourceId { get; set; }
    public string FromProductType { get; set; } = string.Empty;
    public string ToProductType { get; set; } = string.Empty;
    public int SetupMinutes { get; set; }
}
