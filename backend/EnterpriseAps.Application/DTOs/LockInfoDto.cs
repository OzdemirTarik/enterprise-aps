namespace EnterpriseAps.Application.DTOs;

public class LockInfoDto
{
    public string ResourceId { get; set; } = string.Empty;
    public string LockedByUserId { get; set; } = string.Empty;
    public string LockedByUserName { get; set; } = string.Empty;
    public string UserColor { get; set; } = "#3b82f6";
    public DateTime AcquiredAt { get; set; }
    public DateTime ExpiresAt { get; set; }
}
