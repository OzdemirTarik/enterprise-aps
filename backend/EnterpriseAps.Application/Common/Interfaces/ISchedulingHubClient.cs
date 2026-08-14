using EnterpriseAps.Application.DTOs;

namespace EnterpriseAps.Application.Common.Interfaces;

public interface ISchedulingHubClient
{
    Task OnScheduleUpdated(ScheduleDeltaDto delta);
    Task OnResourceUpdated(ResourceDto resource);
    Task OnResourceDeleted(string resourceId);
    Task OnWorkOrderUpdated(WorkOrderDto workOrder);
    Task OnWorkOrderDeleted(string workOrderId);
    Task OnOperationDeleted(string operationId);
    Task OnDowntimeUpdated(ResourceDowntimeDto downtime);
    Task OnDowntimeDeleted(string downtimeId);
    Task OnResourceLocked(LockInfoDto lockInfo);
    Task OnResourceUnlocked(string resourceId);
    Task OnUserPresence(UserPresenceDto userPresence);
    Task OnKpiUpdated(ScheduleKpiDto kpis);
}
