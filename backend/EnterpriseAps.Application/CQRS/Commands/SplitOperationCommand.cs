using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Entities;
using EnterpriseAps.Domain.Graph;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseAps.Application.CQRS.Commands;

public record SplitOperationCommand(
    string OperationId,
    int SplitDurationMinutes
) : IRequest<ScheduleDeltaDto>;

public class SplitOperationCommandHandler : IRequestHandler<SplitOperationCommand, ScheduleDeltaDto>
{
    private readonly IScheduleGraph _graph;
    private readonly ISchedulingHubClient _hub;
    private readonly IApplicationDbContext _context;

    public SplitOperationCommandHandler(
        IScheduleGraph graph, 
        ISchedulingHubClient hub, 
        IApplicationDbContext context)
    {
        _graph = graph;
        _hub = hub;
        _context = context;
    }

    public async Task<ScheduleDeltaDto> Handle(SplitOperationCommand request, CancellationToken cancellationToken)
    {
        var delta = _graph.SplitOperation(request.OperationId, request.SplitDurationMinutes, out var newOp);
        if (!delta.Success)
        {
            return new ScheduleDeltaDto
            {
                TriggeredByOperationId = request.OperationId,
                Success = false,
                ErrorMessage = delta.ErrorMessage
            };
        }

        // Add new split operation into DB
        newOp.PlannedStartTime = DateTime.SpecifyKind(newOp.PlannedStartTime, DateTimeKind.Utc);
        newOp.PlannedEndTime = DateTime.SpecifyKind(newOp.PlannedEndTime, DateTimeKind.Utc);
        if (newOp.ActualStartTime.HasValue) newOp.ActualStartTime = DateTime.SpecifyKind(newOp.ActualStartTime.Value, DateTimeKind.Utc);
        if (newOp.ActualEndTime.HasValue) newOp.ActualEndTime = DateTime.SpecifyKind(newOp.ActualEndTime.Value, DateTimeKind.Utc);
        
        await _context.Operations.AddAsync(newOp, cancellationToken);

        // Update original and affected operations in DB
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
            dbOp.PrecedenceOperationIds = graphOp.PrecedenceOperationIds;
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
