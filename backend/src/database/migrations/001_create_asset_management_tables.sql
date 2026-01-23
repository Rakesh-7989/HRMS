-- ===================================================================
-- ASSET MANAGEMENT SCHEMA MIGRATION
-- For: src/modules/asset_management/
-- ===================================================================

-- ===================================================================
-- 1. ASSETS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Asset Identification
    asset_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Purchase Information
    purchase_date DATE,
    purchase_price DECIMAL(12, 2),
    manufacturer VARCHAR(100),
    serial_number VARCHAR(100),
    warranty_expiry DATE,
    
    -- Assignment Information
    assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
    assigned_date TIMESTAMP,
    return_date TIMESTAMP,
    
    -- Status Tracking
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    -- Valid statuses: AVAILABLE, ASSIGNED, UNDER_REPAIR, RETIRED
    
    -- Additional Info
    notes TEXT,
    
    -- Audit Trail
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE UNIQUE INDEX assets_unique_code_per_tenant 
    ON assets(tenant_id, asset_code);

CREATE INDEX assets_tenant_idx 
    ON assets(tenant_id);

CREATE INDEX assets_status_idx 
    ON assets(tenant_id, status);

CREATE INDEX assets_category_idx 
    ON assets(tenant_id, category);

CREATE INDEX assets_assigned_to_idx 
    ON assets(assigned_to);

-- ===================================================================
-- 2. ASSET TRACKING TABLE
-- Maintains audit trail of all asset state changes
-- ===================================================================
CREATE TABLE IF NOT EXISTS asset_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Event Type
    event_type VARCHAR(50) NOT NULL,
    -- Valid types: CREATED, ASSIGNED, RETURNED, DAMAGED, LOST, RETIRED, REPAIR_START, REPAIR_COMPLETE
    
    -- Event Details
    description TEXT,
    related_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    
    -- Audit Trail
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX asset_tracking_asset_idx 
    ON asset_tracking(asset_id);

CREATE INDEX asset_tracking_tenant_idx 
    ON asset_tracking(tenant_id);

CREATE INDEX asset_tracking_created_at_idx 
    ON asset_tracking(created_at DESC);

-- ===================================================================
-- 3. ASSET USAGE HISTORY TABLE
-- Tracks usage details between assignment and return
-- ===================================================================
CREATE TABLE IF NOT EXISTS asset_usage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Usage Details
    usage_date DATE NOT NULL,
    hours_used DECIMAL(5, 2),
    description TEXT,
    
    -- Audit Trail
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX usage_history_asset_idx 
    ON asset_usage_history(asset_id);

CREATE INDEX usage_history_employee_idx 
    ON asset_usage_history(employee_id);

CREATE INDEX usage_history_tenant_idx 
    ON asset_usage_history(tenant_id);

CREATE INDEX usage_history_date_idx 
    ON asset_usage_history(usage_date DESC);

-- ===================================================================
-- 4. AGENT DEVICES TABLE (Windows Agent)
-- Stores registered Windows devices for asset monitoring
-- ===================================================================
CREATE TABLE IF NOT EXISTS agent_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Device Identification
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    
    -- OS Information
    os_name VARCHAR(100),
    os_version VARCHAR(100),
    hostname VARCHAR(255),
    
    -- Hardware Information
    cpu_cores INTEGER,
    cpu_model VARCHAR(255),
    ram_gb DECIMAL(5, 2),
    disk_total_gb DECIMAL(10, 2),
    disk_free_gb DECIMAL(10, 2),
    
    -- Network Information
    ip_address INET,
    mac_address MACADDR,
    
    -- Agent Information
    agent_token TEXT NOT NULL UNIQUE,
    agent_version VARCHAR(50),
    
    -- Timestamps
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX agent_devices_unique_per_tenant 
    ON agent_devices(tenant_id, device_id);

CREATE INDEX agent_devices_tenant_idx 
    ON agent_devices(tenant_id);

CREATE INDEX agent_devices_agent_token_idx 
    ON agent_devices(agent_token);

CREATE INDEX agent_devices_last_sync_idx 
    ON agent_devices(last_sync DESC);

-- ===================================================================
-- 5. AGENT REGISTRATIONS TABLE
-- Stores registration keys for device onboarding
-- ===================================================================
CREATE TABLE IF NOT EXISTS agent_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Registration Key
    registration_key TEXT NOT NULL UNIQUE,
    
    -- Usage Status
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    
    -- Audit Trail
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX agent_registrations_tenant_idx 
    ON agent_registrations(tenant_id);

CREATE INDEX agent_registrations_key_idx 
    ON agent_registrations(registration_key);

CREATE INDEX agent_registrations_is_used_idx 
    ON agent_registrations(is_used);

CREATE INDEX agent_registrations_expires_at_idx 
    ON agent_registrations(expires_at);

-- ===================================================================
-- 6. ASSET LINKED ASSETS TABLE (Optional - for asset dependencies)
-- Some assets may depend on or be paired with other assets
-- ===================================================================
CREATE TABLE IF NOT EXISTS asset_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    linked_asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Link Type
    link_type VARCHAR(50),
    -- e.g., PAIRED_WITH, COMPONENT_OF, REPLACEMENT_FOR
    
    description TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT no_self_link CHECK (asset_id != linked_asset_id)
);

-- Indexes
CREATE INDEX asset_links_asset_idx 
    ON asset_links(asset_id);

CREATE INDEX asset_links_tenant_idx 
    ON asset_links(tenant_id);

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
