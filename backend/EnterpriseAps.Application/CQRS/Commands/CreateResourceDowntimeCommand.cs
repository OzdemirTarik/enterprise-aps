using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Entities;
using EnterpriseAps.Domain.Graph;
using MediatR;

namespace EnterpriseAps.Application.CQRS.Commands;

public record CreateResourceDowntimeCommand(
    string ResourceId,
    string Reason,
    DateTime StartTime,
    DateTime EndTime,
    bool IsPlanned = true
) : IRequest<ResourceDowntimeDto>;

public class CreateResourceDowntimeCommandHandler : IRequestHandler<CreateResourceDowntimeCommand, ResourceDowntimeDto>
{
    private readonly IScheduleGraph _graph;
    private readonly ISchedulingHubClient _hub;
    private readonly IApplicationDbContext _context;

    public CreateResourceDowntimeCommandHandler(
        IScheduleGraph graph, 
        ISchedulingHubClient hub, 
        IApplicationDbContext context)
    {
        _graph = graph;
        _hub = hub;
        _context = context;
    }

    public async Task<ResourceDowntimeDto> Handle(CreateResourceDowntimeCommand request, CancellationToken cancellationToken)
    {
        var downtime = new ResourceDowntime
        {
            Id = $"DT-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}",
            ResourceId = request.ResourceId,
            Reason = request.Reason,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            IsPlanned = request.IsPlanned
        };

        // Graph updates & pushes any overlapping operations past downtime
        var delta = _graph.AddOrUpdateDowntime(downtime, true);

        await _context.ResourceDowntimes.AddAsync(downtime, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        var dto = new ResourceDowntimeDto
        {
            Id = downtime.Id,
            ResourceId = downtime.ResourceId,
            Reason = downtime.Reason,
            StartTime = downtime.StartTime,
            EndTime = downtime.EndTime,
            IsPlanned = downtime.IsPlanned
        };

        await _hub.OnDowntimeUpdated(dto);

        if (delta.AffectedOperations.Count > 0)
        {
            var deltaDto = new ScheduleDeltaDto
            {
                TriggeredByOperationId = $"DOWNTIME_{downtime.Id}",
                Success = true,
                AffectedOperations = delta.AffectedOperations.Select(o => new OperationDto
                {
                    Id = o.Id,
                    WorkOrderId = o.WorkOrderId,
                    SequenceIndex = o.SequenceIndex,
                    Name = o.Name,
                    ProductType = o.ProductType,
                    RequiredResourceId = o.RequiredResourceId,
                    DurationMinutes = o.DurationMinutes,
                    SetupDurationMinutes = o.SetupDurationMinutes,
                    PlannedStartTime = o.PlannedStartTime,
                    PlannedEndTime = o.PlannedEndTime,
                    Status = o.Status.ToString(),
                    ColorCode = o.ColorCode,
                    IsLocked = o.IsLocked,
                    PrecedenceOperationIds = o.PrecedenceOperationIds
                }).ToList()
            };

            await _hub.OnScheduleUpdated(deltaDto);
        }

        return dto;
    }
}
