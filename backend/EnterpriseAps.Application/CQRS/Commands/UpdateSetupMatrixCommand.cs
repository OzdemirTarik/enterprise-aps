using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Entities;
using EnterpriseAps.Domain.Graph;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseAps.Application.CQRS.Commands;

public record UpdateSetupMatrixCommand(
    string? ResourceId,
    string FromProductType,
    string ToProductType,
    int SetupMinutes
) : IRequest<SetupMatrixDto>;

public class UpdateSetupMatrixCommandHandler : IRequestHandler<UpdateSetupMatrixCommand, SetupMatrixDto>
{
    private readonly IScheduleGraph _graph;
    private readonly IApplicationDbContext _context;

    public UpdateSetupMatrixCommandHandler(IScheduleGraph graph, IApplicationDbContext context)
    {
        _graph = graph;
        _context = context;
    }

    public async Task<SetupMatrixDto> Handle(UpdateSetupMatrixCommand request, CancellationToken cancellationToken)
    {
        var existing = await _context.SetupMatrices.FirstOrDefaultAsync(
            s => s.ResourceId == request.ResourceId && 
                 s.FromProductType == request.FromProductType && 
                 s.ToProductType == request.ToProductType, 
            cancellationToken);

        if (existing != null)
        {
            existing.SetupMinutes = request.SetupMinutes;
        }
        else
        {
            existing = new SetupMatrixItem
            {
                ResourceId = request.ResourceId,
                FromProductType = request.FromProductType,
                ToProductType = request.ToProductType,
                SetupMinutes = request.SetupMinutes
            };
            await _context.SetupMatrices.AddAsync(existing, cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);
        _graph.AddOrUpdateSetupMatrix(existing);

        return new SetupMatrixDto
        {
            ResourceId = existing.ResourceId,
            FromProductType = existing.FromProductType,
            ToProductType = existing.ToProductType,
            SetupMinutes = existing.SetupMinutes
        };
    }
}
