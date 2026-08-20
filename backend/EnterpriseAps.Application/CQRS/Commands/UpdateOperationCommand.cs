using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Enums;
using EnterpriseAps.Domain.Graph;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseAps.Application.CQRS.Commands;

public record UpdateOperationCommand(
    string Id,
    string Name,
    string RequiredResourceId,
    int DurationMinutes,
    int SetupDurationMinutes,
    DateTime PlannedStartTime,
    string Status,
    string ColorCode,
    bool IsLocked,
    List<string>? PrecedenceOperationIds
) : IRequest<OperationDto?>;

public class UpdateOperationCommandHandler : IRequestHandler<UpdateOperationCommand, OperationDto?>
{
    private readonly IScheduleGraph _graph;
    private readonly ISchedulingHubClient _hub;
    private readonly IApplicationDbContext _context;

    public UpdateOperationCommandHandler(
        IScheduleGraph graph, 
        ISchedulingHubClient hub, 
        IApplicationDbContext context)
    {
        _graph = graph;
        _hub = hub;
        _context = context;
    }

    public async Task<OperationDto?> Handle(UpdateOperationCommand request, CancellationToken cancellationToken)
    {
        var op = _graph.GetOperation(request.Id);
        if (op == null) return null;

        op.Name = request.Name;
        op.RequiredResourceId = request.RequiredResourceId;
        op.DurationMinutes = request.DurationMinutes;
        op.SetupDurationMinutes = request.SetupDurationMinutes;
        var reqPlannedStartUtc = request.PlannedStartTime.Kind == DateTimeKind.Utc 
            ? request.PlannedStartTime 
            : DateTime.SpecifyKind(request.PlannedStartTime, DateTimeKind.Utc);
        op.PlannedStartTime = DateTime.SpecifyKind(_graph.GetNextWorkingTime(reqPlannedStartUtc), DateTimeKind.Utc);
        op.PlannedEndTime = DateTime.SpecifyKind(_graph.CalculateWorkingEndTime(op.PlannedStartTime, request.SetupDurationMinutes + request.DurationMinutes), DateTimeKind.Utc);
        if (Enum.TryParse<OperationStatus>(request.Status, true, out var parsedStatus))
        {
            op.Status = parsedStatus;
            
            if (parsedStatus == OperationStatus.InProgress)
            {
                op.ActualStartTime = DateTime.UtcNow;
            }
            else if (parsedStatus == OperationStatus.Completed)
            {
                if (!op.ActualStartTime.HasValue) op.ActualStartTime = DateTime.UtcNow;
                op.ActualEndTime = DateTime.UtcNow;
            }
        }
        op.ColorCode = request.ColorCode;
        op.IsLocked = request.IsLocked;
        if (request.PrecedenceOperationIds != null)
        {
            op.PrecedenceOperationIds = request.PrecedenceOperationIds;
        }

        // Update in-memory graph
        var delta = _graph.AddOrUpdateOperation(op, true);

        // Update DB
        var dbOp = await _context.Operations.FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken);
        if (dbOp != null)
        {
            dbOp.Name = op.Name;
            dbOp.RequiredResourceId = op.RequiredResourceId;
            dbOp.DurationMinutes = op.DurationMinutes;
            dbOp.SetupDurationMinutes = op.SetupDurationMinutes;
            dbOp.PlannedStartTime = op.PlannedStartTime.Kind == DateTimeKind.Utc 
                ? op.PlannedStartTime 
                : DateTime.SpecifyKind(op.PlannedStartTime, DateTimeKind.Utc);
            dbOp.PlannedEndTime = op.PlannedEndTime.Kind == DateTimeKind.Utc 
                ? op.PlannedEndTime 
                : DateTime.SpecifyKind(op.PlannedEndTime, DateTimeKind.Utc);
            dbOp.ActualStartTime = op.ActualStartTime.HasValue 
                ? (op.ActualStartTime.Value.Kind == DateTimeKind.Utc ? op.ActualStartTime.Value : DateTime.SpecifyKind(op.ActualStartTime.Value, DateTimeKind.Utc)) 
                : null;
            dbOp.ActualEndTime = op.ActualEndTime.HasValue 
                ? (op.ActualEndTime.Value.Kind == DateTimeKind.Utc ? op.ActualEndTime.Value : DateTime.SpecifyKind(op.ActualEndTime.Value, DateTimeKind.Utc)) 
                : null;
            dbOp.Status = op.Status;
            dbOp.ColorCode = op.ColorCode;
            dbOp.IsLocked = op.IsLocked;
            dbOp.PrecedenceOperationIds = op.PrecedenceOperationIds;

            await _context.SaveChangesAsync(cancellationToken);
        }

        var deltaDto = new ScheduleDeltaDto
        {
            TriggeredByOperationId = op.Id,
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
                ActualStartTime = o.ActualStartTime,
                ActualEndTime = o.ActualEndTime,
                Status = o.Status.ToString(),
                ColorCode = o.ColorCode,
                IsLocked = o.IsLocked,
                PrecedenceOperationIds = o.PrecedenceOperationIds
            }).ToList()
        };

        await _hub.OnScheduleUpdated(deltaDto);

        var wo = _graph.GetWorkOrder(op.WorkOrderId);

        return new OperationDto
        {
            Id = op.Id,
            WorkOrderId = op.WorkOrderId,
            WorkOrderNumber = wo?.OrderNumber ?? "",
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
        };
    }
}
