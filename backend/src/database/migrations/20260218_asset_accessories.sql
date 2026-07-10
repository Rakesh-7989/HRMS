-- ===================================================================
-- ASSET ACCESSORIES TABLE
-- Persists what accessories were given with each asset assignment.
-- On return, this data auto-populates the return checklist.
-- ===================================================================

CREATE TABLE IF NOT EXISTS asset_accessories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    item_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_accessories_asset ON asset_accessories(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_accessories_tenant ON asset_accessories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_accessories_active ON asset_accessories(asset_id, is_active);

-- RLS
ALTER TABLE asset_accessories ENABLE ROW LEVEL SECURITY;

CREATE POLICY asset_accessories_select ON asset_accessories
    FOR SELECT
    USING (
        current_setting('app.role', true) = 'SUPER_ADMIN'
        OR tenant_id = current_setting('app.tenant_id', true)::UUID
    );

CREATE POLICY asset_accessories_insert ON asset_accessories
    FOR INSERT
    WITH CHECK (
        current_setting('app.role', true) = 'SUPER_ADMIN'
        OR (tenant_id = current_setting('app.tenant_id', true)::UUID
            AND current_setting('app.role', true) IN ('ADMIN', 'HR'))
    );

CREATE POLICY asset_accessories_update ON asset_accessories
    FOR UPDATE
    USING (
        current_setting('app.role', true) = 'SUPER_ADMIN'
        OR (tenant_id = current_setting('app.tenant_id', true)::UUID
            AND current_setting('app.role', true) IN ('ADMIN', 'HR'))
    );

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
