using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Graph;
using MediatR;

namespace EnterpriseAps.Application.CQRS.Queries;

public record GetKpiSummaryQuery : IRequest<ScheduleKpiDto>;

public class GetKpiSummaryQueryHandler : IRequestHandler<GetKpiSummaryQuery, ScheduleKpiDto>
{
    private readonly IScheduleGraph _graph;

    public GetKpiSummaryQueryHandler(IScheduleGraph graph)
    {
        _graph = graph;
    }

    public Task<ScheduleKpiDto> Handle(GetKpiSummaryQuery request, CancellationToken cancellationToken)
    {
        var kpis = _graph.CalculateKpis();
        var dto = new ScheduleKpiDto
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
        };
        return Task.FromResult(dto);
    }
}
