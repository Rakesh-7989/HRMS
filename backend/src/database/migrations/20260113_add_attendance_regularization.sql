CREATE TABLE IF NOT EXISTS attendance_regularizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id),
    date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approver_id UUID REFERENCES users(id),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_att_reg_tenant ON attendance_regularizations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_att_reg_employee ON attendance_regularizations(employee_id);
CREATE INDEX IF NOT EXISTS idx_att_reg_status ON attendance_regularizations(status);
