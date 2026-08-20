using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Graph;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseAps.Application.CQRS.Commands;

public record RescheduleOperationCommand(
    string OperationId,
    string TargetResourceId,
    DateTime TargetStartTime,
    bool AutoCascade = true,
    string? UserId = null
) : IRequest<ScheduleDeltaDto>;

public class RescheduleOperationCommandHandler : IRequestHandler<RescheduleOperationCommand, ScheduleDeltaDto>
{
    private readonly IScheduleGraph _graph;
    private readonly ISchedulingHubClient _hub;
    private readonly IApplicationDbContext _context;

    public RescheduleOperationCommandHandler(
        IScheduleGraph graph, 
        ISchedulingHubClient hub,
        IApplicationDbContext context)
    {
        _graph = graph;
        _hub = hub;
        _context = context;
    }

    public async Task<ScheduleDeltaDto> Handle(RescheduleOperationCommand request, CancellationToken cancellationToken)
    {
        // 1. Sub-millisecond in-memory graph recalculation
        var delta = _graph.RescheduleOperation(
            request.OperationId,
            request.TargetResourceId,
            DateTime.SpecifyKind(request.TargetStartTime, DateTimeKind.Utc),
            request.AutoCascade);

        if (!delta.Success)
        {
            return new ScheduleDeltaDto
            {
                TriggeredByOperationId = request.OperationId,
                Success = false,
                ErrorMessage = delta.ErrorMessage
            };
        }

        // 2. Persist affected operations to PostgreSQL
        var affectedIds = delta.AffectedOperations.Select(o => o.Id).ToList();
        var dbOps = await _context.Operations
            .Where(o => affectedIds.Contains(o.Id))
            .ToListAsync(cancellationToken);

        foreach (var dbOp in dbOps)
        {
            var graphOp = delta.AffectedOperations.First(o => o.Id == dbOp.Id);
            dbOp.RequiredResourceId = graphOp.RequiredResourceId;
            dbOp.PlannedStartTime = DateTime.SpecifyKind(graphOp.PlannedStartTime, DateTimeKind.Utc);
            dbOp.PlannedEndTime = DateTime.SpecifyKind(graphOp.PlannedEndTime, DateTimeKind.Utc);
            dbOp.ActualStartTime = graphOp.ActualStartTime.HasValue ? DateTime.SpecifyKind(graphOp.ActualStartTime.Value, DateTimeKind.Utc) : null;
            dbOp.ActualEndTime = graphOp.ActualEndTime.HasValue ? DateTime.SpecifyKind(graphOp.ActualEndTime.Value, DateTimeKind.Utc) : null;
            dbOp.SetupDurationMinutes = graphOp.SetupDurationMinutes;
            dbOp.Status = graphOp.Status;
        }

        await _context.SaveChangesAsync(cancellationToken);

        var deltaDto = new ScheduleDeltaDto
        {
            TriggeredByOperationId = delta.TriggeredByOperationId,
            Success = delta.Success,
            ErrorMessage = delta.ErrorMessage,
            Timestamp = delta.Timestamp,
            AffectedOperations = delta.AffectedOperations.Select(op => new OperationDto
            {
                Id = op.Id,
                WorkOrderId = op.WorkOrderId,
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
            }).ToList()
        };

        // 3. Broadcast delta and updated KPIs to SignalR clients
        await _hub.OnScheduleUpdated(deltaDto);

        var kpis = _graph.CalculateKpis();
        await _hub.OnKpiUpdated(new ScheduleKpiDto
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
        });

        return deltaDto;
    }
}
