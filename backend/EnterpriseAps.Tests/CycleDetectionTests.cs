using EnterpriseAps.Domain.Entities;
using EnterpriseAps.Domain.Enums;
using EnterpriseAps.Domain.Graph;
using FluentAssertions;
using Xunit;

namespace EnterpriseAps.Tests;

public class CycleDetectionTests
{
    private readonly IScheduleGraph _graph = new ScheduleGraph();
    private readonly DateTime _baseTime = new DateTime(2026, 8, 24, 8, 0, 0, DateTimeKind.Utc);

    private void SetupInitialGraph()
    {
        var resources = new List<Resource>
        {
            new Resource { Id = "R1", Code = "R1", Name = "Resource 1", Type = ResourceType.SmtLine }
        };

        var workOrders = new List<WorkOrder>
        {
            new WorkOrder { Id = "WO1", OrderNumber = "WO-01", ProductCode = "P1", ProductName = "Prod 1", Quantity = 100, ReleaseDate = _baseTime, DueDate = _baseTime.AddDays(1) }
        };

        // A -> B -> C zinciri
        var operations = new List<Operation>
        {
            new Operation
            {
                Id = "OP-A",
                WorkOrderId = "WO1",
                Name = "Op A",
                RequiredResourceId = "R1",
                DurationMinutes = 60,
                PlannedStartTime = _baseTime,
                PlannedEndTime = _baseTime.AddMinutes(60),
                PrecedenceOperationIds = new List<string>()
            },
            new Operation
            {
                Id = "OP-B",
                WorkOrderId = "WO1",
                Name = "Op B",
                RequiredResourceId = "R1",
                DurationMinutes = 60,
                PlannedStartTime = _baseTime.AddMinutes(60),
                PlannedEndTime = _baseTime.AddMinutes(120),
                PrecedenceOperationIds = new List<string> { "OP-A" }
            },
            new Operation
            {
                Id = "OP-C",
                WorkOrderId = "WO1",
                Name = "Op C",
                RequiredResourceId = "R1",
                DurationMinutes = 60,
                PlannedStartTime = _baseTime.AddMinutes(120),
                PlannedEndTime = _baseTime.AddMinutes(180),
                PrecedenceOperationIds = new List<string> { "OP-B" }
            }
        };

        _graph.Initialize(resources, workOrders, operations, new List<SetupMatrixItem>());
    }

    [Fact]
    public void WouldCreateCycle_SelfLoop_ShouldReturnTrue()
    {
        // Arrange
        SetupInitialGraph();

        // Act & Assert
        _graph.WouldCreateCycle("OP-A", new[] { "OP-A" }).Should().BeTrue("Bir operasyon kendi kendisinin öncülü olamaz");
    }

    [Fact]
    public void WouldCreateCycle_DirectCycle_ShouldReturnTrue()
    {
        // Arrange
        SetupInitialGraph(); // OP-A -> OP-B

        // Act & Assert: OP-A'nın öncülü olarak OP-B atanmaya çalışıldığında
        _graph.WouldCreateCycle("OP-A", new[] { "OP-B" }).Should().BeTrue("A -> B varken B -> A döngü yaratır");
    }

    [Fact]
    public void WouldCreateCycle_TransitiveCycle_ShouldReturnTrue()
    {
        // Arrange
        SetupInitialGraph(); // OP-A -> OP-B -> OP-C

        // Act & Assert: OP-A'nın öncülü olarak OP-C atanmaya çalışıldığında
        _graph.WouldCreateCycle("OP-A", new[] { "OP-C" }).Should().BeTrue("A -> B -> C varken C -> A döngü yaratır");
    }

    [Fact]
    public void WouldCreateCycle_ValidAcyclicDependency_ShouldReturnFalse()
    {
        // Arrange
        SetupInitialGraph();

        // Act & Assert: OP-C'nin öncülü olarak hem OP-A hem OP-B verilmesi (transitive ama DAG korunuyor)
        _graph.WouldCreateCycle("OP-C", new[] { "OP-A", "OP-B" }).Should().BeFalse("Döngü oluşturmayan bağımlılık geçerlidir");
    }

    [Fact]
    public void AddOrUpdateOperation_WithCyclicDependency_ShouldFailGracefully()
    {
        // Arrange
        SetupInitialGraph();

        var cyclicOpA = _graph.GetOperation("OP-A")!;
        cyclicOpA.PrecedenceOperationIds = new List<string> { "OP-C" }; // C -> A döngüsü

        // Act
        var delta = _graph.AddOrUpdateOperation(cyclicOpA);

        // Assert
        delta.Success.Should().BeFalse();
        delta.ErrorMessage.Should().Contain("Döngüsel bağımlılık");
    }
}
