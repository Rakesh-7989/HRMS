-- =====================================================================
-- Payroll Power Upgrade Migration
-- Created: 2026-02-12
-- Purpose: Add audit logging, component breakdowns, bank file tracking
-- =====================================================================

-- 1. Extend payroll_results with component-level breakdowns
ALTER TABLE payroll_results
ADD COLUMN IF NOT EXISTS basic_pay NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS hra NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_allowances NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pf_employee NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pf_employer NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS esi_employee NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS esi_employer NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS professional_tax NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tds_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lop_days NUMERIC(5,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS lop_deduction NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS department_id UUID,
ADD COLUMN IF NOT EXISTS designation_id UUID;

-- 2. Create payroll_audit_log table
CREATE TABLE IF NOT EXISTS payroll_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- CREATED, REVIEW_STARTED, CHECKLIST_UPDATED, INITIATED, APPROVED, REJECTED, RELEASED
    performed_by UUID REFERENCES users(id),
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create payroll_bank_files table
CREATE TABLE IF NOT EXISTS payroll_bank_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    file_type VARCHAR(50) DEFAULT 'NEFT', -- NEFT, RTGS, IMPS
    file_name VARCHAR(255),
    total_amount NUMERIC(14,2) DEFAULT 0,
    employee_count INTEGER DEFAULT 0,
    generated_by UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'GENERATED', -- GENERATED, DOWNLOADED, SUBMITTED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_run_id ON payroll_audit_log(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON payroll_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_files_run_id ON payroll_bank_files(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_results_dept ON payroll_results(department_id);
