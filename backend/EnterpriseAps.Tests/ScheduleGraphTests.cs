using EnterpriseAps.Domain.Entities;
using EnterpriseAps.Domain.Enums;
using EnterpriseAps.Domain.Graph;
using FluentAssertions;
using Xunit;

namespace EnterpriseAps.Tests;

public class ScheduleGraphTests
{
    private readonly IScheduleGraph _graph = new ScheduleGraph();
    private readonly DateTime _baseTime = new DateTime(2026, 8, 24, 8, 0, 0, DateTimeKind.Utc); // Pazartesi 08:00

    private (List<Resource>, List<WorkOrder>, List<Operation>, List<SetupMatrixItem>, List<ResourceDowntime>, List<ShiftSchedule>) CreateIndustrialSetup()
    {
        var resources = new List<Resource>
        {
            new Resource { Id = "SMT-01", Code = "SMT-01", Name = "SMT Line 1", Type = ResourceType.SmtLine, Capacity = 1.0 },
            new Resource { Id = "SMT-02", Code = "SMT-02", Name = "SMT Line 2", Type = ResourceType.SmtLine, Capacity = 1.0 },
            new Resource { Id = "TEST-01", Code = "TEST-01", Name = "ICT Test Station", Type = ResourceType.InCircuitTesting, Capacity = 1.0 }
        };

        var workOrders = new List<WorkOrder>
        {
            new WorkOrder
            {
                Id = "WO-01",
                OrderNumber = "WO-AUTO-01",
                ProductCode = "ECU-V1",
                ProductName = "Automotive ECU",
                Quantity = 500,
                ReleaseDate = _baseTime,
                DueDate = _baseTime.AddDays(2),
                Priority = 1,
                Status = WorkOrderStatus.Released
            },
            new WorkOrder
            {
                Id = "WO-02",
                OrderNumber = "WO-MED-01",
                ProductCode = "MED-MON-01",
                ProductName = "Medical Monitor",
                Quantity = 200,
                ReleaseDate = _baseTime,
                DueDate = _baseTime.AddDays(3),
                Priority = 2,
                Status = WorkOrderStatus.Released
            }
        };

        var operations = new List<Operation>
        {
            new Operation
            {
                Id = "OP-01-SMT",
                WorkOrderId = "WO-01",
                Name = "SMT Top Placement",
                ProductType = "Automotive-ECU",
                RequiredResourceId = "SMT-01",
                DurationMinutes = 120,
                SetupDurationMinutes = 15,
                PlannedStartTime = _baseTime,
                PlannedEndTime = _baseTime.AddMinutes(135),
                Status = OperationStatus.Planned,
                PrecedenceOperationIds = new List<string>()
            },
            new Operation
            {
                Id = "OP-01-TEST",
                WorkOrderId = "WO-01",
                Name = "ICT Testing",
                ProductType = "Automotive-ECU",
                RequiredResourceId = "TEST-01",
                DurationMinutes = 60,
                SetupDurationMinutes = 10,
                PlannedStartTime = _baseTime.AddMinutes(135),
                PlannedEndTime = _baseTime.AddMinutes(205),
                Status = OperationStatus.Planned,
                PrecedenceOperationIds = new List<string> { "OP-01-SMT" }
            },
            new Operation
            {
                Id = "OP-02-SMT",
                WorkOrderId = "WO-02",
                Name = "SMT Bottom Placement",
                ProductType = "Medical-Monitor",
                RequiredResourceId = "SMT-01",
                DurationMinutes = 90,
                SetupDurationMinutes = 15,
                PlannedStartTime = _baseTime.AddMinutes(140),
                PlannedEndTime = _baseTime.AddMinutes(245),
                Status = OperationStatus.Planned,
                PrecedenceOperationIds = new List<string>()
            }
        };

        var setupMatrices = new List<SetupMatrixItem>
        {
            new SetupMatrixItem
            {
                ResourceId = "SMT-01",
                FromProductType = "Automotive-ECU",
                ToProductType = "Medical-Monitor",
                SetupMinutes = 45
            }
        };

        var downtimes = new List<ResourceDowntime>
        {
            new ResourceDowntime
            {
                Id = "DT-01",
                ResourceId = "SMT-01",
                Reason = "Daily Feeder Inspection & Wipe",
                StartTime = _baseTime.AddHours(5),
                EndTime = _baseTime.AddHours(5).AddMinutes(30),
                IsPlanned = true
            }
        };

        var shifts = ShiftSchedule.GetDefaultTwoShifts();

        return (resources, workOrders, operations, setupMatrices, downtimes, shifts);
    }

    [Fact]
    public void Initialize_ShouldLoadAllEntitiesAndSetups()
    {
        // Arrange
        var (resources, workOrders, operations, setupMatrices, downtimes, shifts) = CreateIndustrialSetup();

        // Act
        _graph.Initialize(resources, workOrders, operations, setupMatrices, downtimes, shifts);

        // Assert
        _graph.GetAllResources().Should().HaveCount(3);
        _graph.GetAllWorkOrders().Should().HaveCount(2);
        _graph.GetAllOperations().Should().HaveCount(3);
        _graph.GetSetupMinutes("SMT-01", "Automotive-ECU", "Medical-Monitor").Should().Be(45);
    }

    [Fact]
    public void Reschedule_ShouldRippleDownstreamPrecedences()
    {
        // Arrange
        var (resources, workOrders, operations, setupMatrices, downtimes, shifts) = CreateIndustrialSetup();
        _graph.Initialize(resources, workOrders, operations, setupMatrices, downtimes, shifts);

        var newStartTime = _baseTime.AddHours(4); // 08:00 -> 12:00

        // Act
        var delta = _graph.RescheduleOperation("OP-01-SMT", "SMT-01", newStartTime, autoCascade: true);

        // Assert
        delta.Success.Should().BeTrue();
        
        var smtOp = _graph.GetOperation("OP-01-SMT");
        var testOp = _graph.GetOperation("OP-01-TEST");

        smtOp.Should().NotBeNull();
        testOp.Should().NotBeNull();

        smtOp!.PlannedStartTime.Should().Be(newStartTime);
        testOp!.PlannedStartTime.Should().BeOnOrAfter(smtOp.PlannedEndTime, "Ardıl operasyon öncülünün bitişinden önce başlayamaz");
    }

    [Fact]
    public void Reschedule_ShouldApplySetupMatrixBetweenDifferentProducts()
    {
        // Arrange
        var (resources, workOrders, operations, setupMatrices, downtimes, shifts) = CreateIndustrialSetup();
        _graph.Initialize(resources, workOrders, operations, setupMatrices, downtimes, shifts);

        // OP-02-SMT (Medical-Monitor), OP-01-SMT'den (Automotive-ECU) hemen sonra aynı SMT-01 makinesine yerleştirildiğinde
        // Act
        var delta = _graph.RescheduleOperation("OP-02-SMT", "SMT-01", _baseTime.AddMinutes(135), autoCascade: true);

        // Assert
        delta.Success.Should().BeTrue();
        var op2 = _graph.GetOperation("OP-02-SMT");
        op2.Should().NotBeNull();
        op2!.SetupDurationMinutes.Should().Be(45, "Automotive-ECU'dan Medical-Monitor'e geçişte 45 dk setup uygulanmalıdır");
    }

    [Fact]
    public void Reschedule_ShouldEvadePlannedDowntime()
    {
        // Arrange
        var (resources, workOrders, operations, setupMatrices, downtimes, shifts) = CreateIndustrialSetup();
        _graph.Initialize(resources, workOrders, operations, setupMatrices, downtimes, shifts);

        // Bakım: 13:00 - 13:30 (5. saat). Bir operasyonu tam 13:10'a yerleştirmeye çalışalım
        var downtimeStart = _baseTime.AddHours(5);
        var conflictTime = downtimeStart.AddMinutes(10); // 13:10

        // Act
        var delta = _graph.RescheduleOperation("OP-02-SMT", "SMT-01", conflictTime, autoCascade: true);

        // Assert
        delta.Success.Should().BeTrue();
        var op = _graph.GetOperation("OP-02-SMT");
        op.Should().NotBeNull();
        op!.PlannedStartTime.Should().BeOnOrAfter(downtimeStart.AddMinutes(30), "Operasyon bakım bitiş saati (13:30) veya sonrasına ötelenmelidir");
    }

    [Fact]
    public void ResizeOperation_ShouldRecalculateEndTimeAndRipple()
    {
        // Arrange
        var (resources, workOrders, operations, setupMatrices, downtimes, shifts) = CreateIndustrialSetup();
        _graph.Initialize(resources, workOrders, operations, setupMatrices, downtimes, shifts);

        // Act: OP-01-SMT süresini 120 dk'dan 240 dk'ya çıkar
        var delta = _graph.ResizeOperation("OP-01-SMT", 240, autoCascade: true);

        // Assert
        delta.Success.Should().BeTrue();
        var smtOp = _graph.GetOperation("OP-01-SMT");
        var testOp = _graph.GetOperation("OP-01-TEST");

        smtOp!.DurationMinutes.Should().Be(240);
        testOp!.PlannedStartTime.Should().BeOnOrAfter(smtOp.PlannedEndTime);
    }

    [Fact]
    public void CalculateKpis_ShouldReturnValidMetrics()
    {
        // Arrange
        var (resources, workOrders, operations, setupMatrices, downtimes, shifts) = CreateIndustrialSetup();
        _graph.Initialize(resources, workOrders, operations, setupMatrices, downtimes, shifts);

        // Act
        var kpi = _graph.CalculateKpis();

        // Assert
        kpi.TotalOperationsCount.Should().Be(3);
        kpi.TotalWorkOrdersCount.Should().Be(2);
        kpi.TotalMakespanHours.Should().BeGreaterThan(0);
        kpi.OverallOeePercentage.Should().BeInRange(0.0, 100.0);
        kpi.OnTimeDeliveryRatePercentage.Should().BeInRange(0.0, 100.0);
    }
}
