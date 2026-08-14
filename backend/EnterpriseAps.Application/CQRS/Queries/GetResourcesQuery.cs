using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Graph;
using MediatR;

namespace EnterpriseAps.Application.CQRS.Queries;

public record GetResourcesQuery : IRequest<List<ResourceDto>>;

public class GetResourcesQueryHandler : IRequestHandler<GetResourcesQuery, List<ResourceDto>>
{
    private readonly IScheduleGraph _graph;

    public GetResourcesQueryHandler(IScheduleGraph graph)
    {
        _graph = graph;
    }

    public Task<List<ResourceDto>> Handle(GetResourcesQuery request, CancellationToken cancellationToken)
    {
        var resources = _graph.GetAllResources().Select(r => new ResourceDto
        {
            Id = r.Id,
            Name = r.Name,
            Code = r.Code,
            Type = r.Type.ToString(),
            Capacity = r.Capacity,
            HourlyRate = r.HourlyRate,
            ColorHex = r.ColorHex,
            IsActive = r.IsActive
        }).ToList();

        return Task.FromResult(resources);
    }
}
