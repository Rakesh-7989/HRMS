-- ===================================================================
-- REDEFINE ADMIN PERMISSION SEEDING
-- Migration: 20260311_fix_admin_seeding.sql
-- ===================================================================

CREATE OR REPLACE FUNCTION seed_role_permissions_for_tenant(p_tenant_id UUID) RETURNS void AS $$
DECLARE
    v_admin_role_id UUID;
    v_hr_role_id UUID;
    v_manager_role_id UUID;
    v_employee_role_id UUID;
BEGIN
    -- 1. Ensure core roles exist for the tenant
    INSERT INTO roles (tenant_id, name, description, is_system_role)
    VALUES 
        (p_tenant_id, 'ADMIN', 'Full access to all tenant modules and settings', true),
        (p_tenant_id, 'HR', 'Human Resources management', true),
        (p_tenant_id, 'MANAGER', 'Team and departmental management', true),
        (p_tenant_id, 'EMPLOYEE', 'Standard employee access', true)
    ON CONFLICT (tenant_id, name) DO NOTHING;

    -- Get Role IDs
    SELECT id INTO v_admin_role_id FROM roles WHERE tenant_id = p_tenant_id AND name = 'ADMIN';
    SELECT id INTO v_hr_role_id FROM roles WHERE tenant_id = p_tenant_id AND name = 'HR';
    SELECT id INTO v_manager_role_id FROM roles WHERE tenant_id = p_tenant_id AND name = 'MANAGER';
    SELECT id INTO v_employee_role_id FROM roles WHERE tenant_id = p_tenant_id AND name = 'EMPLOYEE';

    -- 2. ADMIN: Grant ALL existing permissions dynamically
    INSERT INTO role_permissions (role_id, module, action)
    SELECT v_admin_role_id, module, action FROM permissions
    ON CONFLICT (role_id, module, action) DO NOTHING;

    -- 3. HR: Grant most permissions (Excluding billing, advanced system settings, etc)
    INSERT INTO role_permissions (role_id, module, action)
    SELECT v_hr_role_id, module, action FROM permissions
    WHERE module NOT IN ('system', 'billing', 'db_admin', 'super_admin')
    ON CONFLICT (role_id, module, action) DO NOTHING;

    -- 4. MANAGER: Managerial permissions
    INSERT INTO role_permissions (role_id, module, action)
    SELECT v_manager_role_id, module, action FROM permissions
    WHERE module IN ('attendance', 'leave', 'projects', 'documents') 
    AND action IN ('view', 'approve', 'view_team')
    ON CONFLICT (role_id, module, action) DO NOTHING;

    -- 5. EMPLOYEE: Basic self-service permissions
    INSERT INTO role_permissions (role_id, module, action)
    SELECT v_employee_role_id, module, action FROM permissions
    WHERE module IN ('attendance', 'leave', 'documents', 'projects') 
    AND action IN ('view_my', 'view_personal', 'view', 'clock_in_out')
    ON CONFLICT (role_id, module, action) DO NOTHING;

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
