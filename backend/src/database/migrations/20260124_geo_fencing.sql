-- =====================================================================
-- GEO-FENCING FOR ATTENDANCE - MIGRATION
-- Creates new tables only, no modifications to existing tables
-- =====================================================================

-- 1. Geo-Fencing Settings (per tenant)
CREATE TABLE IF NOT EXISTS geo_fencing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    allow_clock_without_location BOOLEAN NOT NULL DEFAULT false,
    location_timeout_seconds INTEGER NOT NULL DEFAULT 30,
    require_high_accuracy BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    UNIQUE(tenant_id)
);

-- 2. Geo-Fencing Locations (allowed clock-in/out zones)
CREATE TABLE IF NOT EXISTS geo_fencing_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- 3. Geo-Fence Violation Log (for audit)
CREATE TABLE IF NOT EXISTS geo_fence_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('CLOCK_IN', 'CLOCK_OUT')),
    employee_latitude DECIMAL(10, 8),
    employee_longitude DECIMAL(11, 8),
    nearest_location_id UUID REFERENCES geo_fencing_locations(id),
    distance_meters INTEGER,
    violation_reason VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_geo_settings_tenant ON geo_fencing_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_geo_locations_tenant ON geo_fencing_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_geo_locations_active ON geo_fencing_locations(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_geo_violations_tenant ON geo_fence_violations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_geo_violations_employee ON geo_fence_violations(employee_id);
CREATE INDEX IF NOT EXISTS idx_geo_violations_created ON geo_fence_violations(created_at);

-- Comments
COMMENT ON TABLE geo_fencing_settings IS 'Tenant-specific geo-fencing configuration for attendance';
COMMENT ON TABLE geo_fencing_locations IS 'Allowed clock-in/out locations with radius';
COMMENT ON TABLE geo_fence_violations IS 'Audit log for geo-fence violations';
