using EnterpriseAps.Application.CQRS.Commands;
using EnterpriseAps.Application.CQRS.Queries;
using EnterpriseAps.Application.DTOs;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EnterpriseAps.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScheduleController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<ScheduleController> _logger;

    public ScheduleController(IMediator mediator, ILogger<ScheduleController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<GanttScheduleDto>> GetSchedule()
    {
        var result = await _mediator.Send(new GetGanttScheduleQuery());
        return Ok(result);
    }

    [HttpPost("reschedule")]
    public async Task<ActionResult<ScheduleDeltaDto>> RescheduleOperation([FromBody] RescheduleOperationCommand command)
    {
        var result = await _mediator.Send(command);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    [HttpPost("optimize")]
    public async Task<ActionResult<ScheduleDeltaDto>> OptimizeSchedule([FromBody] OptimizeScheduleCommand? command)
    {
        var result = await _mediator.Send(command ?? new OptimizeScheduleCommand());
        return Ok(result);
    }

    [HttpGet("kpis")]
    public async Task<ActionResult<ScheduleKpiDto>> GetKpis()
    {
        var result = await _mediator.Send(new GetKpiSummaryQuery());
        return Ok(result);
    }

    [HttpPost("reset-demo")]
    public async Task<ActionResult<bool>> ResetDemoData()
    {
        var result = await _mediator.Send(new SeedDemoDataCommand());
        return Ok(result);
    }
}
