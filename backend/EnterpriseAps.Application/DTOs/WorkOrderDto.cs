namespace EnterpriseAps.Application.DTOs;

public class WorkOrderDto
{
    public string Id { get; set; } = string.Empty;
    public string OrderNumber { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public DateTime ReleaseDate { get; set; }
    public DateTime DueDate { get; set; }
    public int Priority { get; set; }
    public string Status { get; set; } = "Planned";
    public List<string> OperationIds { get; set; } = new();
}
