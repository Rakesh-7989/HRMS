-- Migration: Add Multi-stage Approval Support
-- Stage 1: Manager Approval (PENDING -> PENDING_HR)
-- Stage 2: HR Approval (PENDING_HR -> APPROVED)

-- 1. Update wfh_requests status constraint
ALTER TABLE wfh_requests DROP CONSTRAINT IF EXISTS wfh_requests_status_check;
ALTER TABLE wfh_requests ADD CONSTRAINT wfh_requests_status_check CHECK (status IN ('PENDING', 'PENDING_HR', 'APPROVED', 'REJECTED'));

-- 2. Add tracking columns to wfh_requests
ALTER TABLE wfh_requests ADD COLUMN IF NOT EXISTS manager_approved_by UUID REFERENCES users(id);
ALTER TABLE wfh_requests ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMP;

-- 3. Add tracking columns to leave_applications
ALTER TABLE leave_applications ADD COLUMN IF NOT EXISTS manager_approved_by UUID REFERENCES users(id);
ALTER TABLE leave_applications ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMP;
ALTER TABLE leave_applications ADD COLUMN IF NOT EXISTS hr_note TEXT;

-- 4. Update index for pending requests to include PENDING_HR
DROP INDEX IF EXISTS idx_leave_tenant_employee_status;
CREATE INDEX idx_leave_tenant_employee_status ON leave_applications (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_wfh_requests_status_new ON wfh_requests(tenant_id, status);
