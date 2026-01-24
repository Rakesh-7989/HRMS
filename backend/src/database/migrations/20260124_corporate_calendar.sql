-- Corporate Calendar Module Migration
-- Date: 2026-01-24

-- 1. Base Calendar Table (Central Government Holidays + Weekends)
CREATE TABLE IF NOT EXISTS base_calendar (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    day VARCHAR(10) NOT NULL,
    is_weekend VARCHAR(3) NOT NULL DEFAULT 'No',
    holiday_name VARCHAR(255),
    holiday_type VARCHAR(50) -- 'Weekend', 'Central', or NULL
);

-- 2. State-Specific Holidays Table
CREATE TABLE IF NOT EXISTS state_holidays (
    id SERIAL PRIMARY KEY,
    state VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    holiday_name VARCHAR(255) NOT NULL,
    UNIQUE(state, date)
);

-- 3. Custom Company Holidays Table
CREATE TABLE IF NOT EXISTS company_holidays (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    date DATE NOT NULL,
    holiday_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, date)
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_base_calendar_date ON base_calendar(date);
CREATE INDEX IF NOT EXISTS idx_state_holidays_state ON state_holidays(state);
CREATE INDEX IF NOT EXISTS idx_company_holidays_tenant ON company_holidays(tenant_id);

-- 4. Dynamic Announcements Table
CREATE TABLE IF NOT EXISTS corporate_announcements (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'General', -- 'Holiday', 'Event', 'General'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_announcements_tenant ON corporate_announcements(tenant_id);
