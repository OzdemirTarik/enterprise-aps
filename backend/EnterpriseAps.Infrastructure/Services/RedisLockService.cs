using System.Text.Json;
using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Domain.Entities;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace EnterpriseAps.Infrastructure.Services;

public class RedisLockService : IRedisLockService
{
    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<RedisLockService> _logger;
    private readonly System.Collections.Concurrent.ConcurrentDictionary<string, LockInfo> _inMemoryLocksFallback = new();
    private const string LockKeyPrefix = "aps:lock:resource:";

    public RedisLockService(ILogger<RedisLockService> logger, IConnectionMultiplexer? redis = null)
    {
        _logger = logger;
        _redis = redis;
    }

    public async Task<bool> AcquireLockAsync(
        string resourceId,
        string userId,
        string userName,
        string userColor,
        TimeSpan? expiry = null)
    {
        var ttl = expiry ?? TimeSpan.FromMinutes(3);
        var lockInfo = new LockInfo
        {
            ResourceId = resourceId,
            LockedByUserId = userId,
            LockedByUserName = userName,
            UserColor = userColor,
            AcquiredAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.Add(ttl)
        };

        if (_redis != null && _redis.IsConnected)
        {
            try
            {
                var db = _redis.GetDatabase();
                var key = $"{LockKeyPrefix}{resourceId}";
                var json = JsonSerializer.Serialize(lockInfo);

                // Use SET with NX (Not Exists) or overwrite if same user
                var existingJson = await db.StringGetAsync(key);
                if (existingJson.HasValue)
                {
                    var existing = JsonSerializer.Deserialize<LockInfo>(existingJson.ToString());
                    if (existing != null && existing.LockedByUserId != userId && !existing.IsExpired)
                    {
                        return false; // Locked by someone else
                    }
                }

                return await db.StringSetAsync(key, json, ttl);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis error during AcquireLock. Falling back to in-memory locks.");
            }
        }

        // In-memory fallback
        _inMemoryLocksFallback.AddOrUpdate(
            resourceId,
            lockInfo,
            (k, old) => old.LockedByUserId == userId || old.IsExpired ? lockInfo : old);

        return _inMemoryLocksFallback.TryGetValue(resourceId, out var current) && current.LockedByUserId == userId;
    }

    public async Task<bool> ReleaseLockAsync(string resourceId, string userId)
    {
        if (_redis != null && _redis.IsConnected)
        {
            try
            {
                var db = _redis.GetDatabase();
                var key = $"{LockKeyPrefix}{resourceId}";
                var existingJson = await db.StringGetAsync(key);
                if (existingJson.HasValue)
                {
                    var existing = JsonSerializer.Deserialize<LockInfo>(existingJson.ToString());
                    if (existing != null && existing.LockedByUserId == userId)
                    {
                        return await db.KeyDeleteAsync(key);
                    }
                }
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis error during ReleaseLock. Falling back to in-memory locks.");
            }
        }

        if (_inMemoryLocksFallback.TryGetValue(resourceId, out var lockInfo) && lockInfo.LockedByUserId == userId)
        {
            return _inMemoryLocksFallback.TryRemove(resourceId, out _);
        }

        return false;
    }

    public async Task<LockInfo?> GetLockAsync(string resourceId)
    {
        if (_redis != null && _redis.IsConnected)
        {
            try
            {
                var db = _redis.GetDatabase();
                var key = $"{LockKeyPrefix}{resourceId}";
                var json = await db.StringGetAsync(key);
                if (json.HasValue)
                {
                    var lockInfo = JsonSerializer.Deserialize<LockInfo>(json.ToString());
                    if (lockInfo != null && !lockInfo.IsExpired)
                    {
                        return lockInfo;
                    }
                }
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis error during GetLock. Falling back to in-memory locks.");
            }
        }

        if (_inMemoryLocksFallback.TryGetValue(resourceId, out var inMem) && !inMem.IsExpired)
        {
            return inMem;
        }

        return null;
    }

    public async Task<IReadOnlyList<LockInfo>> GetAllLocksAsync()
    {
        var result = new List<LockInfo>();

        if (_redis != null && _redis.IsConnected)
        {
            try
            {
                var server = _redis.GetServer(_redis.GetEndPoints().First());
                var db = _redis.GetDatabase();
                var keys = server.Keys(pattern: $"{LockKeyPrefix}*").ToArray();

                foreach (var key in keys)
                {
                    var json = await db.StringGetAsync(key);
                    if (json.HasValue)
                    {
                        var lockInfo = JsonSerializer.Deserialize<LockInfo>(json.ToString());
                        if (lockInfo != null && !lockInfo.IsExpired)
                        {
                            result.Add(lockInfo);
                        }
                    }
                }
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis error during GetAllLocks. Falling back to in-memory locks.");
            }
        }

        // Clean expired in-memory
        foreach (var kvp in _inMemoryLocksFallback)
        {
            if (kvp.Value.IsExpired)
            {
                _inMemoryLocksFallback.TryRemove(kvp.Key, out _);
            }
            else
            {
                result.Add(kvp.Value);
            }
        }

        return result;
    }

    public async Task<bool> ExtendLockAsync(string resourceId, string userId, TimeSpan extension)
    {
        return await AcquireLockAsync(resourceId, userId, "User", "#3b82f6", extension);
    }
}
