namespace EnterpriseAps.Application.DTOs;

public class UserPresenceDto
{
    public string ConnectionId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string UserColor { get; set; } = "#3b82f6";
    public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
    public string? ActiveResourceId { get; set; }
}
