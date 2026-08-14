namespace EnterpriseAps.Domain.Entities;

public class WorkOrder
{
    public string Id { get; set; } = string.Empty;
    public string OrderNumber { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public DateTime ReleaseDate { get; set; }
    public DateTime DueDate { get; set; }
    public int Priority { get; set; } = 2; // 1 = Critical, 2 = High, 3 = Normal, 4 = Low
    public string Status { get; set; } = "Planned";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public List<Operation> Operations { get; set; } = new();
}
