-- ===================================================================
-- PAYROLL MODULE BUG FIXES — MIGRATION (UPDATED)
-- Date: 2026-02-18
-- Description: Creates fnf_settlements table (since it was missing)
--              and adds necessary columns.
-- ===================================================================

-- 1. Create fnf_settlements table if it doesn't exist
CREATE TABLE IF NOT EXISTS fnf_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL, -- references tenants(id)
    employee_id UUID NOT NULL REFERENCES employees(id),
    last_working_day DATE,
    resignation_date DATE,
    
    -- Financials
    pending_salary NUMERIC(12,2) DEFAULT 0,
    leave_encashment NUMERIC(12,2) DEFAULT 0,
    gratuity NUMERIC(12,2) DEFAULT 0,
    reimbursements_pending NUMERIC(12,2) DEFAULT 0,
    bonus_pending NUMERIC(12,2) DEFAULT 0,
    other_earnings NUMERIC(12,2) DEFAULT 0,
    
    gross_payable NUMERIC(12,2) DEFAULT 0,
    
    -- Deductions/Recoveries
    notice_period_recovery NUMERIC(12,2) DEFAULT 0,
    loan_recovery NUMERIC(12,2) DEFAULT 0,
    advance_recovery NUMERIC(12,2) DEFAULT 0,
    it_assets_recovery NUMERIC(12,2) DEFAULT 0,
    tds_on_fnf NUMERIC(12,2) DEFAULT 0,
    other_recoveries NUMERIC(12,2) DEFAULT 0,
    
    total_deductions NUMERIC(12,2) DEFAULT 0,
    net_payable NUMERIC(12,2) DEFAULT 0,
    
    -- Settlement Type (PAYABLE_TO_EMPLOYEE, RECOVERABLE_FROM_EMPLOYEE)
    settlement_type VARCHAR(50) DEFAULT 'PAYABLE_TO_EMPLOYEE',
    
    -- Status & Workflow
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, PAID, HOLD_ASSET_PENDING, CANCELLED
    hold_reason TEXT,
    remarks TEXT,
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    paid_at TIMESTAMP WITH TIME ZONE
);

-- ===================================================================
-- INDEX for settlement status lookups
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_fnf_settlement_status
    ON fnf_settlements(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_fnf_settlement_employee
    ON fnf_settlements(tenant_id, employee_id);
