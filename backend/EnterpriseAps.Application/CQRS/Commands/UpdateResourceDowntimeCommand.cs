using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Entities;
using EnterpriseAps.Domain.Graph;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseAps.Application.CQRS.Commands;

public record UpdateResourceDowntimeCommand(
    string Id,
    string ResourceId,
    string Reason,
    DateTime StartTime,
    DateTime EndTime,
    bool IsPlanned = true
) : IRequest<ResourceDowntimeDto?>;

public class UpdateResourceDowntimeCommandHandler : IRequestHandler<UpdateResourceDowntimeCommand, ResourceDowntimeDto?>
{
    private readonly IScheduleGraph _graph;
    private readonly ISchedulingHubClient _hub;
    private readonly IApplicationDbContext _context;

    public UpdateResourceDowntimeCommandHandler(
        IScheduleGraph graph,
        ISchedulingHubClient hub,
        IApplicationDbContext context)
    {
        _graph = graph;
        _hub = hub;
        _context = context;
    }

    public async Task<ResourceDowntimeDto?> Handle(UpdateResourceDowntimeCommand request, CancellationToken cancellationToken)
    {
        var existing = await _context.ResourceDowntimes.FirstOrDefaultAsync(d => d.Id == request.Id, cancellationToken);
        if (existing == null)
        {
            existing = new ResourceDowntime
            {
                Id = request.Id,
                ResourceId = request.ResourceId,
                Reason = request.Reason,
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                IsPlanned = request.IsPlanned
            };
            await _context.ResourceDowntimes.AddAsync(existing, cancellationToken);
        }
        else
        {
            existing.ResourceId = request.ResourceId;
            existing.Reason = request.Reason;
            existing.StartTime = request.StartTime;
            existing.EndTime = request.EndTime;
            existing.IsPlanned = request.IsPlanned;
        }

        var downtime = new ResourceDowntime
        {
            Id = request.Id,
            ResourceId = request.ResourceId,
            Reason = request.Reason,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            IsPlanned = request.IsPlanned
        };

        var delta = _graph.AddOrUpdateDowntime(downtime, true);
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
