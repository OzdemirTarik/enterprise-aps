using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Domain.Graph;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseAps.Application.CQRS.Commands;

public record DeleteSetupMatrixCommand(int Id) : IRequest<bool>;

public class DeleteSetupMatrixCommandHandler : IRequestHandler<DeleteSetupMatrixCommand, bool>
{
    private readonly IScheduleGraph _graph;
    private readonly IApplicationDbContext _context;

    public DeleteSetupMatrixCommandHandler(IScheduleGraph graph, IApplicationDbContext context)
    {
        _graph = graph;
        _context = context;
    }

    public async Task<bool> Handle(DeleteSetupMatrixCommand request, CancellationToken cancellationToken)
    {
        var item = await _context.SetupMatrices.FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);
        if (item != null)
        {
            _context.SetupMatrices.Remove(item);
            await _context.SaveChangesAsync(cancellationToken);

            var all = await _context.SetupMatrices.ToListAsync(cancellationToken);
            var resources = _graph.GetAllResources();
            var workOrders = _graph.GetAllWorkOrders();
            var operations = _graph.GetAllOperations();
            var downtimes = _graph.GetAllDowntimes();
            _graph.Initialize(resources, workOrders, operations, all, downtimes);
        }

        return true;
    }
}
