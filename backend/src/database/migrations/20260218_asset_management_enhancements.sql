-- ===================================================================
-- ASSET MANAGEMENT ENHANCEMENTS MIGRATION
-- Adds: depreciation, condition tracking, return checklist,
--        serial uniqueness, date constraints
-- ===================================================================

-- 1. NEW COLUMNS ON ASSETS TABLE
-- ===================================================================

-- Depreciation & Financial
ALTER TABLE assets ADD COLUMN IF NOT EXISTS book_value DECIMAL(12, 2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS useful_life_years INTEGER;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS depreciation_method VARCHAR(20) DEFAULT 'STRAIGHT_LINE';

-- Physical Tracking
ALTER TABLE assets ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS condition VARCHAR(20) DEFAULT 'NEW';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS last_audit_date DATE;

-- Data Security
ALTER TABLE assets ADD COLUMN IF NOT EXISTS data_wipe_confirmed BOOLEAN DEFAULT FALSE;

-- 2. SERIAL NUMBER UNIQUENESS (partial index, only when serial_number is not null)
-- ===================================================================
CREATE UNIQUE INDEX IF NOT EXISTS assets_unique_serial_per_tenant
    ON assets(tenant_id, serial_number) WHERE serial_number IS NOT NULL;

-- 3. RETURN CHECKLIST TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS asset_return_checklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tracking_id UUID REFERENCES asset_tracking(id) ON DELETE SET NULL,

    item_name VARCHAR(100) NOT NULL,
    is_returned BOOLEAN DEFAULT FALSE,
    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_checklist_asset ON asset_return_checklist(asset_id);
CREATE INDEX IF NOT EXISTS idx_return_checklist_tenant ON asset_return_checklist(tenant_id);
CREATE INDEX IF NOT EXISTS idx_return_checklist_tracking ON asset_return_checklist(tracking_id);

-- RLS for return checklist
ALTER TABLE asset_return_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY asset_return_checklist_select ON asset_return_checklist
    FOR SELECT
    USING (
        current_setting('app.role', true) = 'SUPER_ADMIN'
        OR tenant_id = current_setting('app.tenant_id', true)::UUID
    );

CREATE POLICY asset_return_checklist_insert ON asset_return_checklist
    FOR INSERT
    WITH CHECK (
        current_setting('app.role', true) = 'SUPER_ADMIN'
        OR (tenant_id = current_setting('app.tenant_id', true)::UUID
            AND current_setting('app.role', true) IN ('ADMIN', 'HR'))
    );

-- 4. INITIALIZE book_value FROM purchase_price WHERE NOT SET
-- ===================================================================
UPDATE assets SET book_value = purchase_price WHERE book_value IS NULL AND purchase_price IS NOT NULL;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
