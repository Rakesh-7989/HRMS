-- ==========================================
-- TAX MODULE TABLES
-- ==========================================

-- 1. Tax Sections Configuration (e.g., 80C, 80D)
CREATE TABLE IF NOT EXISTS tax_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    section VARCHAR(50) NOT NULL,
    max_limit NUMERIC(10, 2),
    regime_allowed VARCHAR(20) DEFAULT 'BOTH', -- OLD, NEW, BOTH
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Employee Tax Regime Selection
CREATE TABLE IF NOT EXISTS employee_tax_regimes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id),
    financial_year VARCHAR(20) NOT NULL, -- e.g., '2024-2025'
    regime VARCHAR(20) DEFAULT 'NEW', -- OLD, NEW
    is_frozen BOOLEAN DEFAULT FALSE,
    frozen_at TIMESTAMP WITH TIME ZONE,
    frozen_by UUID, -- user_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, financial_year)
);

-- 3. IT Declarations (Investment Proofs)
CREATE TABLE IF NOT EXISTS it_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id),
    financial_year VARCHAR(20) NOT NULL,
    section_id UUID REFERENCES tax_sections(id),
    declared_amount NUMERIC(12, 2) DEFAULT 0,
    approved_amount NUMERIC(12, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    proof_url TEXT,
    remarks TEXT, -- Admin/Manager remarks
    created_by UUID,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- SEED DEFAULT SECTIONS (if empty)
-- ==========================================
-- This block is best handled in a seeder or service, but we'll add a trigger or just let the app handle it.
-- For now, let's keep it clean.
