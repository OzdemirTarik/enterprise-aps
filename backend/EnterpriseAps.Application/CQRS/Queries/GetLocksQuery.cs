using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using MediatR;

namespace EnterpriseAps.Application.CQRS.Queries;

public record GetLocksQuery : IRequest<List<LockInfoDto>>;

public class GetLocksQueryHandler : IRequestHandler<GetLocksQuery, List<LockInfoDto>>
{
    private readonly IRedisLockService _redisLockService;

    public GetLocksQueryHandler(IRedisLockService redisLockService)
    {
        _redisLockService = redisLockService;
    }

    public async Task<List<LockInfoDto>> Handle(GetLocksQuery request, CancellationToken cancellationToken)
    {
        var locks = await _redisLockService.GetAllLocksAsync();
        return locks.Select(l => new LockInfoDto
        {
            ResourceId = l.ResourceId,
            LockedByUserId = l.LockedByUserId,
            LockedByUserName = l.LockedByUserName,
            UserColor = l.UserColor,
            AcquiredAt = l.AcquiredAt,
            ExpiresAt = l.ExpiresAt
        }).ToList();
    }
}
