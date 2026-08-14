using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Domain.Entities;
using EnterpriseAps.Domain.Enums;
using EnterpriseAps.Domain.Graph;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseAps.Application.CQRS.Commands;

public record SeedDemoDataCommand : IRequest<bool>;

public class SeedDemoDataCommandHandler : IRequestHandler<SeedDemoDataCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IScheduleGraph _graph;

    public SeedDemoDataCommandHandler(IApplicationDbContext context, IScheduleGraph graph)
    {
        _context = context;
        _graph = graph;
    }

    public async Task<bool> Handle(SeedDemoDataCommand request, CancellationToken cancellationToken)
    {
        var (resources, workOrders, operations, setupMatrices, downtimes) = GenerateIndustrialDemoData();

        // Clear existing for clean demo reset
        _context.ResourceDowntimes.RemoveRange(await _context.ResourceDowntimes.ToListAsync(cancellationToken));
        _context.Operations.RemoveRange(await _context.Operations.ToListAsync(cancellationToken));
        _context.WorkOrders.RemoveRange(await _context.WorkOrders.ToListAsync(cancellationToken));
        _context.SetupMatrices.RemoveRange(await _context.SetupMatrices.ToListAsync(cancellationToken));
        _context.Resources.RemoveRange(await _context.Resources.ToListAsync(cancellationToken));
        await _context.SaveChangesAsync(cancellationToken);

        await _context.Resources.AddRangeAsync(resources, cancellationToken);
        await _context.WorkOrders.AddRangeAsync(workOrders, cancellationToken);
        await _context.Operations.AddRangeAsync(operations, cancellationToken);
        await _context.SetupMatrices.AddRangeAsync(setupMatrices, cancellationToken);
        await _context.ResourceDowntimes.AddRangeAsync(downtimes, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        _graph.Initialize(resources, workOrders, operations, setupMatrices, downtimes);
        return true;
    }

    public static (List<Resource>, List<WorkOrder>, List<Operation>, List<SetupMatrixItem>, List<ResourceDowntime>) GenerateIndustrialDemoData()
    {
        var baseDate = DateTime.UtcNow.Date.AddHours(8); // Shift 1 start at 08:00 AM

        // 1. EMS / PCBA Production Work Centers
        var resources = new List<Resource>
        {
            new()
            {
                Id = "SMT-LINE-01",
                Name = "SMT Line 01 (High-Speed Dual-Lane Yamaha / Heller 10-Zone)",
                Code = "SMT-01",
                Type = ResourceType.SmtLine,
                WorkingHoursPerDay = 24.0,
                HourlyRate = 380.00m,
                ColorHex = "#06b6d4" // Cyan
            },
            new()
            {
                Id = "SMT-LINE-02",
                Name = "SMT Line 02 (Flexible / NPI Prototype Line ASM SIPLACE)",
                Code = "SMT-02",
                Type = ResourceType.SmtLine,
                WorkingHoursPerDay = 24.0,
                HourlyRate = 320.00m,
                ColorHex = "#0284c7" // Sky
            },
            new()
            {
                Id = "THT-WAVE-01",
                Name = "THT Wave Solder Conveyor (Ersa PowerWave Lead-Free Dual-Wave)",
                Code = "WAVE-01",
                Type = ResourceType.ThtWaveSoldering,
                WorkingHoursPerDay = 16.0,
                HourlyRate = 180.00m,
                ColorHex = "#f59e0b" // Amber
            },
            new()
            {
                Id = "THT-SELECTIVE-01",
                Name = "THT High-Precision Selective Soldering (Pillarhouse Multi-Nozzle)",
                Code = "SEL-01",
                Type = ResourceType.ThtSelectiveSoldering,
                WorkingHoursPerDay = 16.0,
                HourlyRate = 220.00m,
                ColorHex = "#d97706" // Warm Amber
            },
            new()
            {
                Id = "ICT-STATION-01",
                Name = "In-Circuit Test & Boundary Scan (Keysight 3070 Fixture / SPEA)",
                Code = "ICT-01",
                Type = ResourceType.InCircuitTesting,
                WorkingHoursPerDay = 16.0,
                HourlyRate = 160.00m,
                ColorHex = "#10b981" // Emerald
            },
            new()
            {
                Id = "FCT-BENCH-01",
                Name = "Functional Test & Automated Firmware Flash Benches",
                Code = "FCT-01",
                Type = ResourceType.FunctionalTesting,
                WorkingHoursPerDay = 16.0,
                HourlyRate = 140.00m,
                ColorHex = "#059669" // Dark Green
            },
            new()
            {
                Id = "COAT-UV-01",
                Name = "Conformal Moisture Coating & UV Curing Tunnel (Nordson Asymtek)",
                Code = "COAT-01",
                Type = ResourceType.ConformalCoating,
                WorkingHoursPerDay = 16.0,
                HourlyRate = 150.00m,
                ColorHex = "#ec4899" // Pink
            },
            new()
            {
                Id = "DEPANEL-ROUTER-01",
                Name = "High-Speed Dual-Table CNC PCB Depaneling Router",
                Code = "ROUTER-01",
                Type = ResourceType.DepanelingRouter,
                WorkingHoursPerDay = 16.0,
                HourlyRate = 120.00m,
                ColorHex = "#8b5cf6" // Purple
            }
        };

        // 2. EMS Setup Matrices & Product Family Changeover Penalties
        var setupMatrices = new List<SetupMatrixItem>
        {
            // Feeder Cart Reload & Setup Penalties between PCB Models
            new() { ResourceId = "SMT-LINE-01", FromProductType = "Automotive-ECU", ToProductType = "IoT-Gateway", SetupMinutes = 45 },
            new() { ResourceId = "SMT-LINE-01", FromProductType = "IoT-Gateway", ToProductType = "Automotive-ECU", SetupMinutes = 45 },
            new() { ResourceId = "SMT-LINE-01", FromProductType = "Medical-Monitor", ToProductType = "Automotive-ECU", SetupMinutes = 50 },
            new() { ResourceId = "SMT-LINE-01", FromProductType = "Automotive-ECU", ToProductType = "Medical-Monitor", SetupMinutes = 50 },
            new() { ResourceId = "SMT-LINE-02", FromProductType = "Industrial-Power", ToProductType = "Aerospace-Telemetry", SetupMinutes = 40 },
            new() { ResourceId = "SMT-LINE-02", FromProductType = "Aerospace-Telemetry", ToProductType = "Industrial-Power", SetupMinutes = 40 },

            // Solder Alloy Thermal Re-profiling: SAC305 (Lead-Free) <-> SnPb (Leaded)
            new() { ResourceId = null, FromProductType = "SAC305-LeadFree", ToProductType = "SnPb-Leaded", SetupMinutes = 30 },
            new() { ResourceId = null, FromProductType = "SnPb-Leaded", ToProductType = "SAC305-LeadFree", SetupMinutes = 35 },

            // Stencil Thickness & Fine-Pitch Swap
            new() { ResourceId = null, FromProductType = "FinePitch-0.10mm", ToProductType = "Standard-0.15mm", SetupMinutes = 20 },
            new() { ResourceId = null, FromProductType = "Standard-0.15mm", ToProductType = "FinePitch-0.10mm", SetupMinutes = 25 },

            // Conformal Coating Valve Purge & Material Flush
            new() { ResourceId = "COAT-UV-01", FromProductType = "Acrylic-Humiseal", ToProductType = "Silicone-DowCorning", SetupMinutes = 30 },
            new() { ResourceId = "COAT-UV-01", FromProductType = "Silicone-DowCorning", ToProductType = "Acrylic-Humiseal", SetupMinutes = 30 }
        };

        // 3. Planned SMT & Wave Maintenance Intervals
        var downtimes = new List<ResourceDowntime>
        {
            new()
            {
                Id = "DT-01",
                ResourceId = "SMT-LINE-01",
                Reason = "SMT Squeegee & Stencil Auto-Wipe and Paste Inspection",
                StartTime = baseDate.AddHours(4), // 12:00 today
                EndTime = baseDate.AddHours(4).AddMinutes(20), // 12:20 today
                IsPlanned = true
            },
            new()
            {
                Id = "DT-02",
                ResourceId = "THT-WAVE-01",
                Reason = "Solder Pot Dross Skimming & Wave Height Verification",
                StartTime = baseDate.AddHours(6), // 14:00 today
                EndTime = baseDate.AddHours(6).AddMinutes(30), // 14:30 today
                IsPlanned = true
            }
        };

        // 4. 5 Realistic High-Reliability PCBA Work Orders
        var workOrders = new List<WorkOrder>
        {
            new()
            {
                Id = "WO-1001",
                OrderNumber = "WO-2026-AUT-ECU",
                CustomerName = "Continental Automotive Systems",
                ProductCode = "ECU-MAIN-V4",
                ProductName = "Automotive Dual-Core Engine Control Unit (Dual-Sided)",
                Quantity = 500,
                ReleaseDate = baseDate,
                DueDate = baseDate.AddDays(2).AddHours(6),
                Priority = 1, // Rush Automotive
                Status = "Planned"
            },
            new()
            {
                Id = "WO-1002",
                OrderNumber = "WO-2026-IOT-GW",
                CustomerName = "Schneider Electric IoT",
                ProductCode = "IOT-GW-800",
                ProductName = "Smart Grid Multi-Band Telemetry Gateway Board",
                Quantity = 1200,
                ReleaseDate = baseDate,
                DueDate = baseDate.AddDays(2).AddHours(12),
                Priority = 2,
                Status = "Planned"
            },
            new()
            {
                Id = "WO-1003",
                OrderNumber = "WO-2026-MED-MON",
                CustomerName = "Philips Healthcare BioSystems",
                ProductCode = "MED-MON-100",
                ProductName = "Multi-Parameter ICU Patient Monitor Mainboard (Class III)",
                Quantity = 150,
                ReleaseDate = baseDate,
                DueDate = baseDate.AddDays(3),
                Priority = 1, // Critical Medical
                Status = "Planned"
            },
            new()
            {
                Id = "WO-1004",
                OrderNumber = "WO-2026-IND-INV",
                CustomerName = "ABB Robotics & Drives",
                ProductCode = "INV-PWR-800V",
                ProductName = "800V Heavy Copper SiC Inverter Driver Board",
                Quantity = 300,
                ReleaseDate = baseDate.AddHours(2),
                DueDate = baseDate.AddDays(3).AddHours(4),
                Priority = 2,
                Status = "Planned"
            },
            new()
            {
                Id = "WO-1005",
                OrderNumber = "WO-2026-AER-TEL",
                CustomerName = "Airbus Defence and Space",
                ProductCode = "AERO-TEL-500",
                ProductName = "Radiation-Tolerant Avionics Telemetry Module (NPI Run)",
                Quantity = 50,
                ReleaseDate = baseDate,
                DueDate = baseDate.AddDays(2),
                Priority = 3,
                Status = "Planned"
            }
        };

        // 5. Operations Routing with Strict Precedence Chains (DAG)
        var operations = new List<Operation>
        {
            // --- WO-1001: Automotive ECU Mainboard (8 Operations) ---
            new()
            {
                Id = "OP-1001-10",
                WorkOrderId = "WO-1001",
                SequenceIndex = 1,
                Name = "Top-Side Stencil Print & 3D SPI",
                ProductType = "Automotive-ECU",
                RequiredResourceId = "SMT-LINE-01",
                DurationMinutes = 60,
                SetupDurationMinutes = 15,
                PlannedStartTime = baseDate,
                PlannedEndTime = baseDate.AddMinutes(75),
                Status = OperationStatus.Planned,
                ColorCode = "#06b6d4", // Cyan
                PrecedenceOperationIds = new()
            },
            new()
            {
                Id = "OP-1001-20",
                WorkOrderId = "WO-1001",
                SequenceIndex = 2,
                Name = "Top-Side SMT Placement & 10-Zone Reflow",
                ProductType = "Automotive-ECU",
                RequiredResourceId = "SMT-LINE-01",
                DurationMinutes = 90,
                SetupDurationMinutes = 10,
                PlannedStartTime = baseDate.AddMinutes(75),
                PlannedEndTime = baseDate.AddMinutes(75 + 10 + 90),
                Status = OperationStatus.Planned,
                ColorCode = "#06b6d4",
                PrecedenceOperationIds = new() { "OP-1001-10" }
            },
            new()
            {
                Id = "OP-1001-30",
                WorkOrderId = "WO-1001",
                SequenceIndex = 3,
                Name = "Top-Side 3D AOI Optical & Solder Joint Inspection",
                ProductType = "Automotive-ECU",
                RequiredResourceId = "SMT-LINE-01",
                DurationMinutes = 45,
                SetupDurationMinutes = 5,
                PlannedStartTime = baseDate.AddMinutes(175),
                PlannedEndTime = baseDate.AddMinutes(175 + 5 + 45),
                Status = OperationStatus.Planned,
                ColorCode = "#a855f7", // Purple (Inspection)
                PrecedenceOperationIds = new() { "OP-1001-20" }
            },
            new()
            {
                Id = "OP-1001-40",
                WorkOrderId = "WO-1001",
                SequenceIndex = 4,
                Name = "Bottom-Side Stencil Print, SMT & Dual-Wave Reflow",
                ProductType = "Automotive-ECU",
                RequiredResourceId = "SMT-LINE-01",
                DurationMinutes = 110,
                SetupDurationMinutes = 20,
                PlannedStartTime = baseDate.AddMinutes(245), // After maintenance window
                PlannedEndTime = baseDate.AddMinutes(245 + 20 + 110),
                Status = OperationStatus.Planned,
                ColorCode = "#0284c7", // Sky/Blue (Bottom Side)
                PrecedenceOperationIds = new() { "OP-1001-30" }
            },
            new()
            {
                Id = "OP-1001-50",
                WorkOrderId = "WO-1001",
                SequenceIndex = 5,
                Name = "THT Heavy Connectors Precision Selective Soldering",
                ProductType = "Automotive-ECU",
                RequiredResourceId = "THT-SELECTIVE-01",
                DurationMinutes = 75,
                SetupDurationMinutes = 15,
                PlannedStartTime = baseDate.AddMinutes(375),
                PlannedEndTime = baseDate.AddMinutes(375 + 15 + 75),
                Status = OperationStatus.Planned,
                ColorCode = "#d97706", // Amber (THT)
                PrecedenceOperationIds = new() { "OP-1001-40" }
            },
            new()
            {
                Id = "OP-1001-60",
                WorkOrderId = "WO-1001",
                SequenceIndex = 6,
                Name = "In-Circuit Bed-of-Nails & Boundary Scan Testing",
                ProductType = "Automotive-ECU",
                RequiredResourceId = "ICT-STATION-01",
                DurationMinutes = 60,
                SetupDurationMinutes = 10,
                PlannedStartTime = baseDate.AddMinutes(465),
                PlannedEndTime = baseDate.AddMinutes(465 + 10 + 60),
                Status = OperationStatus.Planned,
                ColorCode = "#10b981", // Emerald (Test)
                PrecedenceOperationIds = new() { "OP-1001-50" }
            },
            new()
            {
                Id = "OP-1001-70",
                WorkOrderId = "WO-1001",
                SequenceIndex = 7,
                Name = "Conformal Moisture Coating & In-Line UV Curing",
                ProductType = "Automotive-ECU",
                RequiredResourceId = "COAT-UV-01",
                DurationMinutes = 60,
                SetupDurationMinutes = 15,
                PlannedStartTime = baseDate.AddMinutes(535),
                PlannedEndTime = baseDate.AddMinutes(535 + 15 + 60),
                Status = OperationStatus.Planned,
                ColorCode = "#ec4899", // Pink (Coating)
                PrecedenceOperationIds = new() { "OP-1001-60" }
            },
            new()
            {
                Id = "OP-1001-80",
                WorkOrderId = "WO-1001",
                SequenceIndex = 8,
                Name = "Final Automated FCT Functional Test & ECU Firmware Flash",
                ProductType = "Automotive-ECU",
                RequiredResourceId = "FCT-BENCH-01",
                DurationMinutes = 45,
                SetupDurationMinutes = 10,
                PlannedStartTime = baseDate.AddMinutes(610),
                PlannedEndTime = baseDate.AddMinutes(610 + 10 + 45),
                Status = OperationStatus.Planned,
                ColorCode = "#059669", // Dark Green (FCT)
                PrecedenceOperationIds = new() { "OP-1001-70" }
            },

            // --- WO-1002: Smart Energy IoT Gateway (5 Operations) ---
            new()
            {
                Id = "OP-1002-10",
                WorkOrderId = "WO-1002",
                SequenceIndex = 1,
                Name = "Top-Side High-Speed SMT (SoC & RF Front-End)",
                ProductType = "IoT-Gateway",
                RequiredResourceId = "SMT-LINE-01",
                DurationMinutes = 120,
                SetupDurationMinutes = 45, // Feeder changeover
                PlannedStartTime = baseDate.AddMinutes(395),
                PlannedEndTime = baseDate.AddMinutes(395 + 45 + 120),
                Status = OperationStatus.Planned,
                ColorCode = "#06b6d4",
                PrecedenceOperationIds = new()
            },
            new()
            {
                Id = "OP-1002-20",
                WorkOrderId = "WO-1002",
                SequenceIndex = 2,
                Name = "Bottom-Side Passives Placement & Solder",
                ProductType = "IoT-Gateway",
                RequiredResourceId = "SMT-LINE-01",
                DurationMinutes = 80,
                SetupDurationMinutes = 15,
                PlannedStartTime = baseDate.AddMinutes(560),
                PlannedEndTime = baseDate.AddMinutes(560 + 15 + 80),
                Status = OperationStatus.Planned,
                ColorCode = "#0284c7",
                PrecedenceOperationIds = new() { "OP-1002-10" }
            },
            new()
            {
                Id = "OP-1002-30",
                WorkOrderId = "WO-1002",
                SequenceIndex = 3,
                Name = "Dual-Wave Soldering for RJ45 & Terminal Blocks",
                ProductType = "IoT-Gateway",
                RequiredResourceId = "THT-WAVE-01",
                DurationMinutes = 90,
                SetupDurationMinutes = 20,
                PlannedStartTime = baseDate.AddMinutes(655),
                PlannedEndTime = baseDate.AddMinutes(655 + 20 + 90),
                Status = OperationStatus.Planned,
                ColorCode = "#f59e0b",
                PrecedenceOperationIds = new() { "OP-1002-20" }
            },
            new()
            {
                Id = "OP-1002-40",
                WorkOrderId = "WO-1002",
                SequenceIndex = 4,
                Name = "In-Circuit Testing & RF Calibration",
                ProductType = "IoT-Gateway",
                RequiredResourceId = "ICT-STATION-01",
                DurationMinutes = 60,
                SetupDurationMinutes = 10,
                PlannedStartTime = baseDate.AddMinutes(765),
                PlannedEndTime = baseDate.AddMinutes(765 + 10 + 60),
                Status = OperationStatus.Planned,
                ColorCode = "#10b981",
                PrecedenceOperationIds = new() { "OP-1002-30" }
            },
            new()
            {
                Id = "OP-1002-50",
                WorkOrderId = "WO-1002",
                SequenceIndex = 5,
                Name = "CNC Panel Singulation & Depaneling",
                ProductType = "IoT-Gateway",
                RequiredResourceId = "DEPANEL-ROUTER-01",
                DurationMinutes = 45,
                SetupDurationMinutes = 10,
                PlannedStartTime = baseDate.AddMinutes(835),
                PlannedEndTime = baseDate.AddMinutes(835 + 10 + 45),
                Status = OperationStatus.Planned,
                ColorCode = "#8b5cf6",
                PrecedenceOperationIds = new() { "OP-1002-40" }
            },

            // --- WO-1003: Medical Patient Monitor (ISO 13485) (5 Operations) ---
            new()
            {
                Id = "OP-1003-10",
                WorkOrderId = "WO-1003",
                SequenceIndex = 1,
                Name = "Medical Grade SMT Placement & N2 Nitrogen Reflow",
                ProductType = "Medical-Monitor",
                RequiredResourceId = "SMT-LINE-02",
                DurationMinutes = 140,
                SetupDurationMinutes = 30,
                PlannedStartTime = baseDate,
                PlannedEndTime = baseDate.AddMinutes(170),
                Status = OperationStatus.Planned,
                ColorCode = "#06b6d4",
                PrecedenceOperationIds = new()
            },
            new()
            {
                Id = "OP-1003-20",
                WorkOrderId = "WO-1003",
                SequenceIndex = 2,
                Name = "100% 3D AXI X-Ray BGA Voiding & Solder Joint Verification",
                ProductType = "Medical-Monitor",
                RequiredResourceId = "SMT-LINE-02",
                DurationMinutes = 60,
                SetupDurationMinutes = 10,
                PlannedStartTime = baseDate.AddMinutes(170),
                PlannedEndTime = baseDate.AddMinutes(170 + 10 + 60),
                Status = OperationStatus.Planned,
                ColorCode = "#a855f7",
                PrecedenceOperationIds = new() { "OP-1003-10" }
            },
            new()
            {
                Id = "OP-1003-30",
                WorkOrderId = "WO-1003",
                SequenceIndex = 3,
                Name = "THT Isolated Sensor Port Selective Soldering",
                ProductType = "Medical-Monitor",
                RequiredResourceId = "THT-SELECTIVE-01",
                DurationMinutes = 80,
                SetupDurationMinutes = 15,
                PlannedStartTime = baseDate.AddMinutes(240),
                PlannedEndTime = baseDate.AddMinutes(240 + 15 + 80),
                Status = OperationStatus.Planned,
                ColorCode = "#d97706",
                PrecedenceOperationIds = new() { "OP-1003-20" }
            },
            new()
            {
                Id = "OP-1003-40",
                WorkOrderId = "WO-1003",
                SequenceIndex = 4,
                Name = "Medical Silicone Conformal Moisture Coating",
                ProductType = "Medical-Monitor",
                RequiredResourceId = "COAT-UV-01",
                DurationMinutes = 70,
                SetupDurationMinutes = 30, // Silicone purge
                PlannedStartTime = baseDate.AddMinutes(610),
                PlannedEndTime = baseDate.AddMinutes(610 + 30 + 70),
                Status = OperationStatus.Planned,
                ColorCode = "#ec4899",
                PrecedenceOperationIds = new() { "OP-1003-30" }
            },
            new()
            {
                Id = "OP-1003-50",
                WorkOrderId = "WO-1003",
                SequenceIndex = 5,
                Name = "Multi-Lead ECG & SpO2 Comprehensive FCT Validation",
                ProductType = "Medical-Monitor",
                RequiredResourceId = "FCT-BENCH-01",
                DurationMinutes = 60,
                SetupDurationMinutes = 15,
                PlannedStartTime = baseDate.AddMinutes(710),
                PlannedEndTime = baseDate.AddMinutes(710 + 15 + 60),
                Status = OperationStatus.Planned,
                ColorCode = "#059669",
                PrecedenceOperationIds = new() { "OP-1003-40" }
            },

            // --- WO-1004: Industrial Inverter Power Stage (4 Operations) ---
            new()
            {
                Id = "OP-1004-10",
                WorkOrderId = "WO-1004",
                SequenceIndex = 1,
                Name = "Heavy Copper 4oz Surface Mount Assembly (SiC MOSFETs)",
                ProductType = "Industrial-Power",
                RequiredResourceId = "SMT-LINE-02",
                DurationMinutes = 150,
                SetupDurationMinutes = 40,
                PlannedStartTime = baseDate.AddMinutes(240),
                PlannedEndTime = baseDate.AddMinutes(240 + 40 + 150),
                Status = OperationStatus.Planned,
                ColorCode = "#06b6d4",
                PrecedenceOperationIds = new()
            },
            new()
            {
                Id = "OP-1004-20",
                WorkOrderId = "WO-1004",
                SequenceIndex = 2,
                Name = "High-Current Busbar & DC Capacitor Selective Soldering",
                ProductType = "Industrial-Power",
                RequiredResourceId = "THT-SELECTIVE-01",
                DurationMinutes = 100,
                SetupDurationMinutes = 20,
                PlannedStartTime = baseDate.AddMinutes(430),
                PlannedEndTime = baseDate.AddMinutes(430 + 20 + 100),
                Status = OperationStatus.Planned,
                ColorCode = "#d97706",
                PrecedenceOperationIds = new() { "OP-1004-10" }
            },
            new()
            {
                Id = "OP-1004-30",
                WorkOrderId = "WO-1004",
                SequenceIndex = 3,
                Name = "High-Voltage 5kV AC Hipot & Insulation Dielectric Test",
                ProductType = "Industrial-Power",
                RequiredResourceId = "ICT-STATION-01",
                DurationMinutes = 50,
                SetupDurationMinutes = 15,
                PlannedStartTime = baseDate.AddMinutes(550),
                PlannedEndTime = baseDate.AddMinutes(550 + 15 + 50),
                Status = OperationStatus.Planned,
                ColorCode = "#10b981",
                PrecedenceOperationIds = new() { "OP-1004-20" }
            },
            new()
            {
                Id = "OP-1004-40",
                WorkOrderId = "WO-1004",
                SequenceIndex = 4,
                Name = "Full Load Dynamic Power Switching & Thermal Cam Test",
                ProductType = "Industrial-Power",
                RequiredResourceId = "FCT-BENCH-01",
                DurationMinutes = 80,
                SetupDurationMinutes = 20,
                PlannedStartTime = baseDate.AddMinutes(615),
                PlannedEndTime = baseDate.AddMinutes(615 + 20 + 80),
                Status = OperationStatus.Planned,
                ColorCode = "#059669",
                PrecedenceOperationIds = new() { "OP-1004-30" }
            },

            // --- WO-1005: Aerospace Flight Telemetry Module (4 Operations) ---
            new()
            {
                Id = "OP-1005-10",
                WorkOrderId = "WO-1005",
                SequenceIndex = 1,
                Name = "NPI Top SMT Placement with Leaded Sn63Pb37 Alloy",
                ProductType = "Aerospace-Telemetry",
                RequiredResourceId = "SMT-LINE-02",
                DurationMinutes = 110,
                SetupDurationMinutes = 35, // SnPb thermal profiling
                PlannedStartTime = baseDate.AddMinutes(430),
                PlannedEndTime = baseDate.AddMinutes(430 + 35 + 110),
                Status = OperationStatus.Planned,
                ColorCode = "#06b6d4",
                PrecedenceOperationIds = new()
            },
            new()
            {
                Id = "OP-1005-20",
                WorkOrderId = "WO-1005",
                SequenceIndex = 2,
                Name = "NPI Bottom SMT Component Placement",
                ProductType = "Aerospace-Telemetry",
                RequiredResourceId = "SMT-LINE-02",
                DurationMinutes = 70,
                SetupDurationMinutes = 15,
                PlannedStartTime = baseDate.AddMinutes(575),
                PlannedEndTime = baseDate.AddMinutes(575 + 15 + 70),
                Status = OperationStatus.Planned,
                ColorCode = "#0284c7",
                PrecedenceOperationIds = new() { "OP-1005-10" }
            },
            new()
            {
                Id = "OP-1005-30",
                WorkOrderId = "WO-1005",
                SequenceIndex = 3,
                Name = "Flying Probe Fixtureless High-Precision ICT",
                ProductType = "Aerospace-Telemetry",
                RequiredResourceId = "ICT-STATION-01",
                DurationMinutes = 90,
                SetupDurationMinutes = 20,
                PlannedStartTime = baseDate.AddMinutes(660),
                PlannedEndTime = baseDate.AddMinutes(660 + 20 + 90),
                Status = OperationStatus.Planned,
                ColorCode = "#10b981",
                PrecedenceOperationIds = new() { "OP-1005-20" }
            },
            new()
            {
                Id = "OP-1005-40",
                WorkOrderId = "WO-1005",
                SequenceIndex = 4,
                Name = "Mil-Spec Parylene Vapor Conformal Barrier Coating",
                ProductType = "Aerospace-Telemetry",
                RequiredResourceId = "COAT-UV-01",
                DurationMinutes = 80,
                SetupDurationMinutes = 20,
                PlannedStartTime = baseDate.AddMinutes(770),
                PlannedEndTime = baseDate.AddMinutes(770 + 20 + 80),
                Status = OperationStatus.Planned,
                ColorCode = "#ec4899",
                PrecedenceOperationIds = new() { "OP-1005-30" }
            }
        };

        return (resources, workOrders, operations, setupMatrices, downtimes);
    }
}
