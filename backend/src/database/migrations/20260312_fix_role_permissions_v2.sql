-- ===================================================================
-- EMERGENCY FIX: RE-SEED ROLE PERMISSIONS UNIFORMLY
-- Migration: 20260312_fix_role_permissions_v2.sql
-- ===================================================================

-- 1. Force-drop the old function to resolve any name/parameter conflicts
DROP FUNCTION IF EXISTS seed_role_permissions_for_tenant(uuid);

-- 2. Create the correct version of the function ( matching actual schema )
CREATE OR REPLACE FUNCTION seed_role_permissions_for_tenant(p_tenant_id UUID) RETURNS void AS $$
DECLARE
    perm RECORD;
BEGIN
    -- Loop through all existing permissions in the catalog
    FOR perm IN SELECT id, module, action FROM permissions LOOP
        
        -- ADMIN: Grants EVERYTHING
        INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
        VALUES (p_tenant_id, 'ADMIN', perm.id, TRUE)
        ON CONFLICT (tenant_id, role, permission_id) DO UPDATE SET enabled = TRUE;

        -- HR: Standard HR permissions
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

        -- MANAGER: Managerial permissions
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

        -- EMPLOYEE: Standard self-service
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

-- 3. Run it for all existing tenants to repair any broken access
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN SELECT id FROM tenants LOOP
        PERFORM seed_role_permissions_for_tenant(t.id);
    END LOOP;
END $$;
