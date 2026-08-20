using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Graph;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseAps.Application.CQRS.Commands;

public record UpdateWorkOrderCommand(
    string Id,
    string OrderNumber,
    string? CustomerName,
    string ProductCode,
    string ProductName,
    int Quantity,
    DateTime ReleaseDate,
    DateTime DueDate,
    int Priority,
    string Status
) : IRequest<WorkOrderDto?>;

public class UpdateWorkOrderCommandHandler : IRequestHandler<UpdateWorkOrderCommand, WorkOrderDto?>
{
    private readonly IScheduleGraph _graph;
    private readonly ISchedulingHubClient _hub;
    private readonly IApplicationDbContext _context;

    public UpdateWorkOrderCommandHandler(
        IScheduleGraph graph, 
        ISchedulingHubClient hub, 
        IApplicationDbContext context)
    {
        _graph = graph;
        _hub = hub;
        _context = context;
    }

    public async Task<WorkOrderDto?> Handle(UpdateWorkOrderCommand request, CancellationToken cancellationToken)
    {
        var wo = _graph.GetWorkOrder(request.Id);
        if (wo == null) return null;

        wo.OrderNumber = request.OrderNumber;
        wo.CustomerName = request.CustomerName;
        wo.ProductCode = request.ProductCode;
        wo.ProductName = request.ProductName;
        wo.Quantity = request.Quantity;
        wo.ReleaseDate = DateTime.SpecifyKind(request.ReleaseDate, DateTimeKind.Utc);
        wo.DueDate = DateTime.SpecifyKind(request.DueDate, DateTimeKind.Utc);
        wo.Priority = request.Priority;
        wo.Status = request.Status;

        _graph.AddOrUpdateWorkOrder(wo);

        var dbWo = await _context.WorkOrders.FirstOrDefaultAsync(w => w.Id == request.Id, cancellationToken);
        if (dbWo != null)
        {
            dbWo.OrderNumber = wo.OrderNumber;
            dbWo.CustomerName = wo.CustomerName;
            dbWo.ProductCode = wo.ProductCode;
            dbWo.ProductName = wo.ProductName;
            dbWo.Quantity = wo.Quantity;
            dbWo.ReleaseDate = wo.ReleaseDate; // already UTC
            dbWo.DueDate = wo.DueDate; // already UTC
            dbWo.Priority = wo.Priority;
            dbWo.Status = wo.Status;

            await _context.SaveChangesAsync(cancellationToken);
        }

        var dto = new WorkOrderDto
        {
            Id = wo.Id,
            OrderNumber = wo.OrderNumber,
            CustomerName = wo.CustomerName,
            ProductCode = wo.ProductCode,
            ProductName = wo.ProductName,
            Quantity = wo.Quantity,
            ReleaseDate = wo.ReleaseDate,
            DueDate = wo.DueDate,
            Priority = wo.Priority,
            Status = wo.Status,
            OperationIds = _graph.GetAllOperations().Where(o => o.WorkOrderId == wo.Id).Select(o => o.Id).ToList()
        };

        await _hub.OnWorkOrderUpdated(dto);
        return dto;
    }
}
