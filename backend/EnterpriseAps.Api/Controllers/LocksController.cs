using EnterpriseAps.Application.CQRS.Commands;
using EnterpriseAps.Application.CQRS.Queries;
using EnterpriseAps.Application.DTOs;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EnterpriseAps.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LocksController : ControllerBase
{
    private readonly IMediator _mediator;

    public LocksController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<List<LockInfoDto>>> GetLocks()
    {
        var result = await _mediator.Send(new GetLocksQuery());
        return Ok(result);
    }

    [HttpPost("acquire")]
    public async Task<ActionResult<LockInfoDto>> AcquireLock([FromBody] AcquireScheduleLockCommand command)
    {
        var result = await _mediator.Send(command);
        if (result == null)
        {
            return Conflict(new { message = $"Resource {command.ResourceId} is already locked by another user." });
        }
        return Ok(result);
    }

    [HttpPost("release")]
    public async Task<ActionResult<bool>> ReleaseLock([FromBody] ReleaseScheduleLockCommand command)
    {
        var result = await _mediator.Send(command);
        return Ok(new { success = result });
    }
}
