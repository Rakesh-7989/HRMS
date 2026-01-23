-- ===================================================================
-- LEAVE TRACKER MODULE - DATABASE MIGRATION
-- Created: 2026-01-06
-- US-Only deployment (no multi-location support)
-- ===================================================================

-- ===================================================================
-- 1. LEAVE TYPES (Customizable per tenant)
-- ===================================================================
CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,           -- e.g., 'Sick Leave', 'PTO', 'Vacation'
    code VARCHAR(20) NOT NULL,            -- e.g., 'SICK', 'PTO', 'VAC'
    description TEXT,
    
    is_paid BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT TRUE,
    requires_attachment BOOLEAN DEFAULT FALSE,
    min_days_notice INTEGER DEFAULT 0,    -- Days in advance to apply
    max_consecutive_days INTEGER,         -- Max days in one request (NULL = unlimited)
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS leave_types_tenant_code ON leave_types(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_leave_types_tenant ON leave_types(tenant_id);

-- ===================================================================
-- 2. LEAVE POLICIES (Accrual rules per role/employment type)
-- ===================================================================
CREATE TABLE IF NOT EXISTS leave_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,           -- Policy name
    description TEXT,
    
    -- Eligibility criteria
    applicable_roles TEXT[],              -- ['EMPLOYEE', 'MANAGER'] or NULL for all
    employment_types TEXT[],              -- ['FULL_TIME', 'CONTRACT'] or NULL for all
    is_probation_eligible BOOLEAN DEFAULT FALSE,
    min_tenure_months INTEGER DEFAULT 0,  -- Min months before eligible
    
    -- Accrual settings
    accrual_type VARCHAR(20) DEFAULT 'MONTHLY',  -- MONTHLY, YEARLY, FIXED
    accrual_rate NUMERIC(5,2) DEFAULT 0,  -- Leaves per accrual period (e.g., 1.5/month)
    max_balance NUMERIC(5,2),             -- Maximum accumulation (NULL = unlimited)
    
    -- Year/period settings
    year_start_month INTEGER DEFAULT 1,   -- 1=January (for fiscal year)
    
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 100,         -- Lower = higher priority for matching
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_leave_policies_tenant ON leave_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leave_policies_type ON leave_policies(leave_type_id);

-- ===================================================================
-- 3. EMPLOYEE POLICY OVERRIDES (Optional per-employee policy)
-- ===================================================================
CREATE TABLE IF NOT EXISTS employee_leave_policy_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES leave_policies(id) ON DELETE CASCADE,
    
    reason TEXT,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,                    -- NULL = indefinite
    
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,
    
    UNIQUE(tenant_id, employee_id, leave_type_id)
);

-- ===================================================================
-- 4. LEAVE BALANCES (Per employee per leave type)
-- ===================================================================
CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    
    year INTEGER NOT NULL,                -- Leave year
    
    opening_balance NUMERIC(6,2) DEFAULT 0,
    accrued NUMERIC(6,2) DEFAULT 0,       -- Total accrued this year
    used NUMERIC(6,2) DEFAULT 0,          -- Total used this year
    adjusted NUMERIC(6,2) DEFAULT 0,      -- Manual adjustments (+ or -)
    
    -- Calculated: opening + accrued - used + adjusted
    current_balance NUMERIC(6,2) GENERATED ALWAYS AS 
        (opening_balance + accrued - used + adjusted) STORED,
    
    last_accrual_date DATE,
    accrual_start_date DATE,              -- For reset functionality
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(tenant_id, employee_id, leave_type_id, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON leave_balances(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(tenant_id, year);

-- ===================================================================
-- 5. LEAVE BALANCE ADJUSTMENTS (Audit trail for manual changes)
-- ===================================================================
CREATE TABLE IF NOT EXISTS leave_balance_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    balance_id UUID NOT NULL REFERENCES leave_balances(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    adjustment_type VARCHAR(30) NOT NULL, -- GRANT, DEDUCT, RESET, ACCRUAL
    amount NUMERIC(6,2) NOT NULL,         -- Positive for grant, negative for deduct
    reason TEXT NOT NULL,
    
    previous_balance NUMERIC(6,2),
    new_balance NUMERIC(6,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_balance_adjustments_employee ON leave_balance_adjustments(tenant_id, employee_id);

-- ===================================================================
-- 6. PUBLIC HOLIDAYS (US Federal + Company holidays)
-- ===================================================================
CREATE TABLE IF NOT EXISTS public_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,           -- e.g., 'Independence Day'
    date DATE NOT NULL,
    year INTEGER NOT NULL,
    
    is_paid BOOLEAN DEFAULT TRUE,
    is_optional BOOLEAN DEFAULT FALSE,    -- Optional holidays
    
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,
    
    UNIQUE(tenant_id, date)
);

CREATE INDEX IF NOT EXISTS idx_public_holidays_year ON public_holidays(tenant_id, year);

-- ===================================================================
-- 7. RESTRICTED (FLOATING) HOLIDAYS
-- ===================================================================
CREATE TABLE IF NOT EXISTS restricted_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,           -- e.g., 'Good Friday', 'Eid'
    date DATE NOT NULL,
    year INTEGER NOT NULL,
    description TEXT,
    
    max_claims INTEGER,                   -- Max employees who can claim (NULL = unlimited)
    current_claims INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_restricted_holidays_year ON restricted_holidays(tenant_id, year);

-- ===================================================================
-- 8. RESTRICTED HOLIDAY USAGE (Employee claims)
-- ===================================================================
CREATE TABLE IF NOT EXISTS restricted_holiday_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    restricted_holiday_id UUID NOT NULL REFERENCES restricted_holidays(id) ON DELETE CASCADE,
    
    claimed_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(tenant_id, employee_id, restricted_holiday_id)
);

-- ===================================================================
-- 9. APPROVAL DELEGATIONS
-- ===================================================================
CREATE TABLE IF NOT EXISTS approval_delegations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    delegator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- Who is delegating
    delegate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- Who receives authority
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP,
    revoked_by UUID
);

CREATE INDEX IF NOT EXISTS idx_delegations_delegator ON approval_delegations(tenant_id, delegator_id);
CREATE INDEX IF NOT EXISTS idx_delegations_delegate ON approval_delegations(tenant_id, delegate_id);
CREATE INDEX IF NOT EXISTS idx_delegations_dates ON approval_delegations(start_date, end_date);

-- ===================================================================
-- 10. ALTER LEAVE_APPLICATIONS TABLE
-- ===================================================================
DO $$ 
BEGIN
    -- Add new columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leave_applications' AND column_name = 'leave_type_id') THEN
        ALTER TABLE leave_applications ADD COLUMN leave_type_id UUID REFERENCES leave_types(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leave_applications' AND column_name = 'attachment_url') THEN
        ALTER TABLE leave_applications ADD COLUMN attachment_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leave_applications' AND column_name = 'manager_note') THEN
        ALTER TABLE leave_applications ADD COLUMN manager_note TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leave_applications' AND column_name = 'cancelled_at') THEN
        ALTER TABLE leave_applications ADD COLUMN cancelled_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leave_applications' AND column_name = 'cancelled_by') THEN
        ALTER TABLE leave_applications ADD COLUMN cancelled_by UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leave_applications' AND column_name = 'days_count') THEN
        ALTER TABLE leave_applications ADD COLUMN days_count NUMERIC(4,1);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leave_applications' AND column_name = 'half_day_session') THEN
        ALTER TABLE leave_applications ADD COLUMN half_day_session VARCHAR(10);
    END IF;
END $$;

-- Add index for leave_type_id
CREATE INDEX IF NOT EXISTS idx_leave_applications_type ON leave_applications(leave_type_id);

-- ===================================================================
-- RLS POLICIES FOR NEW TABLES
-- ===================================================================
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balance_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE restricted_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE restricted_holiday_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_leave_policy_overrides ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant isolation
CREATE POLICY leave_types_isolation ON leave_types
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid OR current_setting('app.role', true) = 'SUPER_ADMIN');

CREATE POLICY leave_policies_isolation ON leave_policies
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid OR current_setting('app.role', true) = 'SUPER_ADMIN');

CREATE POLICY leave_balances_isolation ON leave_balances
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid OR current_setting('app.role', true) = 'SUPER_ADMIN');

CREATE POLICY leave_balance_adjustments_isolation ON leave_balance_adjustments
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid OR current_setting('app.role', true) = 'SUPER_ADMIN');

CREATE POLICY public_holidays_isolation ON public_holidays
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid OR current_setting('app.role', true) = 'SUPER_ADMIN');

CREATE POLICY restricted_holidays_isolation ON restricted_holidays
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid OR current_setting('app.role', true) = 'SUPER_ADMIN');

CREATE POLICY restricted_holiday_usage_isolation ON restricted_holiday_usage
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid OR current_setting('app.role', true) = 'SUPER_ADMIN');

CREATE POLICY approval_delegations_isolation ON approval_delegations
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid OR current_setting('app.role', true) = 'SUPER_ADMIN');

CREATE POLICY employee_policy_overrides_isolation ON employee_leave_policy_overrides
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid OR current_setting('app.role', true) = 'SUPER_ADMIN');
