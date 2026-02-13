-- Upgrade Payroll Module for RiVeR Framework

-- 1. Add columns to payroll_runs (Safe Additive Changes)
ALTER TABLE payroll_runs 
ADD COLUMN IF NOT EXISTS stage VARCHAR(50) DEFAULT 'REVIEW', -- REVIEW, INITIATE, VERIFY, RELEASE
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
ADD COLUMN IF NOT EXISTS processed_by UUID,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE;

-- 2. Create payroll_results table (Stores frozen calculation results)
CREATE TABLE IF NOT EXISTS payroll_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    gross_pay NUMERIC(12,2) DEFAULT 0,
    deductions NUMERIC(12,2) DEFAULT 0,
    net_pay NUMERIC(12,2) DEFAULT 0,
    tax NUMERIC(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'PROCESSED', -- PROCESSED, FAILED
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create payroll_approvals table (For E-Approval flow)
CREATE TABLE IF NOT EXISTS payroll_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    comments TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create payroll_checklist table (For Review Stage checks)
CREATE TABLE IF NOT EXISTS payroll_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    item_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, COMPLETED, SKIPPED
    comment TEXT,
    completed_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_results_run_id ON payroll_results(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_approvals_run_id ON payroll_approvals(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_checklist_run_id ON payroll_checklist(payroll_run_id);
