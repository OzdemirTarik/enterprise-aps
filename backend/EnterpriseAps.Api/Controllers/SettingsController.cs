using EnterpriseAps.Application.CQRS.Commands;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Graph;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EnterpriseAps.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IScheduleGraph _graph;

    public SettingsController(IMediator mediator, IScheduleGraph graph)
    {
        _mediator = mediator;
        _graph = graph;
    }

    [HttpGet("matrix")]
    public ActionResult<List<SetupMatrixDto>> GetSetupMatrix()
    {
        var list = _graph.GetAllSetupMatrices().Select(s => new SetupMatrixDto
        {
            ResourceId = s.ResourceId,
            FromProductType = s.FromProductType,
            ToProductType = s.ToProductType,
            SetupMinutes = s.SetupMinutes
        }).ToList();

        return Ok(list);
    }

    [HttpPost("matrix")]
    public async Task<ActionResult<SetupMatrixDto>> UpdateSetupMatrix([FromBody] UpdateSetupMatrixCommand command)
    {
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    [HttpDelete("matrix/{id}")]
    public async Task<ActionResult<bool>> DeleteSetupMatrix(int id)
    {
        var result = await _mediator.Send(new DeleteSetupMatrixCommand(id));
        return Ok(new { success = result });
    }
}
