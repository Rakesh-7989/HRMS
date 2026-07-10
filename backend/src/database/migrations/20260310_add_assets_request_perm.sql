-- Migration: 20260310_add_assets_request_perm.sql

-- 1. Insert the request permission
INSERT INTO permissions (module, action, label, description) VALUES
    ('assets', 'request', 'Request Asset', 'Permission to submit asset requests')
ON CONFLICT (module, action) DO NOTHING;

-- 2. Seed for all roles
DO $$
DECLARE
    t RECORD;
    perm_id UUID;
BEGIN
    SELECT id INTO perm_id FROM permissions WHERE module = 'assets' AND action = 'request';
    
    FOR t IN SELECT id FROM tenants LOOP
        -- Grant to ADMIN, HR, MANAGER, EMPLOYEE
        INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
        VALUES (t.id, 'ADMIN', perm_id, TRUE)
        ON CONFLICT (tenant_id, role, permission_id) DO UPDATE SET enabled = TRUE;

        INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
        VALUES (t.id, 'HR', perm_id, TRUE)
        ON CONFLICT (tenant_id, role, permission_id) DO UPDATE SET enabled = TRUE;

        INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
        VALUES (t.id, 'MANAGER', perm_id, TRUE)
        ON CONFLICT (tenant_id, role, permission_id) DO UPDATE SET enabled = TRUE;

        INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
        VALUES (t.id, 'EMPLOYEE', perm_id, TRUE)
        ON CONFLICT (tenant_id, role, permission_id) DO UPDATE SET enabled = TRUE;
    END LOOP;
END $$;
