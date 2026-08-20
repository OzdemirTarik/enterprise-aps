using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Entities;
using EnterpriseAps.Domain.Enums;
using EnterpriseAps.Domain.Graph;
using MediatR;

namespace EnterpriseAps.Application.CQRS.Commands;

public record CreateOperationCommand(
    string WorkOrderId,
    int SequenceIndex,
    string Name,
    string ProductType,
    string RequiredResourceId,
    int DurationMinutes,
    int SetupDurationMinutes,
    DateTime PlannedStartTime,
    string ColorCode = "#38bdf8",
    List<string>? PrecedenceOperationIds = null
) : IRequest<OperationDto>;

public class CreateOperationCommandHandler : IRequestHandler<CreateOperationCommand, OperationDto>
{
    private readonly IScheduleGraph _graph;
    private readonly ISchedulingHubClient _hub;
    private readonly IApplicationDbContext _context;

    public CreateOperationCommandHandler(
        IScheduleGraph graph, 
        ISchedulingHubClient hub, 
        IApplicationDbContext context)
    {
        _graph = graph;
        _hub = hub;
        _context = context;
    }

    public async Task<OperationDto> Handle(CreateOperationCommand request, CancellationToken cancellationToken)
    {
        var op = new Operation
        {
            Id = $"OP-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}",
            WorkOrderId = request.WorkOrderId,
            SequenceIndex = request.SequenceIndex,
            Name = request.Name,
            ProductType = request.ProductType,
            RequiredResourceId = request.RequiredResourceId,
            DurationMinutes = request.DurationMinutes,
            SetupDurationMinutes = request.SetupDurationMinutes,
            PlannedStartTime = DateTime.SpecifyKind(_graph.GetNextWorkingTime(DateTime.SpecifyKind(request.PlannedStartTime, DateTimeKind.Utc)), DateTimeKind.Utc),
            PlannedEndTime = DateTime.SpecifyKind(_graph.CalculateWorkingEndTime(_graph.GetNextWorkingTime(DateTime.SpecifyKind(request.PlannedStartTime, DateTimeKind.Utc)), request.SetupDurationMinutes + request.DurationMinutes), DateTimeKind.Utc),
            Status = OperationStatus.Planned,
            ColorCode = request.ColorCode,
            PrecedenceOperationIds = request.PrecedenceOperationIds ?? new List<string>()
        };

        // Add to graph & cascade
        var delta = _graph.AddOrUpdateOperation(op, true);

        // Add to DB
        await _context.Operations.AddAsync(op, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

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
