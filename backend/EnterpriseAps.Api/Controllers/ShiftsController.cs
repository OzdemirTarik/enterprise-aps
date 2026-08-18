using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Application.DTOs;
using EnterpriseAps.Domain.Entities;
using EnterpriseAps.Domain.Graph;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseAps.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ShiftsController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly ISchedulingHubClient _hubClient;
    private readonly IScheduleGraph _graph;

    public ShiftsController(IApplicationDbContext context, ISchedulingHubClient hubClient, IScheduleGraph graph)
    {
        _context = context;
        _hubClient = hubClient;
        _graph = graph;
    }

    [HttpGet]
    public async Task<ActionResult<List<ShiftScheduleDto>>> GetShifts(CancellationToken cancellationToken)
    {
        var shifts = await _context.ShiftSchedules.OrderBy(s => s.DisplayOrder).ToListAsync(cancellationToken);
        if (!shifts.Any())
        {
            shifts = ShiftSchedule.GetDefaultThreeShifts();
            await _context.ShiftSchedules.AddRangeAsync(shifts, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            _graph.UpdateShifts(shifts);
        }

        return Ok(shifts.Select(MapToDto).ToList());
    }

    [HttpPut("pattern")]
    public async Task<ActionResult<List<ShiftScheduleDto>>> UpdateShiftPattern(
        [FromBody] UpdateShiftPatternRequest request,
        CancellationToken cancellationToken)
    {
        // Replace all current shifts with the new pattern
        var existing = await _context.ShiftSchedules.ToListAsync(cancellationToken);
        _context.ShiftSchedules.RemoveRange(existing);

        var newEntities = request.Shifts.Select((s, idx) => new ShiftSchedule
        {
            Id = string.IsNullOrWhiteSpace(s.Id) ? $"SHIFT-{Guid.NewGuid().ToString("N")[..6].ToUpper()}" : s.Id,
            Name = s.Name,
            StartTime = s.StartTime,
            EndTime = s.EndTime,
            DaysOfWeek = s.DaysOfWeek != null && s.DaysOfWeek.Any() ? s.DaysOfWeek : new List<int> { 1, 2, 3, 4, 5, 6, 7 },
            ColorCode = string.IsNullOrWhiteSpace(s.ColorCode) ? "#06b6d4" : s.ColorCode,
            IsActive = s.IsActive,
            DisplayOrder = idx + 1,
            CreatedAt = DateTime.UtcNow
        }).ToList();

        await _context.ShiftSchedules.AddRangeAsync(newEntities, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        _graph.UpdateShifts(newEntities);

        var dtos = newEntities.Select(MapToDto).ToList();
        await _hubClient.OnShiftsUpdated(dtos);

        return Ok(dtos);
    }

    [HttpPost]
    public async Task<ActionResult<ShiftScheduleDto>> CreateShift(
        [FromBody] ShiftScheduleDto dto,
        CancellationToken cancellationToken)
    {
        var shift = new ShiftSchedule
        {
            Id = string.IsNullOrWhiteSpace(dto.Id) ? $"SHIFT-{Guid.NewGuid().ToString("N")[..6].ToUpper()}" : dto.Id,
            Name = dto.Name,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            DaysOfWeek = dto.DaysOfWeek != null && dto.DaysOfWeek.Any() ? dto.DaysOfWeek : new List<int> { 1, 2, 3, 4, 5, 6, 7 },
            ColorCode = dto.ColorCode,
            IsActive = dto.IsActive,
            DisplayOrder = dto.DisplayOrder,
            CreatedAt = DateTime.UtcNow
        };

        await _context.ShiftSchedules.AddAsync(shift, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        var allShifts = await _context.ShiftSchedules.OrderBy(s => s.DisplayOrder).ToListAsync(cancellationToken);
        _graph.UpdateShifts(allShifts);
        await _hubClient.OnShiftsUpdated(allShifts.Select(MapToDto).ToList());

        return CreatedAtAction(nameof(GetShifts), new { id = shift.Id }, MapToDto(shift));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteShift(string id, CancellationToken cancellationToken)
    {
        var shift = await _context.ShiftSchedules.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (shift == null) return NotFound();

        _context.ShiftSchedules.Remove(shift);
        await _context.SaveChangesAsync(cancellationToken);

        var allShifts = await _context.ShiftSchedules.OrderBy(s => s.DisplayOrder).ToListAsync(cancellationToken);
        _graph.UpdateShifts(allShifts);
        await _hubClient.OnShiftsUpdated(allShifts.Select(MapToDto).ToList());

        return NoContent();
    }

    private static ShiftScheduleDto MapToDto(ShiftSchedule entity) => new()
    {
        Id = entity.Id,
        Name = entity.Name,
        StartTime = entity.StartTime,
        EndTime = entity.EndTime,
        DaysOfWeek = entity.DaysOfWeek,
        ColorCode = entity.ColorCode,
        IsActive = entity.IsActive,
        DisplayOrder = entity.DisplayOrder
    };

    public static List<ShiftSchedule> GetDefaultThreeShifts() => new()
    {
        new()
        {
            Id = "SHIFT-01",
            Name = "1. Vardiya (Gündüz / 08:00 - 16:00)",
            StartTime = "08:00",
            EndTime = "16:00",
            DaysOfWeek = new() { 1, 2, 3, 4, 5, 6, 7 },
            ColorCode = "#06b6d4",
            IsActive = true,
            DisplayOrder = 1
        },
        new()
        {
            Id = "SHIFT-02",
            Name = "2. Vardiya (Akşam / 16:00 - 00:00)",
            StartTime = "16:00",
            EndTime = "00:00",
            DaysOfWeek = new() { 1, 2, 3, 4, 5, 6, 7 },
            ColorCode = "#f59e0b",
            IsActive = true,
            DisplayOrder = 2
        },
        new()
        {
            Id = "SHIFT-03",
            Name = "3. Vardiya (Gece / 00:00 - 08:00)",
            StartTime = "00:00",
            EndTime = "08:00",
            DaysOfWeek = new() { 1, 2, 3, 4, 5, 6, 7 },
            ColorCode = "#8b5cf6",
            IsActive = true,
            DisplayOrder = 3
        }
    };
}
