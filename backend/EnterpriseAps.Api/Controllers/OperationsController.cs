using EnterpriseAps.Application.CQRS.Commands;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Graph;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EnterpriseAps.Api.Controllers;

public record ResizeOperationRequest(int NewDurationMinutes);
public record SplitOperationRequest(int SplitDurationMinutes);

[ApiController]
[Route("api/[controller]")]
public class OperationsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IScheduleGraph _graph;

    public OperationsController(IMediator mediator, IScheduleGraph graph)
    {
        _mediator = mediator;
        _graph = graph;
    }

    [HttpGet]
    public ActionResult<List<OperationDto>> GetOperations()
    {
        var workOrders = _graph.GetAllWorkOrders();
        var ops = _graph.GetAllOperations().Select(op => new OperationDto
        {
            Id = op.Id,
            WorkOrderId = op.WorkOrderId,
            WorkOrderNumber = workOrders.FirstOrDefault(w => w.Id == op.WorkOrderId)?.OrderNumber ?? "",
            SequenceIndex = op.SequenceIndex,
            Name = op.Name,
            ProductType = op.ProductType,
            RequiredResourceId = op.RequiredResourceId,
            DurationMinutes = op.DurationMinutes,
            SetupDurationMinutes = op.SetupDurationMinutes,
            PlannedStartTime = op.PlannedStartTime,
            PlannedEndTime = op.PlannedEndTime,
            ActualStartTime = op.ActualStartTime,
            ActualEndTime = op.ActualEndTime,
            Status = op.Status.ToString(),
            ColorCode = op.ColorCode,
            IsLocked = op.IsLocked,
            PrecedenceOperationIds = op.PrecedenceOperationIds
        }).ToList();

        return Ok(ops);
    }

    [HttpPost]
    public async Task<ActionResult<OperationDto>> CreateOperation([FromBody] CreateOperationCommand command)
    {
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<OperationDto>> UpdateOperation(string id, [FromBody] UpdateOperationCommand command)
    {
        if (id != command.Id) return BadRequest("ID mismatch");
        var result = await _mediator.Send(command);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<bool>> DeleteOperation(string id)
    {
        var result = await _mediator.Send(new DeleteOperationCommand(id));
        return Ok(new { success = result });
    }

    [HttpPost("{id}/reschedule")]
    public async Task<ActionResult<ScheduleDeltaDto>> RescheduleOperation(string id, [FromBody] RescheduleOperationCommand command)
    {
        if (id != command.OperationId) return BadRequest("Operation ID mismatch");
        var result = await _mediator.Send(command);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpPost("{id}/resize")]
    public async Task<ActionResult<ScheduleDeltaDto>> ResizeOperation(string id, [FromBody] ResizeOperationRequest req)
    {
        var result = await _mediator.Send(new ResizeOperationCommand(id, req.NewDurationMinutes, true));
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpPost("{id}/split")]
    public async Task<ActionResult<ScheduleDeltaDto>> SplitOperation(string id, [FromBody] SplitOperationRequest req)
    {
        var result = await _mediator.Send(new SplitOperationCommand(id, req.SplitDurationMinutes));
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }
}
