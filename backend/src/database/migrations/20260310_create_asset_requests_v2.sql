-- Create asset_requests table
DROP TABLE IF EXISTS asset_requests CASCADE;
CREATE TABLE IF NOT EXISTS asset_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    asset_name VARCHAR(255),
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
    reason TEXT,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, FULFILLED, CANCELLED
    admin_notes TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asset_requests_tenant ON asset_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_requests_employee ON asset_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_asset_requests_status ON asset_requests(status);
