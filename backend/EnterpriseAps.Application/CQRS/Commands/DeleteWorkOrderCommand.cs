using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Domain.Graph;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseAps.Application.CQRS.Commands;

public record DeleteWorkOrderCommand(string Id) : IRequest<bool>;

public class DeleteWorkOrderCommandHandler : IRequestHandler<DeleteWorkOrderCommand, bool>
{
    private readonly IScheduleGraph _graph;
    private readonly ISchedulingHubClient _hub;
    private readonly IApplicationDbContext _context;

    public DeleteWorkOrderCommandHandler(
        IScheduleGraph graph, 
        ISchedulingHubClient hub, 
        IApplicationDbContext context)
    {
        _graph = graph;
        _hub = hub;
        _context = context;
    }

    public async Task<bool> Handle(DeleteWorkOrderCommand request, CancellationToken cancellationToken)
    {
        _graph.DeleteWorkOrder(request.Id);

        var dbWo = await _context.WorkOrders
            .Include(w => w.Operations)
            .FirstOrDefaultAsync(w => w.Id == request.Id, cancellationToken);

        if (dbWo != null)
        {
            _context.WorkOrders.Remove(dbWo);
            await _context.SaveChangesAsync(cancellationToken);
        }

        await _hub.OnWorkOrderDeleted(request.Id);
        return true;
    }
}
