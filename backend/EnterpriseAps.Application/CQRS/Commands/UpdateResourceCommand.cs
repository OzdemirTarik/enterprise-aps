using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Enums;
using EnterpriseAps.Domain.Graph;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseAps.Application.CQRS.Commands;

public record UpdateResourceCommand(
    string Id,
    string Name,
    string Code,
    string Type,
    double Capacity,
    double WorkingHoursPerDay,
    decimal HourlyRate,
    string ColorHex,
    bool IsActive
) : IRequest<ResourceDto?>;

public class UpdateResourceCommandHandler : IRequestHandler<UpdateResourceCommand, ResourceDto?>
{
    private readonly IScheduleGraph _graph;
    private readonly ISchedulingHubClient _hub;
    private readonly IApplicationDbContext _context;

    public UpdateResourceCommandHandler(
        IScheduleGraph graph, 
        ISchedulingHubClient hub, 
        IApplicationDbContext context)
    {
        _graph = graph;
        _hub = hub;
        _context = context;
    }

    public async Task<ResourceDto?> Handle(UpdateResourceCommand request, CancellationToken cancellationToken)
    {
        var res = _graph.GetResource(request.Id);
        if (res == null) return null;

        res.Name = request.Name;
        res.Code = request.Code;
        if (Enum.TryParse<ResourceType>(request.Type, true, out var t))
        {
            res.Type = t;
        }
        res.Capacity = request.Capacity;
        res.WorkingHoursPerDay = request.WorkingHoursPerDay;
        res.HourlyRate = request.HourlyRate;
        res.ColorHex = request.ColorHex;
        res.IsActive = request.IsActive;

        _graph.AddOrUpdateResource(res);

        var dbRes = await _context.Resources.FirstOrDefaultAsync(r => r.Id == request.Id, cancellationToken);
        if (dbRes != null)
        {
            dbRes.Name = res.Name;
            dbRes.Code = res.Code;
            dbRes.Type = res.Type;
            dbRes.Capacity = res.Capacity;
            dbRes.WorkingHoursPerDay = res.WorkingHoursPerDay;
            dbRes.HourlyRate = res.HourlyRate;
            dbRes.ColorHex = res.ColorHex;
            dbRes.IsActive = res.IsActive;

            await _context.SaveChangesAsync(cancellationToken);
        }

        var dto = new ResourceDto
        {
            Id = res.Id,
            Name = res.Name,
            Code = res.Code,
            Type = res.Type.ToString(),
            Capacity = res.Capacity,
            WorkingHoursPerDay = res.WorkingHoursPerDay,
            HourlyRate = res.HourlyRate,
            ColorHex = res.ColorHex,
            IsActive = res.IsActive
        };

        await _hub.OnResourceUpdated(dto);
        return dto;
    }
}
