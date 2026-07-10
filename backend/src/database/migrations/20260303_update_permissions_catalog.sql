-- ===================================================================
-- UPDATE PERMISSIONS CATALOG
-- Migration: 20260303_update_permissions_catalog.sql
-- 
-- 1. Remove 'documents' module permissions
-- 2. Remove 'expenses' module permissions
-- 3. Add richer 'chat' module permissions
-- ===================================================================

-- Step 1: Clean up role_permissions and user_overrides referencing documents/expenses
DELETE FROM user_permission_overrides
WHERE permission_id IN (
    SELECT id FROM permissions WHERE module IN ('documents', 'expenses')
);

DELETE FROM role_permissions
WHERE permission_id IN (
    SELECT id FROM permissions WHERE module IN ('documents', 'expenses')
);

-- Step 2: Remove from master catalog
DELETE FROM permissions WHERE module IN ('documents', 'expenses');

-- Step 3: Add chat permissions (view already exists, add manage and create)
INSERT INTO permissions (module, action, label, description) VALUES
    ('chat', 'create', 'Create Channels', 'Create new chat channels and groups'),
    ('chat', 'manage', 'Manage Chat', 'Manage chat channels, delete messages, moderate')
ON CONFLICT (module, action) DO NOTHING;

-- Step 4: Seed the new chat permissions for all existing tenants
DO $$
DECLARE
    t RECORD;
    perm RECORD;
BEGIN
    FOR t IN SELECT id FROM tenants LOOP
        FOR perm IN SELECT id, module, action FROM permissions WHERE module = 'chat' AND action IN ('create', 'manage') LOOP
            -- ADMIN: full access
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'ADMIN', perm.id, TRUE)
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

            -- HR: full access to chat
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'HR', perm.id, TRUE)
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

            -- MANAGER: can create channels
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'MANAGER', perm.id,
                CASE WHEN perm.action = 'create' THEN TRUE ELSE FALSE END
            )
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

            -- EMPLOYEE: no manage/create by default
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'EMPLOYEE', perm.id, FALSE)
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
