namespace EnterpriseAps.Domain.Entities;

public class LockInfo
{
    public string ResourceId { get; set; } = string.Empty;
    public string LockedByUserId { get; set; } = string.Empty;
    public string LockedByUserName { get; set; } = string.Empty;
    public string UserColor { get; set; } = "#3b82f6";
    public DateTime AcquiredAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(2);
    public bool IsExpired => DateTime.UtcNow > ExpiresAt;
}
