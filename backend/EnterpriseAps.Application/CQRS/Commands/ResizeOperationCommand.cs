using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Graph;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseAps.Application.CQRS.Commands;

public record ResizeOperationCommand(
    string OperationId,
    int NewDurationMinutes,
    bool AutoCascade = true
) : IRequest<ScheduleDeltaDto>;

public class ResizeOperationCommandHandler : IRequestHandler<ResizeOperationCommand, ScheduleDeltaDto>
{
    private readonly IScheduleGraph _graph;
    private readonly ISchedulingHubClient _hub;
    private readonly IApplicationDbContext _context;

    public ResizeOperationCommandHandler(
        IScheduleGraph graph, 
        ISchedulingHubClient hub, 
        IApplicationDbContext context)
    {
        _graph = graph;
        _hub = hub;
        _context = context;
    }

    public async Task<ScheduleDeltaDto> Handle(ResizeOperationCommand request, CancellationToken cancellationToken)
    {
        var delta = _graph.ResizeOperation(request.OperationId, request.NewDurationMinutes, request.AutoCascade);
        if (!delta.Success)
        {
            return new ScheduleDeltaDto
            {
                TriggeredByOperationId = request.OperationId,
                Success = false,
                ErrorMessage = delta.ErrorMessage
            };
        }

        var affectedIds = delta.AffectedOperations.Select(o => o.Id).ToList();
        var dbOps = await _context.Operations
            .Where(o => affectedIds.Contains(o.Id))
            .ToListAsync(cancellationToken);

        foreach (var dbOp in dbOps)
        {
            var graphOp = delta.AffectedOperations.First(o => o.Id == dbOp.Id);
            dbOp.DurationMinutes = graphOp.DurationMinutes;
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

        await _hub.OnScheduleUpdated(deltaDto);
        return deltaDto;
    }
}
