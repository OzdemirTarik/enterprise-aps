using EnterpriseAps.Application.Common.Interfaces;
using EnterpriseAps.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EnterpriseAps.Infrastructure.Persistence;

public class ApsDbContext : DbContext, IApplicationDbContext
{
    public ApsDbContext(DbContextOptions<ApsDbContext> options) : base(options)
    {
    }

    public DbSet<Resource> Resources => Set<Resource>();
    public DbSet<WorkOrder> WorkOrders => Set<WorkOrder>();
    public DbSet<Operation> Operations => Set<Operation>();
    public DbSet<SetupMatrixItem> SetupMatrices => Set<SetupMatrixItem>();
    public DbSet<Constraint> Constraints => Set<Constraint>();
    public DbSet<ResourceDowntime> ResourceDowntimes => Set<ResourceDowntime>();
    public DbSet<ShiftSchedule> ShiftSchedules => Set<ShiftSchedule>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Resource>(entity =>
        {
            entity.ToTable("resources");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasMaxLength(50);
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Type).HasColumnName("type").HasConversion<string>();
            entity.Property(e => e.Capacity).HasColumnName("capacity").HasDefaultValue(1.0);
            entity.Property(e => e.WorkingHoursPerDay).HasColumnName("working_hours_per_day").HasDefaultValue(16.0);
            entity.Property(e => e.HourlyRate).HasColumnName("hourly_rate").HasColumnType("numeric(10,2)");
            entity.Property(e => e.ColorHex).HasColumnName("color_hex").HasMaxLength(20);
            entity.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<WorkOrder>(entity =>
        {
            entity.ToTable("work_orders");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasMaxLength(50);
            entity.Property(e => e.OrderNumber).HasColumnName("order_number").HasMaxLength(100).IsRequired();
            entity.Property(e => e.CustomerName).HasColumnName("customer_name").HasMaxLength(150);
            entity.Property(e => e.ProductCode).HasColumnName("product_code").HasMaxLength(100).IsRequired();
            entity.Property(e => e.ProductName).HasColumnName("product_name").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.ReleaseDate).HasColumnName("release_date");
            entity.Property(e => e.DueDate).HasColumnName("due_date");
            entity.Property(e => e.Priority).HasColumnName("priority");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<Operation>(entity =>
        {
            entity.ToTable("operations");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasMaxLength(50);
            entity.Property(e => e.WorkOrderId).HasColumnName("work_order_id").HasMaxLength(50).IsRequired();
            entity.Property(e => e.SequenceIndex).HasColumnName("sequence_index");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(e => e.ProductType).HasColumnName("product_type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.RequiredResourceId).HasColumnName("required_resource_id").HasMaxLength(50).IsRequired();
            entity.Property(e => e.DurationMinutes).HasColumnName("duration_minutes");
            entity.Property(e => e.SetupDurationMinutes).HasColumnName("setup_duration_minutes");
            entity.Property(e => e.PlannedStartTime).HasColumnName("planned_start_time");
            entity.Property(e => e.PlannedEndTime).HasColumnName("planned_end_time");
            entity.Property(e => e.ActualStartTime).HasColumnName("actual_start_time");
            entity.Property(e => e.ActualEndTime).HasColumnName("actual_end_time");
            entity.Property(e => e.Status).HasColumnName("status").HasConversion<string>();
            entity.Property(e => e.ColorCode).HasColumnName("color_code").HasMaxLength(20).HasDefaultValue("#38bdf8");
            entity.Property(e => e.IsLocked).HasColumnName("is_locked").HasDefaultValue(false);
            entity.Property(e => e.PrecedenceOperationIds).HasColumnName("precedence_operation_ids");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<SetupMatrixItem>(entity =>
        {
            entity.ToTable("setup_matrices");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ResourceId).HasColumnName("resource_id");
            entity.Property(e => e.FromProductType).HasColumnName("from_product_type").HasMaxLength(50);
            entity.Property(e => e.ToProductType).HasColumnName("to_product_type").HasMaxLength(50);
            entity.Property(e => e.SetupMinutes).HasColumnName("setup_minutes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<Constraint>(entity =>
        {
            entity.ToTable("constraints");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Type).HasColumnName("type").HasConversion<string>();
            entity.Property(e => e.TargetOperationId).HasColumnName("target_operation_id");
            entity.Property(e => e.ResourceId).HasColumnName("resource_id");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.TimeWindowStart).HasColumnName("time_window_start");
            entity.Property(e => e.TimeWindowEnd).HasColumnName("time_window_end");
        });

        modelBuilder.Entity<ResourceDowntime>(entity =>
        {
            entity.ToTable("resource_downtimes");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasMaxLength(50);
            entity.Property(e => e.ResourceId).HasColumnName("resource_id").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Reason).HasColumnName("reason").HasMaxLength(255).IsRequired();
            entity.Property(e => e.StartTime).HasColumnName("start_time");
            entity.Property(e => e.EndTime).HasColumnName("end_time");
            entity.Property(e => e.IsPlanned).HasColumnName("is_planned").HasDefaultValue(true);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<ShiftSchedule>(entity =>
        {
            entity.ToTable("shift_schedules");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasMaxLength(50);
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.StartTime).HasColumnName("start_time").HasMaxLength(10).IsRequired();
            entity.Property(e => e.EndTime).HasColumnName("end_time").HasMaxLength(10).IsRequired();
            entity.Property(e => e.DaysOfWeek).HasColumnName("days_of_week");
            entity.Property(e => e.ColorCode).HasColumnName("color_code").HasMaxLength(20).HasDefaultValue("#06b6d4");
            entity.Property(e => e.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            entity.Property(e => e.DisplayOrder).HasColumnName("display_order").HasDefaultValue(1);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });
    }
}
