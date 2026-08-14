using EnterpriseAps.Application.CQRS.Commands;
using EnterpriseAps.Application.CQRS.Queries;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Graph;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EnterpriseAps.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ResourcesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IScheduleGraph _graph;

    public ResourcesController(IMediator mediator, IScheduleGraph graph)
    {
        _mediator = mediator;
        _graph = graph;
    }

    [HttpGet]
    public async Task<ActionResult<List<ResourceDto>>> GetResources()
    {
        var result = await _mediator.Send(new GetResourcesQuery());
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<ResourceDto>> CreateResource([FromBody] CreateResourceCommand command)
    {
        var result = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetResources), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ResourceDto>> UpdateResource(string id, [FromBody] UpdateResourceCommand command)
    {
        if (id != command.Id) return BadRequest("ID mismatch");
        var result = await _mediator.Send(command);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<bool>> DeleteResource(string id)
    {
        var result = await _mediator.Send(new DeleteResourceCommand(id));
        return Ok(new { success = result });
    }

    // Downtimes
    [HttpGet("downtimes")]
    public ActionResult<List<ResourceDowntimeDto>> GetDowntimes()
    {
        var dts = _graph.GetAllDowntimes().Select(d => new ResourceDowntimeDto
        {
            Id = d.Id,
            ResourceId = d.ResourceId,
            Reason = d.Reason,
            StartTime = d.StartTime,
            EndTime = d.EndTime,
            IsPlanned = d.IsPlanned
        }).ToList();

        return Ok(dts);
    }

    [HttpPost("downtimes")]
    public async Task<ActionResult<ResourceDowntimeDto>> CreateDowntime([FromBody] CreateResourceDowntimeCommand command)
    {
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    [HttpDelete("downtimes/{id}")]
    public async Task<ActionResult<bool>> DeleteDowntime(string id)
    {
        var result = await _mediator.Send(new DeleteResourceDowntimeCommand(id));
        return Ok(new { success = result });
    }

    [HttpGet("setup-matrices")]
    public ActionResult<List<SetupMatrixDto>> GetSetupMatrices()
    {
        var matrices = _graph.GetAllSetupMatrices().Select(s => new SetupMatrixDto
        {
            ResourceId = s.ResourceId,
            FromProductType = s.FromProductType,
            ToProductType = s.ToProductType,
            SetupMinutes = s.SetupMinutes
        }).ToList();

        return Ok(matrices);
    }
}
