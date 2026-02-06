-- ===================================================================
-- SHIFT MANAGEMENT & BREAK TRACKING (IDEMPOTENT & ROBUST)
-- ===================================================================

-- 1. Create SHIFTS table if not exists
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20), -- e.g. GEN, MOR, EVE
    description TEXT,
    
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    break_start_time TIME,
    break_end_time TIME,
    
    grace_period_minutes INTEGER DEFAULT 0, -- Late coming allowed
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    UNIQUE(tenant_id, name)
);

-- 2. Add missing columns to SHIFTS (if table already existed)
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS break_start_time TIME;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS break_end_time TIME;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS grace_period_minutes INTEGER DEFAULT 0;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS updated_by UUID;

-- 3. Add shift_id to EMPLOYEES
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='shift_id') THEN
        ALTER TABLE employees ADD COLUMN shift_id UUID REFERENCES shifts(id);
    END IF;
END $$;

-- 4. Create ATTENDANCE_BREAKS table if not exists
CREATE TABLE IF NOT EXISTS attendance_breaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
    
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    
    duration_minutes INTEGER, -- Calculated on completion
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Fix column names and missing columns in ATTENDANCE_BREAKS (if table already existed)
DO $$ 
BEGIN 
    -- Rename 'duration' to 'duration_minutes' if 'duration' exists and 'duration_minutes' does not
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_breaks' AND column_name='duration') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_breaks' AND column_name='duration_minutes') THEN
        ALTER TABLE attendance_breaks RENAME COLUMN duration TO duration_minutes;
    END IF;

    -- Add duration_minutes if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_breaks' AND column_name='duration_minutes') THEN
        ALTER TABLE attendance_breaks ADD COLUMN duration_minutes INTEGER;
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_breaks' AND column_name='updated_at') THEN
        ALTER TABLE attendance_breaks ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- 6. Ensure index exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_attendance_breaks_attendance') THEN
        CREATE INDEX idx_attendance_breaks_attendance ON attendance_breaks(attendance_id);
    END IF;
END $$;
