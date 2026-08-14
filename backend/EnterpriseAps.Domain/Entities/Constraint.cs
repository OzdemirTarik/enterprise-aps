using EnterpriseAps.Domain.Enums;

namespace EnterpriseAps.Domain.Entities;

public class Constraint
{
    public string Id { get; set; } = string.Empty;
    public ConstraintType Type { get; set; } = ConstraintType.Precedence;
    public string TargetOperationId { get; set; } = string.Empty;
    public string? ResourceId { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime? TimeWindowStart { get; set; }
    public DateTime? TimeWindowEnd { get; set; }
}
