using EnterpriseAps.Api.Hubs;
using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using Microsoft.AspNetCore.SignalR;

namespace EnterpriseAps.Api.Services;

public class SchedulingHubClientProxy : ISchedulingHubClient
{
    private readonly IHubContext<SchedulingHub, ISchedulingHubClient> _hubContext;

    public SchedulingHubClientProxy(IHubContext<SchedulingHub, ISchedulingHubClient> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task OnScheduleUpdated(ScheduleDeltaDto delta)
    {
        await _hubContext.Clients.All.OnScheduleUpdated(delta);
    }

    public async Task OnResourceUpdated(ResourceDto resource)
    {
        await _hubContext.Clients.All.OnResourceUpdated(resource);
    }

    public async Task OnResourceDeleted(string resourceId)
    {
        await _hubContext.Clients.All.OnResourceDeleted(resourceId);
    }

    public async Task OnWorkOrderUpdated(WorkOrderDto workOrder)
    {
        await _hubContext.Clients.All.OnWorkOrderUpdated(workOrder);
    }

    public async Task OnWorkOrderDeleted(string workOrderId)
    {
        await _hubContext.Clients.All.OnWorkOrderDeleted(workOrderId);
    }

    public async Task OnOperationDeleted(string operationId)
    {
        await _hubContext.Clients.All.OnOperationDeleted(operationId);
    }

    public async Task OnDowntimeUpdated(ResourceDowntimeDto downtime)
    {
        await _hubContext.Clients.All.OnDowntimeUpdated(downtime);
    }

    public async Task OnDowntimeDeleted(string downtimeId)
    {
        await _hubContext.Clients.All.OnDowntimeDeleted(downtimeId);
    }

    public async Task OnResourceLocked(LockInfoDto lockInfo)
    {
        await _hubContext.Clients.All.OnResourceLocked(lockInfo);
    }

    public async Task OnResourceUnlocked(string resourceId)
    {
        await _hubContext.Clients.All.OnResourceUnlocked(resourceId);
    }

    public async Task OnUserPresence(UserPresenceDto userPresence)
    {
        await _hubContext.Clients.All.OnUserPresence(userPresence);
    }

    public async Task OnKpiUpdated(ScheduleKpiDto kpis)
    {
        await _hubContext.Clients.All.OnKpiUpdated(kpis);
    }

    public async Task OnShiftsUpdated(List<ShiftScheduleDto> shifts)
    {
        await _hubContext.Clients.All.OnShiftsUpdated(shifts);
    }
}
