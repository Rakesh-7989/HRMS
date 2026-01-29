-- ===================================================================
-- SHIFT MANAGEMENT & BREAK TRACKING
-- ===================================================================

-- 1. Create SHIFTS table
CREATE TABLE shifts (
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

-- 2. Add shift_id to EMPLOYEES
ALTER TABLE employees 
ADD COLUMN shift_id UUID REFERENCES shifts(id);

-- 3. ATTENDANCE BREAKS (To track actual breaks taken)
CREATE TABLE attendance_breaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
    
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    
    duration_minutes INTEGER, -- Calculated on completion
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attendance_breaks_attendance ON attendance_breaks(attendance_id);
