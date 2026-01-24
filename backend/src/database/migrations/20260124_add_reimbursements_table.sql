-- Migration: Add reimbursements table
-- Date: 2026-01-24
-- Description: Complete reimbursements module for payroll automation

-- 1. Reimbursements table
CREATE TABLE IF NOT EXISTS reimbursements (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id uuid NOT NULL REFERENCES employees(id),
    category_id uuid REFERENCES expense_categories(id),
    amount numeric NOT NULL DEFAULT 0,
    claim_date date NOT NULL DEFAULT CURRENT_DATE,
    description text,
    receipt_url text,
    status varchar(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, PAID
    include_in_payroll boolean DEFAULT true,
    payroll_run_id uuid REFERENCES payroll_runs(id),
    approved_by uuid REFERENCES users(id),
    approved_at timestamptz,
    rejected_reason text,
    created_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reimbursements_tenant_idx ON reimbursements(tenant_id);
CREATE INDEX IF NOT EXISTS reimbursements_employee_idx ON reimbursements(employee_id);
CREATE INDEX IF NOT EXISTS reimbursements_status_idx ON reimbursements(status);

-- 2. Tax Slabs table (for TDS calculation)
CREATE TABLE IF NOT EXISTS tax_slabs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
    regime varchar(10) NOT NULL DEFAULT 'NEW', -- OLD, NEW
    min_income numeric NOT NULL,
    max_income numeric,
    tax_rate numeric NOT NULL,
    surcharge_rate numeric DEFAULT 0,
    cess_rate numeric DEFAULT 4, -- 4% health and education cess
    financial_year varchar(10) NOT NULL DEFAULT '2025-26',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Seed default tax slabs for FY 2025-26 (New Regime)
INSERT INTO tax_slabs (tenant_id, regime, min_income, max_income, tax_rate, financial_year)
SELECT NULL, 'NEW', 0, 300000, 0, '2025-26' WHERE NOT EXISTS (SELECT 1 FROM tax_slabs WHERE regime = 'NEW' AND min_income = 0);
INSERT INTO tax_slabs (tenant_id, regime, min_income, max_income, tax_rate, financial_year)
SELECT NULL, 'NEW', 300001, 700000, 5, '2025-26' WHERE NOT EXISTS (SELECT 1 FROM tax_slabs WHERE regime = 'NEW' AND min_income = 300001);
INSERT INTO tax_slabs (tenant_id, regime, min_income, max_income, tax_rate, financial_year)
SELECT NULL, 'NEW', 700001, 1000000, 10, '2025-26' WHERE NOT EXISTS (SELECT 1 FROM tax_slabs WHERE regime = 'NEW' AND min_income = 700001);
INSERT INTO tax_slabs (tenant_id, regime, min_income, max_income, tax_rate, financial_year)
SELECT NULL, 'NEW', 1000001, 1200000, 15, '2025-26' WHERE NOT EXISTS (SELECT 1 FROM tax_slabs WHERE regime = 'NEW' AND min_income = 1000001);
INSERT INTO tax_slabs (tenant_id, regime, min_income, max_income, tax_rate, financial_year)
SELECT NULL, 'NEW', 1200001, 1500000, 20, '2025-26' WHERE NOT EXISTS (SELECT 1 FROM tax_slabs WHERE regime = 'NEW' AND min_income = 1200001);
INSERT INTO tax_slabs (tenant_id, regime, min_income, max_income, tax_rate, financial_year)
SELECT NULL, 'NEW', 1500001, NULL, 30, '2025-26' WHERE NOT EXISTS (SELECT 1 FROM tax_slabs WHERE regime = 'NEW' AND min_income = 1500001);

-- Seed default tax slabs for FY 2025-26 (Old Regime)
INSERT INTO tax_slabs (tenant_id, regime, min_income, max_income, tax_rate, financial_year)
SELECT NULL, 'OLD', 0, 250000, 0, '2025-26' WHERE NOT EXISTS (SELECT 1 FROM tax_slabs WHERE regime = 'OLD' AND min_income = 0);
INSERT INTO tax_slabs (tenant_id, regime, min_income, max_income, tax_rate, financial_year)
SELECT NULL, 'OLD', 250001, 500000, 5, '2025-26' WHERE NOT EXISTS (SELECT 1 FROM tax_slabs WHERE regime = 'OLD' AND min_income = 250001);
INSERT INTO tax_slabs (tenant_id, regime, min_income, max_income, tax_rate, financial_year)
SELECT NULL, 'OLD', 500001, 1000000, 20, '2025-26' WHERE NOT EXISTS (SELECT 1 FROM tax_slabs WHERE regime = 'OLD' AND min_income = 500001);
INSERT INTO tax_slabs (tenant_id, regime, min_income, max_income, tax_rate, financial_year)
SELECT NULL, 'OLD', 1000001, NULL, 30, '2025-26' WHERE NOT EXISTS (SELECT 1 FROM tax_slabs WHERE regime = 'OLD' AND min_income = 1000001);

-- 3. Cost Centre Allocations (employee to cost centre mapping)
CREATE TABLE IF NOT EXISTS cost_centre_allocations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cost_centre_id uuid NOT NULL REFERENCES cost_centres(id) ON DELETE CASCADE,
    employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    allocation_percentage numeric NOT NULL DEFAULT 100,
    effective_from date NOT NULL DEFAULT CURRENT_DATE,
    effective_to date,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(tenant_id, cost_centre_id, employee_id, effective_from)
);

CREATE INDEX IF NOT EXISTS cost_centre_allocations_tenant_idx ON cost_centre_allocations(tenant_id);
CREATE INDEX IF NOT EXISTS cost_centre_allocations_cost_centre_idx ON cost_centre_allocations(cost_centre_id);
CREATE INDEX IF NOT EXISTS cost_centre_allocations_employee_idx ON cost_centre_allocations(employee_id);

-- 4. Payrun Audit Log (for tracking workflow changes)
CREATE TABLE IF NOT EXISTS payrun_audit_log (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payrun_id uuid NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    action varchar(50) NOT NULL, -- CREATED, CALCULATED, SUBMITTED, APPROVED, REJECTED, REVOKED, DELETED, LOCKED
    previous_status varchar(50),
    new_status varchar(50),
    reason text,
    performed_by uuid REFERENCES users(id),
    performed_at timestamptz DEFAULT now(),
    metadata jsonb
);

CREATE INDEX IF NOT EXISTS payrun_audit_log_payrun_idx ON payrun_audit_log(payrun_id);
CREATE INDEX IF NOT EXISTS payrun_audit_log_tenant_idx ON payrun_audit_log(tenant_id);

-- 5. Add budget column to cost_centres if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cost_centres' AND column_name = 'budget') THEN
        ALTER TABLE cost_centres ADD COLUMN budget numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cost_centres' AND column_name = 'actual_spent') THEN
        ALTER TABLE cost_centres ADD COLUMN actual_spent numeric DEFAULT 0;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_slabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centre_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrun_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
    -- Reimbursements policy
    BEGIN
        CREATE POLICY reimbursements_isolation ON reimbursements USING (tenant_id = current_tenant());
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    -- Tax slabs policy (allow global slabs where tenant_id is null)
    BEGIN
        CREATE POLICY tax_slabs_isolation ON tax_slabs USING (tenant_id IS NULL OR tenant_id = current_tenant());
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    -- Cost centre allocations policy
    BEGIN
        CREATE POLICY cost_centre_allocations_isolation ON cost_centre_allocations USING (tenant_id = current_tenant());
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    -- Payrun audit log policy
    BEGIN
        CREATE POLICY payrun_audit_log_isolation ON payrun_audit_log USING (tenant_id = current_tenant());
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
