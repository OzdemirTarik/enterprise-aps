using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Entities;
using EnterpriseAps.Domain.Enums;
using EnterpriseAps.Domain.Graph;
using MediatR;

namespace EnterpriseAps.Application.CQRS.Commands;

public class CreateOperationInputDto
{
    public string Name { get; set; } = string.Empty;
    public string ProductType { get; set; } = string.Empty;
    public string RequiredResourceId { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public int SetupDurationMinutes { get; set; }
    public string ColorCode { get; set; } = "#38bdf8";
}

public record CreateWorkOrderCommand(
    string OrderNumber,
    string? CustomerName,
    string ProductCode,
    string ProductName,
    int Quantity,
    DateTime ReleaseDate,
    DateTime DueDate,
    int Priority,
    List<CreateOperationInputDto>? Operations = null
) : IRequest<WorkOrderDto>;

public class CreateWorkOrderCommandHandler : IRequestHandler<CreateWorkOrderCommand, WorkOrderDto>
{
    private readonly IScheduleGraph _graph;
    private readonly ISchedulingHubClient _hub;
    private readonly IApplicationDbContext _context;

    public CreateWorkOrderCommandHandler(
        IScheduleGraph graph, 
        ISchedulingHubClient hub, 
        IApplicationDbContext context)
    {
        _graph = graph;
        _hub = hub;
        _context = context;
    }

    public async Task<WorkOrderDto> Handle(CreateWorkOrderCommand request, CancellationToken cancellationToken)
    {
        var woId = $"WO-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";
        var workOrder = new WorkOrder
        {
            Id = woId,
            OrderNumber = request.OrderNumber,
            CustomerName = request.CustomerName,
            ProductCode = request.ProductCode,
            ProductName = request.ProductName,
            Quantity = request.Quantity,
            ReleaseDate = DateTime.SpecifyKind(request.ReleaseDate, DateTimeKind.Utc),
            DueDate = DateTime.SpecifyKind(request.DueDate, DateTimeKind.Utc),
            Priority = request.Priority,
            Status = "Planned"
        };

        var createdOps = new List<Operation>();
        DateTime currentChainTime = DateTime.SpecifyKind(request.ReleaseDate, DateTimeKind.Utc);
        string? lastOpId = null;

        if (request.Operations != null && request.Operations.Count > 0)
        {
            for (int i = 0; i < request.Operations.Count; i++)
            {
                var opInput = request.Operations[i];
                var opId = $"OP-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";
                var setup = opInput.SetupDurationMinutes > 0
                    ? opInput.SetupDurationMinutes
                    : _graph.GetSetupMinutes(opInput.RequiredResourceId, "", opInput.ProductType);

                var op = new Operation
                {
                    Id = opId,
                    WorkOrderId = woId,
                    SequenceIndex = i + 1,
                    Name = opInput.Name,
                    ProductType = opInput.ProductType,
                    RequiredResourceId = opInput.RequiredResourceId,
                    DurationMinutes = opInput.DurationMinutes,
                    SetupDurationMinutes = setup,
                    PlannedStartTime = DateTime.SpecifyKind(_graph.GetNextWorkingTime(currentChainTime), DateTimeKind.Utc),
                    PlannedEndTime = DateTime.SpecifyKind(_graph.CalculateWorkingEndTime(_graph.GetNextWorkingTime(currentChainTime), setup + opInput.DurationMinutes), DateTimeKind.Utc),
                    Status = OperationStatus.Planned,
                    ColorCode = opInput.ColorCode,
                    PrecedenceOperationIds = lastOpId != null ? new List<string> { lastOpId } : new List<string>()
                };

                createdOps.Add(op);
                currentChainTime = _graph.GetNextWorkingTime(op.PlannedEndTime);
                lastOpId = opId;
            }
        }

        // Add to in-memory graph
        _graph.AddOrUpdateWorkOrder(workOrder);
        foreach (var op in createdOps)
        {
            _graph.AddOrUpdateOperation(op, true);
        }

        // Add to PostgreSQL
        await _context.WorkOrders.AddAsync(workOrder, cancellationToken);
        if (createdOps.Count > 0)
        {
            await _context.Operations.AddRangeAsync(createdOps, cancellationToken);
        }
        await _context.SaveChangesAsync(cancellationToken);

        var woDto = new WorkOrderDto
        {
            Id = workOrder.Id,
            OrderNumber = workOrder.OrderNumber,
            CustomerName = workOrder.CustomerName,
            ProductCode = workOrder.ProductCode,
            ProductName = workOrder.ProductName,
            Quantity = workOrder.Quantity,
            ReleaseDate = workOrder.ReleaseDate,
            DueDate = workOrder.DueDate,
            Priority = workOrder.Priority,
            Status = workOrder.Status,
            OperationIds = createdOps.Select(o => o.Id).ToList()
        };

        await _hub.OnWorkOrderUpdated(woDto);

        // Broadcast schedule delta for the newly created operations
        if (createdOps.Count > 0)
        {
            var deltaDto = new ScheduleDeltaDto
            {
                TriggeredByOperationId = createdOps.First().Id,
                Success = true,
                AffectedOperations = _graph.GetAllOperations().Where(o => o.WorkOrderId == woId).Select(o => new OperationDto
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

        return woDto;
    }
}
