-- Migration: Add Salary Arrears Table
-- Date: 2026-02-23

CREATE TABLE IF NOT EXISTS salary_arrears (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES employee_salary_assignments(id) ON DELETE SET NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
    payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE salary_arrears ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policy
CREATE POLICY salary_arrears_tenant_isolation ON salary_arrears
    USING (tenant_id = (current_setting('app.tenant_id'::text, true))::uuid);

-- Index for performance
CREATE INDEX idx_salary_arrears_employee ON salary_arrears(employee_id, status);
CREATE INDEX idx_salary_arrears_tenant ON salary_arrears(tenant_id);
