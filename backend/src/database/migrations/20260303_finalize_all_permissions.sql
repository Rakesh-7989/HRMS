-- ===================================================================
-- FINALIZE ALL PERMISSIONS
-- Migration: 20260303_finalize_all_permissions.sql
-- ===================================================================

-- 1. INSERT REMAINING PERMISSIONS
INSERT INTO permissions (module, action, label, description) VALUES
    -- Employees (Missed actions)
    ('employees', 'assign_department', 'Assign Department', 'Assign employees to departments'),
    ('employees', 'assign_designation', 'Assign Designation', 'Assign employees to designations'),
    ('employees', 'terminate', 'Terminate', 'Terminate employee contracts'),
    ('employees', 'manage_status', 'Manage Status', 'Activate/Deactivate user accounts'),

    -- Assets (Missed actions)
    ('assets', 'view_dashboard', 'Asset Dashboard', 'Access asset analytics dashboard'),
    ('assets', 'export', 'Export Assets', 'Export asset data to CSV'),
    ('assets', 'view_barcode', 'View Barcodes/QR', 'Generate and view asset barcodes'),
    ('assets', 'view_tracking', 'View Tracking', 'Access asset history and tracking logs'),
    ('assets', 'manage_requests', 'Manage Asset Requests', 'Handle employee asset requests'),

    -- Project Management (Granular)
    ('projects', 'view_kanban', 'View Kanban Board', 'Access project kanban board'),
    ('projects', 'manage_kanban', 'Manage Kanban Board', 'Configure board columns and move tasks'),
    ('projects', 'manage_members', 'Manage Members', 'Add or remove project members'),
    ('projects', 'view_reports', 'View Project Reports', 'Access project and utilization analytics'),
    ('projects', 'manage_timesheets', 'Manage Timesheets', 'View and edit all timesheets'),
    ('projects', 'approve_timesheets', 'Approve Timesheets', 'Approve/Reject team timesheets'),

    -- Calendar (Missed actions)
    ('calendar', 'manage_holidays', 'Manage Holidays', 'Configure company and state holidays'),
    ('calendar', 'manage_announcements', 'Manage Announcements', 'Create and delete company announcements'),

    -- Departments
    ('departments', 'view', 'View Departments', 'View list of departments'),
    ('departments', 'manage', 'Manage Departments', 'Create, edit, and delete departments'),

    -- Designations
    ('designations', 'view', 'View Designations', 'View list of designations'),
    ('designations', 'manage', 'Manage Designations', 'Create, edit, and delete designations')
ON CONFLICT (module, action) DO NOTHING;

-- 2. SEED FOR EXISTING TENANTS
DO $$
DECLARE
    t RECORD;
    perm RECORD;
BEGIN
    FOR t IN SELECT id FROM tenants LOOP
        FOR perm IN 
            SELECT id, module, action FROM permissions 
            WHERE module IN ('employees', 'assets', 'projects', 'calendar', 'departments', 'designations')
        LOOP
            -- ADMIN: full access to everything final
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'ADMIN', perm.id, TRUE)
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

            -- HR: full access to most final things
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'HR', perm.id, TRUE)
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

            -- MANAGER: access to view and relevant management
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'MANAGER', perm.id,
                CASE
                    -- Employees: Managers can view but not manage status/terminate
                    WHEN perm.module = 'employees' AND perm.action = 'view' THEN TRUE
                    -- Assets: Managers can view
                    WHEN perm.module = 'assets' AND perm.action IN ('view', 'view_dashboard') THEN TRUE
                    -- Projects: Managers get full control over projects
                    WHEN perm.module = 'projects' THEN TRUE
                    -- Departments/Designations/Calendar: Managers can view
                    WHEN perm.action = 'view' THEN TRUE
                    ELSE FALSE
                END
            )
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

            -- EMPLOYEE: view access only
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'EMPLOYEE', perm.id,
                CASE
                    WHEN perm.action = 'view' THEN TRUE
                    WHEN perm.module = 'projects' AND perm.action IN ('view_kanban', 'view_reports') THEN TRUE
                    ELSE FALSE
                END
            )
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
