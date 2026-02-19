-- ===================================================================
-- COMPREHENSIVE RBAC SYSTEM MIGRATION (Consolidated)
-- Consolidates RBAC schema, roles, and refined permissions into one file.
-- ===================================================================

-- (no transaction wrapper — individual statements are idempotent)

-- ===================================================================
-- 1. ALTER EXISTING ROLES TABLE
-- ===================================================================
ALTER TABLE roles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS role_type VARCHAR(20) NOT NULL DEFAULT 'CUSTOM';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_deletable BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_customizable BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();
ALTER TABLE roles ALTER COLUMN name TYPE VARCHAR(100);

-- Drop old unique index on name, add new scoped indexes
DROP INDEX IF EXISTS roles_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS roles_unique_system ON roles(name) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS roles_unique_per_tenant ON roles(tenant_id, name) WHERE tenant_id IS NOT NULL;

-- ===================================================================
-- 2. CREATE PERMISSIONS & ROLE TABLES
-- ===================================================================
CREATE TABLE IF NOT EXISTS permissions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    category    VARCHAR(50) NOT NULL,
    description TEXT,
    resource    VARCHAR(50),
    action      VARCHAR(20),
    created_at  TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at    TIMESTAMP DEFAULT now(),
    UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
    scope_type    VARCHAR(30),
    scope_id      UUID,
    assigned_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at   TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_unique ON user_roles(
    user_id, 
    role_id, 
    COALESCE(scope_type, ''), 
    COALESCE(scope_id, '00000000-0000-0000-0000-000000000000')
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_perm ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON user_roles(tenant_id);

-- ===================================================================
-- 3. RLS HELPER FUNCTIONS & SECURITY
-- ===================================================================
CREATE OR REPLACE FUNCTION current_app_user()
RETURNS UUID LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.user_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION has_permission(perm_name TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
          AND p.name = perm_name
    );
$$;

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS permissions_select ON permissions;
CREATE POLICY permissions_select ON permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS role_permissions_select ON role_permissions;
CREATE POLICY role_permissions_select ON role_permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS role_permissions_manage ON role_permissions;
CREATE POLICY role_permissions_manage ON role_permissions FOR ALL
    USING (current_app_role() = 'SUPER_ADMIN' OR has_permission('manage_roles'));

DROP POLICY IF EXISTS user_roles_select ON user_roles;
CREATE POLICY user_roles_select ON user_roles FOR SELECT
    USING (current_app_role() = 'SUPER_ADMIN' OR tenant_id = current_tenant());

DROP POLICY IF EXISTS user_roles_manage ON user_roles;
CREATE POLICY user_roles_manage ON user_roles FOR ALL
    USING (current_app_role() = 'SUPER_ADMIN' OR (tenant_id = current_tenant() AND has_permission('assign_roles')));

-- Roles RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS roles_select ON roles;
CREATE POLICY roles_select ON roles FOR SELECT
    USING (tenant_id IS NULL OR current_app_role() = 'SUPER_ADMIN' OR tenant_id = current_tenant());

DROP POLICY IF EXISTS roles_insert ON roles;
CREATE POLICY roles_insert ON roles FOR INSERT
    WITH CHECK (current_app_role() = 'SUPER_ADMIN' OR (tenant_id = current_tenant() AND has_permission('manage_roles')));

DROP POLICY IF EXISTS roles_update ON roles;
CREATE POLICY roles_update ON roles FOR UPDATE
    USING (current_app_role() = 'SUPER_ADMIN' OR (tenant_id = current_tenant() AND has_permission('manage_roles')));

DROP POLICY IF EXISTS roles_delete ON roles;
CREATE POLICY roles_delete ON roles FOR DELETE
    USING (current_app_role() = 'SUPER_ADMIN' OR (tenant_id = current_tenant() AND has_permission('manage_roles') AND is_deletable = true));

-- ===================================================================
-- 4. SEED REFINED PERMISSIONS
-- ===================================================================
INSERT INTO permissions (name, category, description, resource, action) VALUES
-- Employees
('view_all_employees',     'employees', 'View employee list and details', 'employee', 'read'),
('create_employee',        'employees', 'Create new employees', 'employee', 'create'),
('edit_employee',          'employees', 'Edit employee information', 'employee', 'update'),
('delete_employee',        'employees', 'Delete/terminate employees', 'employee', 'delete'),
('view_employee_salary',   'employees', 'View employee salary info', 'employee', 'read'),
('manage_employee_docs',   'employees', 'Manage employee documents', 'employee', 'manage'),
('view_team_employees',    'employees', 'View direct reports and team members', 'employee', 'read'),
('view_self',              'employees', 'View own employee profile', 'employee', 'read'),

-- Leave
('view_own_leave',         'leave', 'View own leave balance and history', 'leave', 'read'),
('request_leave',          'leave', 'Apply for leave', 'leave', 'create'),
('approve_leave',          'leave', 'Approve/reject leave requests', 'leave', 'approve'),
('view_all_leave',         'leave', 'View all leave requests', 'leave', 'read'),
('view_team_leave',        'leave', 'View team leave requests', 'leave', 'read'),
('manage_leave_policies',  'leave', 'Manage leave types and policies', 'leave', 'manage'),
('manage_leave_balances',  'leave', 'Manage leave balances', 'leave', 'manage'),

-- Attendance
('view_own_attendance',    'attendance', 'View own attendance', 'attendance', 'read'),
('mark_attendance',        'attendance', 'Mark own attendance', 'attendance', 'create'),
('view_all_attendance',    'attendance', 'View all attendance records', 'attendance', 'read'),
('view_team_attendance',   'attendance', 'View team attendance', 'attendance', 'read'),
('manage_attendance_policies', 'attendance', 'Manage attendance settings/shifts', 'attendance', 'manage'),
('approve_attendance_regularization', 'attendance', 'Approve regularization requests', 'attendance', 'approve'),

-- Payroll
('view_own_payslip',       'payroll', 'View own salary/payslips', 'payroll', 'read'),
('view_all_payroll',       'payroll', 'View all payroll data', 'payroll', 'read'),
('view_team_payroll',      'payroll', 'View team payroll information', 'payroll', 'read'),
('manage_payroll_components', 'payroll', 'Manage payroll structures', 'payroll', 'manage'),
('process_payroll',        'payroll', 'Run payroll processing', 'payroll', 'process'),
('manage_loans',           'payroll', 'Manage employee loans', 'payroll', 'manage'),

-- Projects
('view_projects',          'projects', 'View projects', 'project', 'read'),
('create_projects',        'projects', 'Create projects', 'project', 'create'),
('manage_all_projects',    'projects', 'Manage all projects', 'project', 'manage'),
('manage_tasks',           'projects', 'Create/assign tasks', 'task', 'manage'),

-- Assets
('view_assets',            'assets', 'View assets', 'asset', 'read'),
('create_assets',          'assets', 'Create/add assets', 'asset', 'create'),
('manage_all_assets',      'assets', 'Manage all assets', 'asset', 'manage'),
('request_asset',          'assets', 'Request an asset', 'asset', 'create'),

-- Organisation
('view_organization_structure', 'organisation', 'View org structure', 'organization', 'read'),
('manage_departments',     'organisation', 'Manage departments', 'department', 'manage'),
('manage_designations',    'organisation', 'Manage designations', 'designation', 'manage'),
('manage_shifts',          'organisation', 'Manage work shifts', 'shift', 'manage'),

-- Roles & Admin
('view_roles',             'admin', 'View roles and permissions', 'role', 'read'),
('manage_roles',           'admin', 'Create/edit/delete roles', 'role', 'manage'),
('assign_roles',           'admin', 'Assign roles to users', 'role', 'assign'),
('view_admin_dashboard',   'admin', 'View admin dashboard', 'dashboard', 'read'),
('manage_organization',    'admin', 'Manage organization settings', 'organization', 'manage'),
('view_audit_logs',        'admin', 'View audit logs', 'audit', 'read'),
('manage_billing',         'admin', 'View billing/subscription', 'billing', 'manage'),
('manage_integrations',    'admin', 'Configure third-party integrations', 'integration', 'manage'),

-- Reports
('view_hr_reports',        'reports', 'View HR reports', 'report', 'read'),
('view_finance_reports',   'reports', 'View financial reports', 'report', 'read'),
('export_reports',         'reports', 'Export reports', 'report', 'export'),

-- General
('access_chat',            'general', 'Access chat', 'chat', 'read'),
('view_calendar',          'general', 'View calendar', 'calendar', 'read'),
('view_notifications',     'general', 'View notifications', 'notification', 'read'),
('calendar.manage',        'general', 'Manage calendar holidays and announcements', 'calendar', 'manage'),

-- Super Admin (Platform)
('platform.manage_tenants',    'platform', 'Manage all tenants', 'platform', 'manage'),
('platform.manage_plans',      'platform', 'Manage subscription plans', 'platform', 'manage'),
('platform.view_system_dashboard', 'platform', 'View platform dashboard', 'platform', 'read'),
('platform.manage_coupons',    'platform', 'Manage coupons', 'platform', 'manage')

ON CONFLICT (name) DO NOTHING;

-- ===================================================================
-- 5. CONSOLIDATE SYSTEM ROLES
-- ===================================================================

-- First, update any existing users in HR/MANAGER roles to EMPLOYEE role for simplification
UPDATE users SET role = 'EMPLOYEE', updated_at = now() WHERE role IN ('HR', 'MANAGER');

-- Ensure system roles exist
INSERT INTO roles (name, description, role_type, is_deletable, is_customizable, tenant_id)
VALUES 
    ('SUPER_ADMIN', 'Platform administrator with full system access', 'PLATFORM', false, false, NULL),
    ('ADMIN', 'Organization administrator', 'SYSTEM', false, true, NULL),
    ('EMPLOYEE', 'Regular employee', 'SYSTEM', false, true, NULL)
ON CONFLICT (name) WHERE tenant_id IS NULL DO NOTHING;

-- Functional Roles (Custom but templated)
INSERT INTO roles (name, description, role_type, is_deletable, is_customizable, tenant_id)
VALUES 
    ('CEO', 'Executive management with broad viewing permissions', 'CUSTOM', true, true, NULL),
    ('CFO', 'Financial management with payroll and billing access', 'CUSTOM', true, true, NULL),
    ('Department Head', 'Management over a specific department', 'CUSTOM', true, true, NULL)
ON CONFLICT (name) WHERE tenant_id IS NULL DO NOTHING;

-- ===================================================================
-- 6. FINAL PERMISSION ASSIGNMENTS
-- ===================================================================

-- SUPER_ADMIN: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'SUPER_ADMIN' AND r.tenant_id IS NULL
ON CONFLICT DO NOTHING;

-- ADMIN: All except platform
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'ADMIN' AND r.tenant_id IS NULL
  AND p.category != 'platform'
  AND p.name NOT IN ('mark_attendance', 'request_leave') -- Admins don't usually mark own time in admin view
ON CONFLICT DO NOTHING;

-- EMPLOYEE: Standard self-service
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'EMPLOYEE' AND r.tenant_id IS NULL
  AND p.name IN (
    'view_own_leave', 'request_leave', 'view_own_attendance', 'mark_attendance',
    'view_own_payslip', 'view_projects', 'view_assets', 'request_asset',
    'view_organization_structure', 'access_chat', 'view_calendar', 'view_notifications'
  )
ON CONFLICT DO NOTHING;

-- CEO
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'CEO' AND r.tenant_id IS NULL
  AND p.name IN (
    'view_all_employees', 'view_all_leave', 'view_all_attendance', 'view_all_payroll', 
    'view_hr_reports', 'view_organization_structure', 'view_finance_reports'
  )
ON CONFLICT DO NOTHING;

-- CFO
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'CFO' AND r.tenant_id IS NULL
  AND p.name IN (
    'view_all_payroll', 'process_payroll', 'manage_payroll_components', 
    'billing.manage', 'view_finance_reports'
  )
ON CONFLICT DO NOTHING;

-- ===================================================================
-- 7. TENANT CLONING & BACKFILL
-- ===================================================================

-- Ensure every tenant has copies of the SYSTEM roles
DO $$
DECLARE
    t_record RECORD;
    sys_role RECORD;
    new_role_id UUID;
BEGIN
    FOR t_record IN SELECT id FROM tenants LOOP
        FOR sys_role IN SELECT * FROM roles WHERE tenant_id IS NULL AND role_type = 'SYSTEM' LOOP
            IF NOT EXISTS (SELECT 1 FROM roles WHERE tenant_id = t_record.id AND name = sys_role.name) THEN
                INSERT INTO roles (tenant_id, name, description, role_type, is_deletable, is_customizable)
                VALUES (t_record.id, sys_role.name, sys_role.description, 'SYSTEM', false, true)
                RETURNING id INTO new_role_id;

                -- Copy permissions
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT new_role_id, permission_id FROM role_permissions WHERE role_id = sys_role.id
                ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Backfill user_roles for existing users
INSERT INTO user_roles (user_id, role_id, tenant_id, assigned_at)
SELECT 
    u.id,
    COALESCE(
        (SELECT r.id FROM roles r WHERE r.tenant_id = u.tenant_id AND r.name = u.role LIMIT 1),
        (SELECT r.id FROM roles r WHERE r.tenant_id IS NULL AND r.name = u.role LIMIT 1)
    ) as role_id,
    u.tenant_id,
    NOW()
FROM users u
WHERE u.role IS NOT NULL AND u.is_deleted = false
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id)
ON CONFLICT DO NOTHING;

-- done
