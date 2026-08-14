using System.Collections.Concurrent;
using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.CQRS.Commands;
using EnterpriseAps.Application.DTOs;
using MediatR;
using Microsoft.AspNetCore.SignalR;

namespace EnterpriseAps.Api.Hubs;

public class SchedulingHub : Hub<ISchedulingHubClient>
{
    private readonly IMediator _mediator;
    private readonly ILogger<SchedulingHub> _logger;
    private static readonly ConcurrentDictionary<string, UserPresenceDto> ConnectedUsers = new();

    public SchedulingHub(IMediator mediator, ILogger<SchedulingHub> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("SignalR Client connected: {ConnectionId}", Context.ConnectionId);
        await Groups.AddToGroupAsync(Context.ConnectionId, "APS_CLUSTER");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("SignalR Client disconnected: {ConnectionId}", Context.ConnectionId);
        if (ConnectedUsers.TryRemove(Context.ConnectionId, out var removedUser))
        {
            // Auto release any locks held if needed or notify peers
            await Clients.Others.OnUserPresence(new UserPresenceDto
            {
                ConnectionId = Context.ConnectionId,
                UserId = removedUser.UserId,
                UserName = removedUser.UserName,
                UserColor = removedUser.UserColor,
                ActiveResourceId = null
            });
        }
        await base.OnDisconnectedAsync(exception);
    }

    public async Task RegisterPresence(string userId, string userName, string userColor, string? activeResourceId)
    {
        var presence = new UserPresenceDto
        {
            ConnectionId = Context.ConnectionId,
            UserId = userId,
            UserName = userName,
            UserColor = userColor,
            ActiveResourceId = activeResourceId,
            ConnectedAt = DateTime.UtcNow
        };

        ConnectedUsers[Context.ConnectionId] = presence;
        await Clients.Others.OnUserPresence(presence);
    }

    public async Task<ScheduleDeltaDto> RescheduleOperation(RescheduleOperationCommand command)
    {
        _logger.LogInformation("Hub receiving RescheduleOperation command for Op: {OpId}", command.OperationId);
        return await _mediator.Send(command);
    }

    public async Task<LockInfoDto?> AcquireResourceLock(string resourceId, string userId, string userName, string userColor)
    {
        _logger.LogInformation("Hub AcquireResourceLock: Resource {ResourceId} by {User}", resourceId, userName);
        return await _mediator.Send(new AcquireScheduleLockCommand(resourceId, userId, userName, userColor));
    }

    public async Task<bool> ReleaseResourceLock(string resourceId, string userId)
    {
        _logger.LogInformation("Hub ReleaseResourceLock: Resource {ResourceId} by {User}", resourceId, userId);
        return await _mediator.Send(new ReleaseScheduleLockCommand(resourceId, userId));
    }
}
