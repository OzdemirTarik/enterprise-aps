using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Graph;
using MediatR;

namespace EnterpriseAps.Application.CQRS.Commands;

public record OptimizeScheduleCommand(string Strategy = "HEURISTIC_SPT_EDD") : IRequest<ScheduleDeltaDto>;

public class OptimizeScheduleCommandHandler : IRequestHandler<OptimizeScheduleCommand, ScheduleDeltaDto>
{
    private readonly IScheduleGraph _graph;
    private readonly ISchedulingHubClient _hub;

    public OptimizeScheduleCommandHandler(IScheduleGraph graph, ISchedulingHubClient hub)
    {
        _graph = graph;
        _hub = hub;
    }

    public async Task<ScheduleDeltaDto> Handle(OptimizeScheduleCommand request, CancellationToken cancellationToken)
    {
        var delta = _graph.OptimizeSchedule(request.Strategy);

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
                PrecedenceOperationIds = op.PrecedenceOperationIds
            }).ToList()
        };

        if (delta.Success)
        {
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
        }

        return deltaDto;
    }
}
