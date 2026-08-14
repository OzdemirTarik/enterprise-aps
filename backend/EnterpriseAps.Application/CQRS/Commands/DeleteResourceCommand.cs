using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Domain.Graph;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseAps.Application.CQRS.Commands;

public record DeleteResourceCommand(string Id) : IRequest<bool>;

public class DeleteResourceCommandHandler : IRequestHandler<DeleteResourceCommand, bool>
{
    private readonly IScheduleGraph _graph;
    private readonly ISchedulingHubClient _hub;
    private readonly IApplicationDbContext _context;

    public DeleteResourceCommandHandler(
        IScheduleGraph graph, 
        ISchedulingHubClient hub, 
        IApplicationDbContext context)
    {
        _graph = graph;
        _hub = hub;
        _context = context;
    }

    public async Task<bool> Handle(DeleteResourceCommand request, CancellationToken cancellationToken)
    {
        _graph.DeleteResource(request.Id);

        var dbRes = await _context.Resources.FirstOrDefaultAsync(r => r.Id == request.Id, cancellationToken);
        if (dbRes != null)
        {
            _context.Resources.Remove(dbRes);
            await _context.SaveChangesAsync(cancellationToken);
        }

        await _hub.OnResourceDeleted(request.Id);
        return true;
    }
}
