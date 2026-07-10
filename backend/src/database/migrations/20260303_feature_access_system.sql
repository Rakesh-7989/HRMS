-- ===================================================================
-- PLAN-BASED FEATURE ACCESS CONTROL SYSTEM
-- Migration: 20260303_feature_access_system.sql
-- ===================================================================

-- 1. EXTEND TENANTS WITH PLAN INFORMATION
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS plan_type INTEGER DEFAULT 1, -- 1=STANDARD, 2=PREMIUM, 3=ELITE
ADD COLUMN IF NOT EXISTS plan_expiry_date DATE;

-- 1.1 EXTEND PLANS WITH TIER
ALTER TABLE plans ADD COLUMN IF NOT EXISTS tier INTEGER;
UPDATE plans SET tier = 1 WHERE name = 'STANDARD';
UPDATE plans SET tier = 2 WHERE name = 'PREMIUM';
UPDATE plans SET tier = 3 WHERE name = 'ELITE';

-- 2. FEATURE PERMISSIONS MATRIX TABLE
CREATE TABLE IF NOT EXISTS feature_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_type INTEGER NOT NULL, -- 1, 2, 3
    feature_key VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    UNIQUE(plan_type, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_feature_permissions_plan ON feature_permissions(plan_type);

-- 3. SEED THE FEATURE MATRIX (STRICT IMPLEMENTATION)

-- Clean start for feature permissions
TRUNCATE feature_permissions;

-- FEATURE KEY MAPPINGS:
-- attendance.geofencing
-- attendance.scheduling
-- leave.multi_stage
-- leave.policy_config
-- payroll.full_access
-- project.task_board
-- project.timesheets
-- project.client_management
-- assets.full_access
-- collaboration.announcements
-- collaboration.chat
-- collaboration.webrtc
-- enterprise.api_access
-- enterprise.advanced_rbac
-- enterprise.custom_reports

-- ==========================
-- STANDARD PLAN (1)
-- ==========================
INSERT INTO feature_permissions (plan_type, feature_key, is_enabled) VALUES
    (1, 'dashboard.stats', true),
    (1, 'employee.directory', true),
    (1, 'attendance.basic', true),
    (1, 'leave.basic', true),
    (1, 'mobile.android', true),
    -- Explicitly disable restricted features
    (1, 'attendance.geofencing', false),
    (1, 'attendance.scheduling', false),
    (1, 'leave.multi_stage', false),
    (1, 'payroll.full_access', false),
    (1, 'project.task_board', false),
    (1, 'assets.full_access', false),
    (1, 'collaboration.chat', false);

-- ==========================
-- PREMIUM PLAN (2)
-- ==========================
-- Same as Standard +
INSERT INTO feature_permissions (plan_type, feature_key, is_enabled) VALUES
    (2, 'dashboard.stats', true),
    (2, 'employee.directory', true),
    (2, 'attendance.basic', true),
    (2, 'leave.basic', true),
    (2, 'mobile.android', true),
    (2, 'mobile.ios', true),
    -- Premium Additions
    (2, 'attendance.geofencing', true),
    (2, 'attendance.scheduling', true),
    (2, 'leave.multi_stage', true),
    (2, 'leave.policy_config', true),
    (2, 'payroll.full_access', true),
    (2, 'project.task_board', true),
    (2, 'project.timesheets', true),
    (2, 'collaboration.announcements', true),
    -- Disabled in Premium
    (2, 'collaboration.chat', false),
    (2, 'collaboration.webrtc', false),
    (2, 'assets.full_access', false),
    (2, 'project.client_management', false),
    (2, 'enterprise.api_access', false);

-- ==========================
-- ELITE PLAN (3)
-- ==========================
-- Everything is enabled
INSERT INTO feature_permissions (plan_type, feature_key, is_enabled) VALUES
    (3, 'dashboard.stats', true),
    (3, 'employee.directory', true),
    (3, 'attendance.basic', true),
    (3, 'leave.basic', true),
    (3, 'mobile.android', true),
    (3, 'mobile.ios', true),
    (3, 'attendance.geofencing', true),
    (3, 'attendance.scheduling', true),
    (3, 'leave.multi_stage', true),
    (3, 'leave.policy_config', true),
    (3, 'payroll.full_access', true),
    (3, 'project.task_board', true),
    (3, 'project.timesheets', true),
    (3, 'collaboration.announcements', true),
    (3, 'collaboration.chat', true),
    (3, 'collaboration.webrtc', true),
    (3, 'assets.full_access', true),
    (3, 'project.client_management', true),
    (3, 'enterprise.api_access', true),
    (3, 'enterprise.advanced_rbac', true),
    (3, 'enterprise.custom_reports', true);

-- 4. MIGRATE EXISTING SUBSCRIPTIONS TO PLAN_TYPES
-- This assumes plan names map logically to types
UPDATE tenants t
SET plan_type = p.tier
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
WHERE t.id = s.tenant_id;

-- Ensure plan_expiry_date is set from subscription end_date
UPDATE tenants t
SET plan_expiry_date = s.end_date
FROM subscriptions s
WHERE t.id = s.tenant_id;
