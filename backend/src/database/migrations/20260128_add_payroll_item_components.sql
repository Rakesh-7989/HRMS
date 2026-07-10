-- Migration: Create breakdown table for payslip components
-- Date: 2026-01-28

CREATE TABLE IF NOT EXISTS payroll_run_item_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payroll_run_item_id UUID NOT NULL REFERENCES payroll_run_items(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES salary_components(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    component_type VARCHAR(30) NOT NULL, -- EARNING, DEDUCTION, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pric_item_id ON payroll_run_item_components(payroll_run_item_id);
CREATE INDEX IF NOT EXISTS idx_pric_tenant_id ON payroll_run_item_components(tenant_id);
