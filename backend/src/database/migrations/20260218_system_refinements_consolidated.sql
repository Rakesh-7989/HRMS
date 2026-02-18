-- ===================================================================
-- SYSTEM REFINEMENTS CONSOLIDATED MIGRATION (Feb 18, 2026)
-- 1. Employee Table Fixes (Missing columns & Scoped employee_id)
-- 2. Permission-based Dashboards & Organization Hierarchy
-- 3. Announcement & Calendar Permissions Assignments
-- ===================================================================

BEGIN;

-- ===================================================================
-- 1. EMPLOYEE TABLE FIXES & SCOPING
-- ===================================================================

-- Add missing columns if they don't exist
ALTER TABLE employees ADD COLUMN IF NOT EXISTS aadhar_number VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS annual_salary NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS branch_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS job_location VARCHAR(100);

-- Scope employee_id uniqueness to tenant instead of global
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_employee_id_key;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_tenant_id_employee_id_unique; -- Cleanup if prev run
ALTER TABLE employees ADD CONSTRAINT employees_tenant_id_employee_id_unique UNIQUE (tenant_id, employee_id);

-- Add comments for clarity
COMMENT ON COLUMN employees.aadhar_number IS '12-digit Aadhaar number';
COMMENT ON COLUMN employees.annual_salary IS 'Annual compensation (CTC)';
COMMENT ON COLUMN employees.branch_name IS 'Bank branch name';
COMMENT ON COLUMN employees.job_location IS 'Physical or remote work location';

-- ===================================================================
-- 2. PERMISSION-BASED DASHBOARDS
-- ===================================================================

-- Add Dashboard & Org Hierarchy permissions
INSERT INTO permissions (name, category, description, resource, action) VALUES
('dashboard.view_system',       'dashboard', 'View platform-wide system dashboard', 'dashboard', 'read'),
('dashboard.view_organization', 'dashboard', 'View organization overview dashboard', 'dashboard', 'read'),
('dashboard.view_hr_analytics', 'dashboard', 'View HR analytics dashboard', 'dashboard', 'read'),
('dashboard.view_team',         'dashboard', 'View team/direct-reports dashboard', 'dashboard', 'read'),
('dashboard.view_personal',     'dashboard', 'View personal employee dashboard', 'dashboard', 'read'),
('org_hierarchy.view',          'organisation', 'View organization hierarchy tree', 'organization', 'read'),
('org_hierarchy.manage',        'organisation', 'Manage hierarchy positions', 'organization', 'manage'),
('announcements.manage',        'communication', 'Manage corporate announcements', 'announcement', 'manage')
ON CONFLICT (name) DO NOTHING;

-- Assign to roles templates (tenant_id IS NULL)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.tenant_id IS NULL AND (
    (r.name = 'SUPER_ADMIN' AND p.name IN ('dashboard.view_system', 'dashboard.view_organization', 'dashboard.view_hr_analytics', 'dashboard.view_team', 'dashboard.view_personal', 'org_hierarchy.view', 'org_hierarchy.manage', 'announcements.manage', 'calendar.manage'))
    OR (r.name = 'ADMIN' AND p.name IN ('dashboard.view_organization', 'dashboard.view_hr_analytics', 'dashboard.view_team', 'dashboard.view_personal', 'org_hierarchy.view', 'org_hierarchy.manage', 'announcements.manage', 'calendar.manage'))
    OR (r.name = 'HR' AND p.name IN ('dashboard.view_hr_analytics', 'dashboard.view_team', 'dashboard.view_personal', 'org_hierarchy.view', 'announcements.manage', 'calendar.manage'))
    OR (r.name = 'MANAGER' AND p.name IN ('dashboard.view_team', 'dashboard.view_personal', 'org_hierarchy.view'))
    OR (r.name = 'EMPLOYEE' AND p.name IN ('dashboard.view_personal', 'org_hierarchy.view'))
)
ON CONFLICT DO NOTHING;

-- Assign to existing tenant roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.tenant_id IS NOT NULL AND (
    (r.name = 'ADMIN' AND p.name IN ('dashboard.view_organization', 'dashboard.view_hr_analytics', 'dashboard.view_team', 'dashboard.view_personal', 'org_hierarchy.view', 'org_hierarchy.manage', 'announcements.manage', 'calendar.manage'))
    OR (r.name = 'HR' AND p.name IN ('dashboard.view_hr_analytics', 'dashboard.view_team', 'dashboard.view_personal', 'org_hierarchy.view', 'announcements.manage', 'calendar.manage'))
    OR (r.name = 'MANAGER' AND p.name IN ('dashboard.view_team', 'dashboard.view_personal', 'org_hierarchy.view'))
    OR (r.name = 'EMPLOYEE' AND p.name IN ('dashboard.view_personal', 'org_hierarchy.view'))
)
ON CONFLICT DO NOTHING;

-- ===================================================================
-- 3. ORGANIZATION HIERARCHY TABLES
-- ===================================================================

CREATE TABLE IF NOT EXISTS hierarchy_positions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,
    short_name          VARCHAR(20),
    level               INTEGER NOT NULL,
    parent_position_id  UUID REFERENCES hierarchy_positions(id) ON DELETE SET NULL,
    department_id       UUID REFERENCES departments(id) ON DELETE SET NULL,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMP DEFAULT now(),
    updated_at          TIMESTAMP DEFAULT now(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_hierarchy_positions_tenant ON hierarchy_positions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_positions_parent ON hierarchy_positions(parent_position_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_positions_level ON hierarchy_positions(tenant_id, level);

ALTER TABLE hierarchy_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hp_select ON hierarchy_positions;
CREATE POLICY hp_select ON hierarchy_positions FOR SELECT
    USING (current_app_role() = 'SUPER_ADMIN' OR tenant_id = current_tenant());

DROP POLICY IF EXISTS hp_manage ON hierarchy_positions;
CREATE POLICY hp_manage ON hierarchy_positions FOR ALL
    USING (current_app_role() = 'SUPER_ADMIN' OR (tenant_id = current_tenant() AND has_permission('org_hierarchy.manage')));

-- Link employee to hierarchy
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hierarchy_position_id UUID REFERENCES hierarchy_positions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_employees_hierarchy_pos ON employees(hierarchy_position_id);

COMMIT;
