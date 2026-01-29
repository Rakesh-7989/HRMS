-- Create WFH Requests Table
-- This table stores Work From Home requests separate from leave applications

CREATE TABLE IF NOT EXISTS wfh_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    request_date DATE NOT NULL,
    reason TEXT NOT NULL,
    
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    approval_comment TEXT,
    
    rejected_by UUID REFERENCES users(id),
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Prevent duplicate requests for same date
    UNIQUE(tenant_id, employee_id, request_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wfh_requests_employee ON wfh_requests(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_wfh_requests_date ON wfh_requests(tenant_id, request_date);
CREATE INDEX IF NOT EXISTS idx_wfh_requests_status ON wfh_requests(tenant_id, status);

-- RLS
ALTER TABLE wfh_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY wfh_requests_isolation ON wfh_requests
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid OR current_setting('app.role', true) = 'SUPER_ADMIN');
