-- Enterprise APS PostgreSQL Schema Setup

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Resources (Machines, Work Centers, Cells)
CREATE TABLE IF NOT EXISTS resources (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    capacity DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    working_hours_per_day DOUBLE PRECISION NOT NULL DEFAULT 16.0,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 150.00,
    color_hex VARCHAR(20) NOT NULL DEFAULT '#3b82f6',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Work Orders
CREATE TABLE IF NOT EXISTS work_orders (
    id VARCHAR(50) PRIMARY KEY,
    order_number VARCHAR(100) NOT NULL UNIQUE,
    customer_name VARCHAR(150),
    product_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    release_date TIMESTAMP WITH TIME ZONE NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    priority INTEGER NOT NULL DEFAULT 2,
    status VARCHAR(50) NOT NULL DEFAULT 'Planned',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Operations (Tasks assigned to resources)
CREATE TABLE IF NOT EXISTS operations (
    id VARCHAR(50) PRIMARY KEY,
    work_order_id VARCHAR(50) NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    sequence_index INTEGER NOT NULL,
    name VARCHAR(150) NOT NULL,
    product_type VARCHAR(50) NOT NULL,
    required_resource_id VARCHAR(50) NOT NULL REFERENCES resources(id),
    duration_minutes INTEGER NOT NULL,
    setup_duration_minutes INTEGER NOT NULL DEFAULT 0,
    planned_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    planned_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'Planned',
    color_code VARCHAR(20) DEFAULT '#38bdf8',
    is_locked BOOLEAN DEFAULT FALSE,
    precedence_operation_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Setup Matrix (Sequence-dependent setup times)
CREATE TABLE IF NOT EXISTS setup_matrices (
    id SERIAL PRIMARY KEY,
    resource_id VARCHAR(50) REFERENCES resources(id) ON DELETE CASCADE,
    from_product_type VARCHAR(50) NOT NULL,
    to_product_type VARCHAR(50) NOT NULL,
    setup_minutes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_setup_matrix UNIQUE (resource_id, from_product_type, to_product_type)
);

-- Resource Downtimes & Maintenance
CREATE TABLE IF NOT EXISTS resource_downtimes (
    id VARCHAR(50) PRIMARY KEY,
    resource_id VARCHAR(50) NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    reason VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_planned BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Shift Schedules (Working shifts: 1, 2, 3 shifts, customizable hours & days)
CREATE TABLE IF NOT EXISTS shift_schedules (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    days_of_week INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
    color_code VARCHAR(20) DEFAULT '#06b6d4',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schedule Snapshots (For schedule versioning / audit)
CREATE TABLE IF NOT EXISTS schedule_snapshots (
    id VARCHAR(50) PRIMARY KEY,
    snapshot_name VARCHAR(150) NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    payload_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-throughput lookups
CREATE INDEX IF NOT EXISTS idx_ops_resource ON operations(required_resource_id, planned_start_time);
CREATE INDEX IF NOT EXISTS idx_ops_workorder ON operations(work_order_id);
CREATE INDEX IF NOT EXISTS idx_workorders_due_date ON work_orders(due_date);
CREATE INDEX IF NOT EXISTS idx_downtimes_resource ON resource_downtimes(resource_id, start_time);
