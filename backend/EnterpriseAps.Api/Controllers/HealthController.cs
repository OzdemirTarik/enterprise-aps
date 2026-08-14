using EnterpriseAps.Domain.Graph;
using Microsoft.AspNetCore.Mvc;

namespace EnterpriseAps.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly IScheduleGraph _graph;

    public HealthController(IScheduleGraph graph)
    {
        _graph = graph;
    }

    [HttpGet]
    public ActionResult GetHealth()
    {
        var resources = _graph.GetAllResources();
        var operations = _graph.GetAllOperations();

        return Ok(new
        {
            status = "Healthy",
            timestamp = DateTime.UtcNow,
            engine = ".NET 8 APS In-Memory Graph",
            version = "1.0.0-prod",
            inMemoryGraphNodes = operations.Count,
            inMemoryResources = resources.Count,
            clusterNode = Environment.MachineName
        });
    }
}
