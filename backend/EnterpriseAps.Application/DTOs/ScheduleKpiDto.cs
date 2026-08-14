namespace EnterpriseAps.Application.DTOs;

public class ScheduleKpiDto
{
    public double TotalMakespanHours { get; set; }
    public double OverallOeePercentage { get; set; }
    public double TotalSetupTimeHours { get; set; }
    public double SetupRatioPercentage { get; set; }
    public int DelayedWorkOrdersCount { get; set; }
    public double OnTimeDeliveryRatePercentage { get; set; }
    public int TotalOperationsCount { get; set; }
    public int TotalWorkOrdersCount { get; set; }
    public Dictionary<string, double> ResourceUtilization { get; set; } = new();
    public DateTime ScheduleStart { get; set; }
    public DateTime ScheduleEnd { get; set; }
}
