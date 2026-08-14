using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Graph;
using MediatR;

namespace EnterpriseAps.Application.CQRS.Queries;

public record GetGanttScheduleQuery : IRequest<GanttScheduleDto>;

public class GetGanttScheduleQueryHandler : IRequestHandler<GetGanttScheduleQuery, GanttScheduleDto>
{
    private readonly IScheduleGraph _graph;
    private readonly IRedisLockService _redisLockService;

    public GetGanttScheduleQueryHandler(IScheduleGraph graph, IRedisLockService redisLockService)
    {
        _graph = graph;
        _redisLockService = redisLockService;
    }

    public async Task<GanttScheduleDto> Handle(GetGanttScheduleQuery request, CancellationToken cancellationToken)
    {
        var resources = _graph.GetAllResources();
        var operations = _graph.GetAllOperations();
        var workOrders = _graph.GetAllWorkOrders();
        var setupMatrices = _graph.GetAllSetupMatrices();
        var downtimes = _graph.GetAllDowntimes();
        var activeLocks = await _redisLockService.GetAllLocksAsync();
        var kpis = _graph.CalculateKpis();

        return new GanttScheduleDto
        {
            Resources = resources.Select(r => new ResourceDto
            {
                Id = r.Id,
                Name = r.Name,
                Code = r.Code,
                Type = r.Type.ToString(),
                Capacity = r.Capacity,
                WorkingHoursPerDay = r.WorkingHoursPerDay,
                HourlyRate = r.HourlyRate,
                ColorHex = r.ColorHex,
                IsActive = r.IsActive
            }).ToList(),

            Operations = operations.Select(op => new OperationDto
            {
                Id = op.Id,
                WorkOrderId = op.WorkOrderId,
                WorkOrderNumber = workOrders.FirstOrDefault(w => w.Id == op.WorkOrderId)?.OrderNumber ?? "",
                SequenceIndex = op.SequenceIndex,
                Name = op.Name,
                ProductType = op.ProductType,
                RequiredResourceId = op.RequiredResourceId,
                DurationMinutes = op.DurationMinutes,
                SetupDurationMinutes = op.SetupDurationMinutes,
                PlannedStartTime = op.PlannedStartTime,
                PlannedEndTime = op.PlannedEndTime,
                ActualStartTime = op.ActualStartTime,
                ActualEndTime = op.ActualEndTime,
                Status = op.Status.ToString(),
                ColorCode = op.ColorCode,
                IsLocked = op.IsLocked,
                PrecedenceOperationIds = op.PrecedenceOperationIds
            }).ToList(),

            WorkOrders = workOrders.Select(wo => new WorkOrderDto
            {
                Id = wo.Id,
                OrderNumber = wo.OrderNumber,
                CustomerName = wo.CustomerName,
                ProductCode = wo.ProductCode,
                ProductName = wo.ProductName,
                Quantity = wo.Quantity,
                ReleaseDate = wo.ReleaseDate,
                DueDate = wo.DueDate,
                Priority = wo.Priority,
                Status = wo.Status,
                OperationIds = operations.Where(o => o.WorkOrderId == wo.Id).Select(o => o.Id).ToList()
            }).ToList(),

            SetupMatrices = setupMatrices.Select(s => new SetupMatrixDto
            {
                ResourceId = s.ResourceId,
                FromProductType = s.FromProductType,
                ToProductType = s.ToProductType,
                SetupMinutes = s.SetupMinutes
            }).ToList(),

            Downtimes = downtimes.Select(d => new ResourceDowntimeDto
            {
                Id = d.Id,
                ResourceId = d.ResourceId,
                Reason = d.Reason,
                StartTime = d.StartTime,
                EndTime = d.EndTime,
                IsPlanned = d.IsPlanned
            }).ToList(),

            Locks = activeLocks.Select(l => new LockInfoDto
            {
                ResourceId = l.ResourceId,
                LockedByUserId = l.LockedByUserId,
                LockedByUserName = l.LockedByUserName,
                UserColor = l.UserColor,
                AcquiredAt = l.AcquiredAt,
                ExpiresAt = l.ExpiresAt
            }).ToList(),

            Kpis = new ScheduleKpiDto
            {
                TotalMakespanHours = kpis.TotalMakespanHours,
                OverallOeePercentage = kpis.OverallOeePercentage,
                TotalSetupTimeHours = kpis.TotalSetupTimeHours,
                SetupRatioPercentage = kpis.SetupRatioPercentage,
                DelayedWorkOrdersCount = kpis.DelayedWorkOrdersCount,
                OnTimeDeliveryRatePercentage = kpis.OnTimeDeliveryRatePercentage,
                TotalOperationsCount = kpis.TotalOperationsCount,
                TotalWorkOrdersCount = kpis.TotalWorkOrdersCount,
                ResourceUtilization = kpis.ResourceUtilization,
                ScheduleStart = kpis.ScheduleStart,
                ScheduleEnd = kpis.ScheduleEnd
            }
        };
    }
}
