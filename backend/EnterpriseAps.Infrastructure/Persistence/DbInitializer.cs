using EnterpriseAps.Application.CQRS.Commands;
using EnterpriseAps.Domain.Entities;
using EnterpriseAps.Domain.Graph;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace EnterpriseAps.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task InitializeAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApsDbContext>();
        var graph = scope.ServiceProvider.GetRequiredService<IScheduleGraph>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<ApsDbContext>>();

        try
        {
            logger.LogInformation("Ensuring PostgreSQL database and tables are created...");
            await context.Database.EnsureCreatedAsync();

            var resourceCount = await context.Resources.CountAsync();
            if (resourceCount == 0)
            {
                logger.LogInformation("Database is empty. Seeding initial industrial APS master data...");
                var (resources, workOrders, operations, setupMatrices, downtimes) = SeedDemoDataCommandHandler.GenerateIndustrialDemoData();

                await context.Resources.AddRangeAsync(resources);
                await context.WorkOrders.AddRangeAsync(workOrders);
                await context.Operations.AddRangeAsync(operations);
                await context.SetupMatrices.AddRangeAsync(setupMatrices);
                await context.ResourceDowntimes.AddRangeAsync(downtimes);
                var defaultShifts = ShiftSchedule.GetDefaultThreeShifts();
                await context.ShiftSchedules.AddRangeAsync(defaultShifts);
                await context.SaveChangesAsync();

                logger.LogInformation("Master data successfully seeded into PostgreSQL. Initializing in-memory DAG...");
                graph.Initialize(resources, workOrders, operations, setupMatrices, downtimes, defaultShifts);
            }
            else
            {
                var shiftCount = await context.ShiftSchedules.CountAsync();
                if (shiftCount == 0)
                {
                    await context.ShiftSchedules.AddRangeAsync(ShiftSchedule.GetDefaultThreeShifts());
                    await context.SaveChangesAsync();
                }

                logger.LogInformation("Loading master schedule data from PostgreSQL into In-Memory Graph Engine...");
                var resources = await context.Resources.ToListAsync();
                var workOrders = await context.WorkOrders.ToListAsync();
                var operations = await context.Operations.ToListAsync();
                var setupMatrices = await context.SetupMatrices.ToListAsync();
                var downtimes = await context.ResourceDowntimes.ToListAsync();
                var shifts = await context.ShiftSchedules.ToListAsync();

                graph.Initialize(resources, workOrders, operations, setupMatrices, downtimes, shifts);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while initializing the database and in-memory graph.");
            var (resources, workOrders, operations, setupMatrices, downtimes) = SeedDemoDataCommandHandler.GenerateIndustrialDemoData();
            graph.Initialize(resources, workOrders, operations, setupMatrices, downtimes, ShiftSchedule.GetDefaultThreeShifts());
        }
    }
}
