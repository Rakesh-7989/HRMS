-- ===================================================================
-- DYNAMIC ROLES & PERMISSIONS SYSTEM
-- Migration: 20260302_roles_permissions.sql
-- ===================================================================

-- 1. PERMISSIONS – master catalog of all granular permissions
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_permission_overrides CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    UNIQUE(module, action)
);

-- 2. ROLE_PERMISSIONS – per-tenant, per-role permission toggles
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID,
    UNIQUE(tenant_id, role, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant_role ON role_permissions(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- 3. USER_PERMISSION_OVERRIDES – per-user grant/deny overrides
CREATE TABLE IF NOT EXISTS user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID,
    UNIQUE(tenant_id, user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_overrides_tenant_user ON user_permission_overrides(tenant_id, user_id);

-- ===================================================================
-- SEED PERMISSIONS CATALOG
-- ===================================================================

INSERT INTO permissions (module, action, label, description) VALUES
    -- Employees
    ('employees', 'view', 'View Employees', 'View employee list and details'),
    ('employees', 'create', 'Add Employee', 'Create new employee accounts'),
    ('employees', 'update', 'Edit Employee', 'Update employee information'),
    ('employees', 'delete', 'Delete Employee', 'Remove employee accounts'),
    ('employees', 'import', 'Bulk Import Employees', 'Import employees from spreadsheet'),
    ('employees', 'change_role', 'Change Employee Role', 'Change the role assigned to an employee'),
    ('employees', 'change_manager', 'Assign Manager', 'Change reporting manager for an employee'),

    -- Attendance
    ('attendance', 'view', 'View Attendance', 'View attendance records'),
    ('attendance', 'manage', 'Manage Attendance', 'Edit and manage attendance records'),
    ('attendance', 'approve', 'Approve Attendance', 'Approve or reject attendance requests'),

    -- Leave
    ('leave', 'view', 'View Leave', 'View leave applications and balances'),
    ('leave', 'create', 'Apply Leave', 'Submit leave applications'),
    ('leave', 'approve', 'Approve Leave', 'Approve or reject leave applications'),
    ('leave', 'manage_settings', 'Manage Leave Settings', 'Configure leave types and policies'),

    -- Payroll
    ('payroll', 'view', 'View Payroll', 'View payroll data and payslips'),
    ('payroll', 'manage', 'Manage Payroll', 'Configure salary structures and components'),
    ('payroll', 'run', 'Run Payroll', 'Execute payroll runs'),

    -- Departments
    ('departments', 'view', 'View Departments', 'View department list'),
    ('departments', 'manage', 'Manage Departments', 'Create, edit, and delete departments'),

    -- Designations
    ('designations', 'view', 'View Designations', 'View designation list'),
    ('designations', 'manage', 'Manage Designations', 'Create, edit, and delete designations'),

    -- Assets
    ('assets', 'view', 'View Assets', 'View asset inventory'),
    ('assets', 'manage', 'Manage Assets', 'Create, edit, and delete assets'),
    ('assets', 'assign', 'Assign Assets', 'Assign and unassign assets to employees'),

    -- Projects
    ('projects', 'view', 'View Projects', 'View project list and details'),
    ('projects', 'create', 'Create Projects', 'Create new projects'),
    ('projects', 'manage', 'Manage Projects', 'Edit project settings and members'),
    ('projects', 'manage_tasks', 'Manage Tasks', 'Create, assign, and update project tasks'),

    -- Reports
    ('reports', 'view', 'View Reports', 'Access analytics and reports'),

    -- Chat
    ('chat', 'view', 'Access Chat', 'Use the chat messaging system'),
    ('chat', 'create', 'Create Channels', 'Create new chat channels and groups'),
    ('chat', 'manage', 'Manage Chat', 'Manage chat channels, delete messages, moderate'),

    -- Calendar
    ('calendar', 'view', 'View Calendar', 'View calendar events and holidays'),
    ('calendar', 'manage', 'Manage Calendar', 'Create and manage calendar events'),

    -- Organisation
    ('organisation', 'view', 'View Organisation', 'View organisation structure'),

    -- Roles & Permissions
    ('roles', 'manage', 'Manage Roles & Permissions', 'Configure role permissions'),

    -- Audit Logs
    ('audit_logs', 'view', 'View Audit Logs', 'Access audit trail and activity logs'),

    -- WFH (Work From Home)
    ('wfh', 'view', 'View WFH Requests', 'View work from home requests'),
    ('wfh', 'create', 'Request WFH', 'Submit work from home requests'),
    ('wfh', 'approve', 'Approve WFH', 'Approve or reject WFH requests'),

    -- Shifts
    ('shifts', 'view', 'View Shifts', 'View shift schedules and assignments'),
    ('shifts', 'manage', 'Manage Shifts', 'Create, edit, and delete shift schedules')
ON CONFLICT (module, action) DO NOTHING;


-- ===================================================================
-- SEED DEFAULT ROLE PERMISSIONS FOR ALL EXISTING TENANTS
-- ===================================================================

-- Helper function to seed permissions for a single tenant
CREATE OR REPLACE FUNCTION seed_role_permissions_for_tenant(p_tenant_id UUID) RETURNS void AS $$
DECLARE
    perm RECORD;
BEGIN
    -- ADMIN gets everything except roles:manage (which they also get)
    FOR perm IN SELECT id, module, action FROM permissions LOOP
        -- ADMIN: full access
        INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
        VALUES (p_tenant_id, 'ADMIN', perm.id, TRUE)
        ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

        -- HR: full access except roles:manage and employees:delete and employees:change_role
        INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
        VALUES (p_tenant_id, 'HR', perm.id,
            CASE
                WHEN perm.module = 'roles' AND perm.action = 'manage' THEN FALSE
                WHEN perm.module = 'employees' AND perm.action = 'delete' THEN FALSE
                WHEN perm.module = 'employees' AND perm.action = 'change_role' THEN FALSE
                ELSE TRUE
            END
        )
        ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

        -- MANAGER: view most things, approve attendance/leave, manage tasks
        INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
        VALUES (p_tenant_id, 'MANAGER', perm.id,
            CASE
                WHEN perm.action = 'view' THEN TRUE
                WHEN perm.module = 'attendance' AND perm.action = 'approve' THEN TRUE
                WHEN perm.module = 'leave' AND perm.action = 'approve' THEN TRUE
                WHEN perm.module = 'leave' AND perm.action = 'create' THEN TRUE
                WHEN perm.module = 'projects' AND perm.action IN ('create', 'manage', 'manage_tasks') THEN TRUE
                WHEN perm.module = 'chat' AND perm.action IN ('view', 'create') THEN TRUE
                WHEN perm.module = 'wfh' AND perm.action IN ('view', 'create', 'approve') THEN TRUE
                WHEN perm.module = 'shifts' AND perm.action = 'view' THEN TRUE
                ELSE FALSE
            END
        )
        ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

        -- EMPLOYEE: view own, create leave, manage own tasks, chat
        INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
        VALUES (p_tenant_id, 'EMPLOYEE', perm.id,
            CASE
                WHEN perm.module = 'employees' AND perm.action = 'view' THEN TRUE
                WHEN perm.module = 'attendance' AND perm.action = 'view' THEN TRUE
                WHEN perm.module = 'leave' AND perm.action IN ('view', 'create') THEN TRUE
                WHEN perm.module = 'payroll' AND perm.action = 'view' THEN TRUE
                WHEN perm.module = 'departments' AND perm.action = 'view' THEN TRUE
                WHEN perm.module = 'designations' AND perm.action = 'view' THEN TRUE
                WHEN perm.module = 'assets' AND perm.action = 'view' THEN TRUE
                WHEN perm.module = 'projects' AND perm.action IN ('view', 'manage_tasks') THEN TRUE
                WHEN perm.module = 'chat' AND perm.action = 'view' THEN TRUE
                WHEN perm.module = 'calendar' AND perm.action = 'view' THEN TRUE
                WHEN perm.module = 'organisation' AND perm.action = 'view' THEN TRUE
                WHEN perm.module = 'wfh' AND perm.action IN ('view', 'create') THEN TRUE
                WHEN perm.module = 'shifts' AND perm.action = 'view' THEN TRUE
                ELSE FALSE
            END
        )
        ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Seed permissions for ALL existing tenants
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN SELECT id FROM tenants LOOP
        PERFORM seed_role_permissions_for_tenant(t.id);
    END LOOP;
END $$;
