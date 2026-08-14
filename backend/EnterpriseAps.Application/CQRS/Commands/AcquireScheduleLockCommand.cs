using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using MediatR;

namespace EnterpriseAps.Application.CQRS.Commands;

public record AcquireScheduleLockCommand(
    string ResourceId,
    string UserId,
    string UserName,
    string UserColor
) : IRequest<LockInfoDto?>;

public class AcquireScheduleLockCommandHandler : IRequestHandler<AcquireScheduleLockCommand, LockInfoDto?>
{
    private readonly IRedisLockService _redisLockService;
    private readonly ISchedulingHubClient _hub;

    public AcquireScheduleLockCommandHandler(IRedisLockService redisLockService, ISchedulingHubClient hub)
    {
        _redisLockService = redisLockService;
        _hub = hub;
    }

    public async Task<LockInfoDto?> Handle(AcquireScheduleLockCommand request, CancellationToken cancellationToken)
    {
        var acquired = await _redisLockService.AcquireLockAsync(
            request.ResourceId,
            request.UserId,
            request.UserName,
            request.UserColor,
            TimeSpan.FromMinutes(3));

        if (!acquired)
        {
            return null;
        }

        var lockInfo = await _redisLockService.GetLockAsync(request.ResourceId);
        if (lockInfo == null) return null;

        var dto = new LockInfoDto
        {
            ResourceId = lockInfo.ResourceId,
            LockedByUserId = lockInfo.LockedByUserId,
            LockedByUserName = lockInfo.LockedByUserName,
            UserColor = lockInfo.UserColor,
            AcquiredAt = lockInfo.AcquiredAt,
            ExpiresAt = lockInfo.ExpiresAt
        };

        // Broadcast lock state to all SignalR clients
        await _hub.OnResourceLocked(dto);

        return dto;
    }
}
