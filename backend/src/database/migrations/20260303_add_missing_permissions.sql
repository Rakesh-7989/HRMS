-- ===================================================================
-- ADD MISSING PERMISSIONS
-- Migration: 20260303_add_missing_permissions.sql
-- ===================================================================

-- 1. INSERT MISSING PERMISSIONS
INSERT INTO permissions (module, action, label, description) VALUES
    -- Geofencing
    ('geo_fencing', 'view', 'View Geofencing', 'View geofencing settings and locations'),
    ('geo_fencing', 'manage_settings', 'Manage Geofencing Settings', 'Configure global geofencing rules'),
    ('geo_fencing', 'manage_locations', 'Manage Locations', 'Create and edit geofenced locations'),
    ('geo_fencing', 'view_violations', 'View Violations', 'Access geofencing violation reports'),

    -- Shifts
    ('shifts', 'view', 'View Shifts', 'View shift schedules and details'),
    ('shifts', 'manage', 'Manage Shifts', 'Create and edit shift definitions'),
    ('shifts', 'assign', 'Assign Shifts', 'Assign shifts to employees'),

    -- WFH (Work From Home)
    ('wfh', 'view', 'View WFH Requests', 'View work from home applications'),
    ('wfh', 'create', 'Request WFH', 'Submit work from home requests'),
    ('wfh', 'approve', 'Approve WFH', 'Approve or reject WFH requests'),
    ('wfh', 'view_team_stats', 'View Team Capacity', 'Access team WFH/Leave capacity analytics'),

    -- Expenses
    ('expenses', 'view', 'View Expenses', 'View expense claims and history'),
    ('expenses', 'create', 'Submit Expense', 'Create new expense claims'),
    ('expenses', 'approve', 'Approve Expenses', 'Approve or reject expense claims'),
    ('expenses', 'manage_categories', 'Manage Expense Categories', 'Configure expense types and rules'),
    ('expenses', 'toggle_payroll', 'Payroll Inclusion', 'Toggle expense inclusion in payroll runs'),

    -- Documents
    ('documents', 'view', 'View Documents', 'Access employee documents and files'),
    ('documents', 'upload', 'Upload Documents', 'Upload new documents for employees'),
    ('documents', 'delete', 'Delete Documents', 'Remove employee documents'),

    -- Tasks (Inbox)
    ('tasks', 'view', 'View Tasks', 'View assigned tasks and status'),
    ('tasks', 'create', 'Create Tasks', 'Create and assign new tasks'),
    ('tasks', 'manage_status', 'Update Task Status', 'Change task completion status'),
    ('tasks', 'manage_activities', 'Manage Task Activities', 'Add and view task comments/activities'),

    -- Events
    ('events', 'view', 'View Events', 'Access people events, birthdays, and anniversaries')
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
            WHERE module IN ('geo_fencing', 'shifts', 'wfh', 'expenses', 'documents', 'tasks', 'events')
        LOOP
            -- ADMIN: full access to everything new
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'ADMIN', perm.id, TRUE)
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

            -- HR: full access to most new things
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'HR', perm.id, TRUE)
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

            -- MANAGER: access to view and approve/manage relevant things
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'MANAGER', perm.id,
                CASE
                    WHEN perm.action IN ('view', 'create', 'approve', 'assign', 'manage_tasks', 'view_team_stats', 'manage_activities', 'manage_status') THEN TRUE
                    ELSE FALSE
                END
            )
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

            -- EMPLOYEE: access to view and create relevant things
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'EMPLOYEE', perm.id,
                CASE
                    WHEN perm.module = 'geo_fencing' AND perm.action = 'view' THEN TRUE
                    WHEN perm.module = 'shifts' AND perm.action = 'view' THEN TRUE
                    WHEN perm.module IN ('wfh', 'expenses') AND perm.action IN ('view', 'create') THEN TRUE
                    WHEN perm.module = 'documents' AND perm.action = 'view' THEN TRUE
                    WHEN perm.module = 'tasks' AND perm.action IN ('view', 'manage_status', 'manage_activities') THEN TRUE
                    WHEN perm.module = 'events' AND perm.action = 'view' THEN TRUE
                    ELSE FALSE
                END
            )
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
