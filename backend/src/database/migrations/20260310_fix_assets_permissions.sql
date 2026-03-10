-- ===================================================================
-- ADD GRANULAR ASSET PERMISSIONS
-- Migration: 20260310_fix_assets_permissions.sql
-- ===================================================================

-- 1. Insert granular permissions
INSERT INTO permissions (module, action, label, description) VALUES
    ('assets', 'create', 'Add Asset', 'Permission to create new asset records'),
    ('assets', 'update', 'Edit Asset', 'Permission to modify existing asset details'),
    ('assets', 'delete', 'Delete Asset', 'Permission to retire or delete asset records'),
    ('assets', 'manage_requests', 'Manage Asset Requests', 'Approve or reject asset requests from employees'),
    ('assets', 'request', 'Request Asset', 'Permission to submit asset requests')
ON CONFLICT (module, action) DO NOTHING;

-- Seed these permissions for ADMIN and HR roles across all tenants
DO $$
DECLARE
    t RECORD;
    perm RECORD;
BEGIN
    FOR t IN SELECT id FROM tenants LOOP
        -- Grant to ADMIN (always enabled)
        FOR perm IN 
            SELECT id FROM permissions 
            WHERE module = 'assets' AND action IN ('create', 'update', 'delete', 'manage_requests')
        LOOP
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'ADMIN', perm.id, TRUE)
            ON CONFLICT (tenant_id, role, permission_id) DO UPDATE SET enabled = TRUE;
        END LOOP;

        -- Grant to HR
        FOR perm IN 
            SELECT id FROM permissions 
            WHERE module = 'assets' AND action IN ('create', 'update', 'delete', 'manage_requests', 'request')
        LOOP
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'HR', perm.id, TRUE)
            ON CONFLICT (tenant_id, role, permission_id) DO UPDATE SET enabled = TRUE;
        END LOOP;

        -- Grant to MANAGER and EMPLOYEE (only request)
        FOR perm IN 
            SELECT id FROM permissions 
            WHERE module = 'assets' AND action = 'request'
        LOOP
            -- Grant to MANAGER
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'MANAGER', perm.id, TRUE)
            ON CONFLICT (tenant_id, role, permission_id) DO UPDATE SET enabled = TRUE;

            -- Grant to EMPLOYEE
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'EMPLOYEE', perm.id, TRUE)
            ON CONFLICT (tenant_id, role, permission_id) DO UPDATE SET enabled = TRUE;
        END LOOP;
    END LOOP;
END $$;
