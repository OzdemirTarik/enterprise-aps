using EnterpriseAps.Application.Common.Interfaces;
using MediatR;

namespace EnterpriseAps.Application.CQRS.Commands;

public record ReleaseScheduleLockCommand(
    string ResourceId,
    string UserId
) : IRequest<bool>;

public class ReleaseScheduleLockCommandHandler : IRequestHandler<ReleaseScheduleLockCommand, bool>
{
    private readonly IRedisLockService _redisLockService;
    private readonly ISchedulingHubClient _hub;

    public ReleaseScheduleLockCommandHandler(IRedisLockService redisLockService, ISchedulingHubClient hub)
    {
        _redisLockService = redisLockService;
        _hub = hub;
    }

    public async Task<bool> Handle(ReleaseScheduleLockCommand request, CancellationToken cancellationToken)
    {
        var released = await _redisLockService.ReleaseLockAsync(request.ResourceId, request.UserId);
        if (released)
        {
            await _hub.OnResourceUnlocked(request.ResourceId);
        }
        return released;
    }
}
