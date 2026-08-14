namespace EnterpriseAps.Application.DTOs;

public class GanttScheduleDto
{
    public List<ResourceDto> Resources { get; set; } = new();
    public List<OperationDto> Operations { get; set; } = new();
    public List<WorkOrderDto> WorkOrders { get; set; } = new();
    public List<SetupMatrixDto> SetupMatrices { get; set; } = new();
    public List<ResourceDowntimeDto> Downtimes { get; set; } = new();
    public List<ShiftScheduleDto> Shifts { get; set; } = new();
    public List<LockInfoDto> Locks { get; set; } = new();
    public ScheduleKpiDto Kpis { get; set; } = new();
}
