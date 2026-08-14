using EnterpriseAps.Application.CQRS.Commands;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Graph;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace EnterpriseAps.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WorkOrdersController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IScheduleGraph _graph;

    public WorkOrdersController(IMediator mediator, IScheduleGraph graph)
    {
        _mediator = mediator;
        _graph = graph;
    }

    [HttpGet]
    public ActionResult<List<WorkOrderDto>> GetWorkOrders()
    {
        var operations = _graph.GetAllOperations();
        var workOrders = _graph.GetAllWorkOrders().Select(wo => new WorkOrderDto
        {
            Id = wo.Id,
            OrderNumber = wo.OrderNumber,
            CustomerName = wo.CustomerName,
            ProductCode = wo.ProductCode,
            ProductName = wo.ProductName,
            Quantity = wo.Quantity,
            ReleaseDate = wo.ReleaseDate,
            DueDate = wo.DueDate,
            Priority = wo.Priority,
            Status = wo.Status,
            OperationIds = operations.Where(o => o.WorkOrderId == wo.Id).Select(o => o.Id).ToList()
        }).ToList();

        return Ok(workOrders);
    }

    [HttpGet("{id}")]
    public ActionResult<WorkOrderDto> GetWorkOrder(string id)
    {
        var wo = _graph.GetWorkOrder(id);
        if (wo == null) return NotFound();

        var operations = _graph.GetAllOperations();
        var dto = new WorkOrderDto
        {
            Id = wo.Id,
            OrderNumber = wo.OrderNumber,
            CustomerName = wo.CustomerName,
            ProductCode = wo.ProductCode,
            ProductName = wo.ProductName,
            Quantity = wo.Quantity,
            ReleaseDate = wo.ReleaseDate,
            DueDate = wo.DueDate,
            Priority = wo.Priority,
            Status = wo.Status,
            OperationIds = operations.Where(o => o.WorkOrderId == wo.Id).Select(o => o.Id).ToList()
        };

        return Ok(dto);
    }

    [HttpPost]
    public async Task<ActionResult<WorkOrderDto>> CreateWorkOrder([FromBody] CreateWorkOrderCommand command)
    {
        var result = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetWorkOrder), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<WorkOrderDto>> UpdateWorkOrder(string id, [FromBody] UpdateWorkOrderCommand command)
    {
        if (id != command.Id) return BadRequest("ID mismatch");
        var result = await _mediator.Send(command);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<bool>> DeleteWorkOrder(string id)
    {
        var result = await _mediator.Send(new DeleteWorkOrderCommand(id));
        return Ok(new { success = result });
    }
}
