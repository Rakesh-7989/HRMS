-- Migration: Enhanced Payroll Module - Keka-Style Salary Structures
-- Date: 2026-01-27
-- Description: Adds dynamic salary structures, CTC-based salary assignments, and reimbursements

-- =====================================================
-- SALARY COMPONENTS (Enhanced)
-- =====================================================

-- Drop old simple table and create enhanced one
-- First, backup any existing data if needed
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_salary_components') THEN
        -- Create new enhanced table
        CREATE TABLE IF NOT EXISTS salary_components (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            code VARCHAR(20),
            component_type VARCHAR(30) NOT NULL DEFAULT 'EARNING', -- EARNING, DEDUCTION, EMPLOYER_CONTRIBUTION, REIMBURSEMENT
            category VARCHAR(50), -- BASIC, ALLOWANCE, STATUTORY, BENEFIT, OTHER
            is_taxable BOOLEAN DEFAULT TRUE,
            is_pro_rata BOOLEAN DEFAULT TRUE, -- Pro-rate for partial months
            is_statutory BOOLEAN DEFAULT FALSE,
            statutory_code VARCHAR(20), -- PF, ESI, PT, TDS, GRATUITY
            is_active BOOLEAN DEFAULT TRUE,
            display_order INT DEFAULT 0,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(tenant_id, code)
        );
    END IF;
END $$;

-- If table doesn't exist, create it directly
CREATE TABLE IF NOT EXISTS salary_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    component_type VARCHAR(30) NOT NULL DEFAULT 'EARNING',
    category VARCHAR(50),
    is_taxable BOOLEAN DEFAULT TRUE,
    is_pro_rata BOOLEAN DEFAULT TRUE,
    is_statutory BOOLEAN DEFAULT FALSE,
    statutory_code VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_salary_components_tenant ON salary_components(tenant_id);

-- =====================================================
-- SALARY STRUCTURES (Templates)
-- =====================================================

CREATE TABLE IF NOT EXISTS salary_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_structures_tenant ON salary_structures(tenant_id);

-- =====================================================
-- SALARY STRUCTURE COMPONENTS (Formula Definitions)
-- =====================================================

CREATE TABLE IF NOT EXISTS salary_structure_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    structure_id UUID NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES salary_components(id) ON DELETE CASCADE,
    calculation_type VARCHAR(30) NOT NULL DEFAULT 'PERCENTAGE_OF_CTC', 
        -- FIXED, PERCENTAGE_OF_CTC, PERCENTAGE_OF_BASIC, FORMULA, REMAINING
    percentage DECIMAL(5,2), -- For percentage-based calculations
    fixed_amount DECIMAL(15,2), -- For fixed calculations
    formula TEXT, -- For complex calculations (e.g., "BASIC * 0.12")
    min_value DECIMAL(15,2),
    max_value DECIMAL(15,2),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(structure_id, component_id)
);

CREATE INDEX IF NOT EXISTS idx_salary_structure_components_structure ON salary_structure_components(structure_id);

-- =====================================================
-- EMPLOYEE SALARY ASSIGNMENTS (CTC-Based)
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_salary_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    structure_id UUID REFERENCES salary_structures(id),
    annual_ctc DECIMAL(15,2) NOT NULL,
    monthly_ctc DECIMAL(15,2) GENERATED ALWAYS AS (annual_ctc / 12) STORED,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_current BOOLEAN DEFAULT TRUE,
    revision_reason TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_salary_assignments_employee ON employee_salary_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_salary_assignments_current ON employee_salary_assignments(employee_id, is_current) WHERE is_current = TRUE;

-- =====================================================
-- EMPLOYEE SALARY COMPONENT VALUES (Calculated Amounts)
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_salary_component_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES employee_salary_assignments(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES salary_components(id),
    monthly_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    annual_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assignment_id, component_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_salary_component_values_assignment ON employee_salary_component_values(assignment_id);

-- =====================================================
-- REIMBURSEMENT TYPES
-- =====================================================

CREATE TABLE IF NOT EXISTS reimbursement_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    max_annual_limit DECIMAL(15,2),
    requires_receipt BOOLEAN DEFAULT TRUE,
    is_taxable BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reimbursement_types_tenant ON reimbursement_types(tenant_id);

-- =====================================================
-- REIMBURSEMENT CLAIMS
-- =====================================================

CREATE TABLE IF NOT EXISTS reimbursement_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    reimbursement_type_id UUID NOT NULL REFERENCES reimbursement_types(id),
    amount DECIMAL(15,2) NOT NULL,
    claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    receipt_url TEXT,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, PAID
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejected_reason TEXT,
    paid_in_payrun_id UUID,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reimbursement_claims_employee ON reimbursement_claims(employee_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_claims_status ON reimbursement_claims(tenant_id, status);

-- =====================================================
-- ONE-TIME PAYMENTS (Bonus, Arrears, Adjustments)
-- =====================================================

CREATE TABLE IF NOT EXISTS payroll_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    adjustment_type VARCHAR(30) NOT NULL, -- BONUS, ARREARS, DEDUCTION, ALLOWANCE, OTHER
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    effective_month INT, -- Month (1-12)
    effective_year INT, -- Year
    is_taxable BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSED, CANCELLED
    processed_in_payrun_id UUID,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_employee ON payroll_adjustments(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_pending ON payroll_adjustments(tenant_id, status, effective_year, effective_month);

-- =====================================================
-- SEED DEFAULT SALARY COMPONENTS FOR EXISTING TENANTS
-- =====================================================

-- This will be done via application logic or a separate seed script
-- to avoid issues with tenant-specific data in migrations

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_structure_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_salary_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_salary_component_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursement_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_adjustments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for each table (tenant isolation)
CREATE POLICY salary_components_tenant_isolation ON salary_components
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY salary_structures_tenant_isolation ON salary_structures
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY salary_structure_components_tenant_isolation ON salary_structure_components
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY employee_salary_assignments_tenant_isolation ON employee_salary_assignments
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY employee_salary_component_values_tenant_isolation ON employee_salary_component_values
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY reimbursement_types_tenant_isolation ON reimbursement_types
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY reimbursement_claims_tenant_isolation ON reimbursement_claims
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY payroll_adjustments_tenant_isolation ON payroll_adjustments
    FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
