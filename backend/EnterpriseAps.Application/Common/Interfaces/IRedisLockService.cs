using EnterpriseAps.Domain.Entities;

namespace EnterpriseAps.Application.Common.Interfaces;

public interface IRedisLockService
{
    Task<bool> AcquireLockAsync(string resourceId, string userId, string userName, string userColor, TimeSpan? expiry = null);
    Task<bool> ReleaseLockAsync(string resourceId, string userId);
    Task<LockInfo?> GetLockAsync(string resourceId);
    Task<IReadOnlyList<LockInfo>> GetAllLocksAsync();
    Task<bool> ExtendLockAsync(string resourceId, string userId, TimeSpan extension);
}
