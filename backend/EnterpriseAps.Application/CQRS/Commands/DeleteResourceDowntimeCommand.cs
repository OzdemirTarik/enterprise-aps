using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Domain.Graph;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseAps.Application.CQRS.Commands;

public record DeleteResourceDowntimeCommand(string Id) : IRequest<bool>;

public class DeleteResourceDowntimeCommandHandler : IRequestHandler<DeleteResourceDowntimeCommand, bool>
{
    private readonly IScheduleGraph _graph;
    private readonly ISchedulingHubClient _hub;
    private readonly IApplicationDbContext _context;

    public DeleteResourceDowntimeCommandHandler(
        IScheduleGraph graph, 
        ISchedulingHubClient hub, 
        IApplicationDbContext context)
    {
        _graph = graph;
        _hub = hub;
        _context = context;
    }

    public async Task<bool> Handle(DeleteResourceDowntimeCommand request, CancellationToken cancellationToken)
    {
        _graph.DeleteDowntime(request.Id);

        var dt = await _context.ResourceDowntimes.FirstOrDefaultAsync(d => d.Id == request.Id, cancellationToken);
        if (dt != null)
        {
            _context.ResourceDowntimes.Remove(dt);
            await _context.SaveChangesAsync(cancellationToken);
        }

        await _hub.OnDowntimeDeleted(request.Id);
        return true;
    }
}
