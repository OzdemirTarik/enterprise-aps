using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Entities;
using EnterpriseAps.Domain.Enums;
using EnterpriseAps.Domain.Graph;
using MediatR;

namespace EnterpriseAps.Application.CQRS.Commands;

public record CreateResourceCommand(
    string Name,
    string Code,
    string Type,
    double Capacity,
    double WorkingHoursPerDay,
    decimal HourlyRate,
    string ColorHex
) : IRequest<ResourceDto>;

public class CreateResourceCommandHandler : IRequestHandler<CreateResourceCommand, ResourceDto>
{
    private readonly IScheduleGraph _graph;
    private readonly ISchedulingHubClient _hub;
    private readonly IApplicationDbContext _context;

    public CreateResourceCommandHandler(
        IScheduleGraph graph, 
        ISchedulingHubClient hub, 
        IApplicationDbContext context)
    {
        _graph = graph;
        _hub = hub;
        _context = context;
    }

    public async Task<ResourceDto> Handle(CreateResourceCommand request, CancellationToken cancellationToken)
    {
        var resType = Enum.TryParse<ResourceType>(request.Type, true, out var t) ? t : ResourceType.CncMachine;
        var resource = new Resource
        {
            Id = $"MCH-{request.Code.ToUpper().Replace(" ", "")}",
            Name = request.Name,
            Code = request.Code,
            Type = resType,
            Capacity = request.Capacity,
            WorkingHoursPerDay = request.WorkingHoursPerDay,
            HourlyRate = request.HourlyRate,
            ColorHex = request.ColorHex,
            IsActive = true
        };

        _graph.AddOrUpdateResource(resource);

        await _context.Resources.AddAsync(resource, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        var dto = new ResourceDto
        {
            Id = resource.Id,
            Name = resource.Name,
            Code = resource.Code,
            Type = resource.Type.ToString(),
            Capacity = resource.Capacity,
            WorkingHoursPerDay = resource.WorkingHoursPerDay,
            HourlyRate = resource.HourlyRate,
            ColorHex = resource.ColorHex,
            IsActive = resource.IsActive
        };

        await _hub.OnResourceUpdated(dto);
        return dto;
    }
}
