BEGIN;

INSERT INTO users (
    tenant_id,
    email,
    password_hash,
    role,
    is_active,
    must_change_password,
    created_by
)
VALUES (
    NULL,
    'admin@gmail.com',
    crypt('Admin@123', gen_salt('bf')),
    'SUPER_ADMIN',
    TRUE,
    FALSE,
    NULL
);

-- ===================================================================
-- HRMS SAAS - SEED USERS
-- ===================================================================
-- Replace this with a real password hash generated from scripts/generate-hash.js
-- We are using a placeholder here because the script is not allowed to be run in this environment.
-- ===================================================================
-- Assign SUPER_ADMIN role to the platform admin
-- ===================================================================
INSERT INTO user_roles (user_id, role_id, tenant_id, assigned_at)
SELECT u.id, r.id, NULL, NOW()
FROM users u, roles r
WHERE u.email = 'admin@gmail.com' AND u.tenant_id IS NULL
  AND r.name = 'SUPER_ADMIN' AND r.tenant_id IS NULL
ON CONFLICT DO NOTHING;

-- ===================================================================
-- Seed Tenant Users + RBAC Assignments
-- ===================================================================
DO $$
DECLARE
    p_hash TEXT := '$2b$10$V.2aOBq3FBsMPy7pir8R.OImpRMtkQu.R9N1zIr.vrA9ryd5zepmy';
    v_tenant_id UUID;
    v_admin_user_id UUID;
    v_hr_user_id UUID; 
    v_employee1_user_id UUID;
    v_employee2_user_id UUID;
    v_manager_user_id UUID;
    v_admin_role_id UUID;
    v_employee_role_id UUID;
    sys_role RECORD;
    new_role_id UUID;
BEGIN

-- 1. Create a new tenant
INSERT INTO tenants (name, domain, email)
VALUES ('Seed Tenant', 'seedtenant', 'contact@seedtenant.com')
RETURNING id INTO v_tenant_id;

-- 1.1 Clone system roles to this tenant (with their permissions)
FOR sys_role IN SELECT * FROM roles WHERE tenant_id IS NULL AND role_type = 'SYSTEM' LOOP
    IF NOT EXISTS (SELECT 1 FROM roles WHERE tenant_id = v_tenant_id AND name = sys_role.name) THEN
        INSERT INTO roles (tenant_id, name, description, role_type, is_deletable, is_customizable)
        VALUES (v_tenant_id, sys_role.name, sys_role.description, 'SYSTEM', false, true)
        RETURNING id INTO new_role_id;

        -- Copy permissions from system role template
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT new_role_id, permission_id FROM role_permissions WHERE role_id = sys_role.id
        ON CONFLICT DO NOTHING;
    END IF;
END LOOP;

-- Grab tenant-specific role IDs for assignments
SELECT id INTO v_admin_role_id FROM roles WHERE tenant_id = v_tenant_id AND name = 'ADMIN';
SELECT id INTO v_employee_role_id FROM roles WHERE tenant_id = v_tenant_id AND name = 'EMPLOYEE';

-- 2. Create an ADMIN user and employee
INSERT INTO users (tenant_id, email, password_hash, role, must_change_password)
VALUES (v_tenant_id, 'contact@seedtenant.com', p_hash, 'ADMIN', false)
RETURNING id INTO v_admin_user_id;

INSERT INTO employees (tenant_id, user_id, first_name, last_name)
VALUES (v_tenant_id, v_admin_user_id, 'Admin', 'User');

INSERT INTO user_roles (user_id, role_id, tenant_id, assigned_at)
VALUES (v_admin_user_id, v_admin_role_id, v_tenant_id, NOW());

-- 3. Create an HR user and employee (mapped to EMPLOYEE role)
INSERT INTO users (tenant_id, email, password_hash, role, must_change_password)
VALUES (v_tenant_id, 'testhr@seedtenant.com', p_hash, 'EMPLOYEE', false)
RETURNING id INTO v_hr_user_id;

INSERT INTO employees (tenant_id, user_id, first_name, last_name)
VALUES (v_tenant_id, v_hr_user_id, 'HR', 'User');

INSERT INTO user_roles (user_id, role_id, tenant_id, assigned_at)
VALUES (v_hr_user_id, v_employee_role_id, v_tenant_id, NOW());

-- 4. Create an EMPLOYEE user and employee
INSERT INTO users (tenant_id, email, password_hash, role, must_change_password)
VALUES (v_tenant_id, 'testemployee1@seedtenant.com', p_hash, 'EMPLOYEE', false)
RETURNING id INTO v_employee1_user_id;

INSERT INTO employees (tenant_id, user_id, first_name, last_name)
VALUES (v_tenant_id, v_employee1_user_id, 'Employee', 'One');

INSERT INTO user_roles (user_id, role_id, tenant_id, assigned_at)
VALUES (v_employee1_user_id, v_employee_role_id, v_tenant_id, NOW());

-- 5. Create another EMPLOYEE user and employee
INSERT INTO users (tenant_id, email, password_hash, role, must_change_password)
VALUES (v_tenant_id, 'testemployee2@seedtenant.com', p_hash, 'EMPLOYEE', false)
RETURNING id INTO v_employee2_user_id;

INSERT INTO employees (tenant_id, user_id, first_name, last_name)
VALUES (v_tenant_id, v_employee2_user_id, 'Employee', 'Two');

INSERT INTO user_roles (user_id, role_id, tenant_id, assigned_at)
VALUES (v_employee2_user_id, v_employee_role_id, v_tenant_id, NOW());

-- 6. Create a MANAGER user and employee (mapped to EMPLOYEE role)
INSERT INTO users (tenant_id, email, password_hash, role, must_change_password)
VALUES (v_tenant_id, 'testmanager2@seedtenant.com', p_hash, 'EMPLOYEE', false)
RETURNING id INTO v_manager_user_id;

INSERT INTO employees (tenant_id, user_id, first_name, last_name)
VALUES (v_tenant_id, v_manager_user_id, 'Manager', 'User');

INSERT INTO user_roles (user_id, role_id, tenant_id, assigned_at)
VALUES (v_manager_user_id, v_employee_role_id, v_tenant_id, NOW());

END $$;

COMMIT;
