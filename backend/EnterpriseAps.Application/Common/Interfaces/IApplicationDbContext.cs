using EnterpriseAps.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseAps.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Resource> Resources { get; }
    DbSet<WorkOrder> WorkOrders { get; }
    DbSet<Operation> Operations { get; }
    DbSet<SetupMatrixItem> SetupMatrices { get; }
    DbSet<Constraint> Constraints { get; }
    DbSet<ResourceDowntime> ResourceDowntimes { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
