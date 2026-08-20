using EnterpriseAps.Api.Hubs;
using EnterpriseAps.Api.Middleware;
using EnterpriseAps.Api.Services;
using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.CQRS.Commands;
using EnterpriseAps.Domain.Graph;
using EnterpriseAps.Infrastructure.Persistence;
using EnterpriseAps.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// 1. Configure Logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// 2. Database (PostgreSQL / TimescaleDB)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=postgres;Port=5432;Database=aps_db;Username=postgres;Password=postgres;Include Error Detail=true";

builder.Services.AddDbContext<ApsDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(5), errorCodesToAdd: null);
    });
});

builder.Services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApsDbContext>());

// 3. Redis Distributed Connection
var redisConnectionString = builder.Configuration.GetValue<string>("Redis:ConnectionString") ?? "redis:6379";
IConnectionMultiplexer? redisMultiplexer = null;

try
{
    var config = ConfigurationOptions.Parse(redisConnectionString);
    config.AbortOnConnectFail = false;
    config.ConnectTimeout = 3000;
    redisMultiplexer = ConnectionMultiplexer.Connect(config);
    builder.Services.AddSingleton<IConnectionMultiplexer>(redisMultiplexer);
    Console.WriteLine($"[APS Engine] Connected to Redis cluster at {redisConnectionString}");
}
catch (Exception ex)
{
    Console.WriteLine($"[APS Engine] Redis connection unavailable ({ex.Message}). Operating with fast in-memory fallback.");
}

// 4. Register Services & CQRS
builder.Services.AddSingleton<IScheduleGraph, ScheduleGraph>();
builder.Services.AddSingleton<IRedisLockService, RedisLockService>();
builder.Services.AddScoped<ISchedulingHubClient, SchedulingHubClientProxy>();

builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(RescheduleOperationCommand).Assembly);
});

// 5. SignalR Real-Time Engine
var signalrBuilder = builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
    options.KeepAliveInterval = TimeSpan.FromSeconds(10);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
});

if (redisMultiplexer != null && redisMultiplexer.IsConnected)
{
    signalrBuilder.AddStackExchangeRedis(redisConnectionString, options =>
    {
        options.Configuration.ChannelPrefix = RedisChannel.Literal("EnterpriseAps");
    });
}

// 6. CORS Policy for Frontend Workstation
builder.Services.AddCors(options =>
{
    options.AddPolicy("ApsClientPolicy", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// 7. Pipeline Configuration
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Enterprise APS API v1");
    });
}

app.UseCors("ApsClientPolicy");
app.UseRouting();
app.UseAuthorization();

app.MapControllers();
app.MapHub<SchedulingHub>("/hubs/scheduling");

// 8. Auto-Initialize Database & In-Memory Graph on Startup
try
{
    await DbInitializer.InitializeAsync(app.Services);
}
catch (Exception ex)
{
    Console.WriteLine($"[APS Engine] Warning during DB initialization: {ex.Message}");
}

Console.WriteLine("[APS Engine] Enterprise Advanced Planning and Scheduling API is active.");
app.Run();
