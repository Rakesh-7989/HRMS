-- ===================================================================
-- REDEFINE ADMIN PERMISSION SEEDING
-- Migration: 20260311_fix_admin_seeding.sql
-- ===================================================================

-- Drop the function to avoid parameter name conflict: `cannot change name of input parameter "p_tenant"`
DROP FUNCTION IF EXISTS seed_role_permissions_for_tenant(uuid);

CREATE OR REPLACE FUNCTION seed_role_permissions_for_tenant(p_tenant_id UUID) RETURNS void AS $$
DECLARE
    perm RECORD;
BEGIN
    -- Loop through all existing permissions in the catalog
    FOR perm IN SELECT id, module, action FROM permissions LOOP
        -- ADMIN: full access to everything
        INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
        VALUES (p_tenant_id, 'ADMIN', perm.id, TRUE)
        ON CONFLICT (tenant_id, role, permission_id) DO UPDATE SET enabled = TRUE;

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

-- Immediately apply the new function to all existing tenants to fix any broken Admins
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN SELECT id FROM tenants LOOP
        PERFORM seed_role_permissions_for_tenant(t.id);
    END LOOP;
END $$;
