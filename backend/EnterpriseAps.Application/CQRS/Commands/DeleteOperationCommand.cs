using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Graph;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseAps.Application.CQRS.Commands;

public record DeleteOperationCommand(string Id) : IRequest<bool>;

public class DeleteOperationCommandHandler : IRequestHandler<DeleteOperationCommand, bool>
{
    private readonly IScheduleGraph _graph;
    private readonly ISchedulingHubClient _hub;
    private readonly IApplicationDbContext _context;

    public DeleteOperationCommandHandler(
        IScheduleGraph graph, 
        ISchedulingHubClient hub, 
        IApplicationDbContext context)
    {
        _graph = graph;
        _hub = hub;
        _context = context;
    }

    public async Task<bool> Handle(DeleteOperationCommand request, CancellationToken cancellationToken)
    {
        var delta = _graph.DeleteOperation(request.Id, true);

        var dbOp = await _context.Operations.FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken);
        if (dbOp != null)
        {
            _context.Operations.Remove(dbOp);
            await _context.SaveChangesAsync(cancellationToken);
        }

        await _hub.OnOperationDeleted(request.Id);

        if (delta.AffectedOperations.Count > 0)
        {
            var deltaDto = new ScheduleDeltaDto
            {
                TriggeredByOperationId = request.Id,
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
                    Status = o.Status.ToString(),
                    ColorCode = o.ColorCode,
                    IsLocked = o.IsLocked,
                    PrecedenceOperationIds = o.PrecedenceOperationIds
                }).ToList()
            };

            await _hub.OnScheduleUpdated(deltaDto);
        }

        return true;
    }
}
