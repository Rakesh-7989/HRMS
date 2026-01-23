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
DO $$
DECLARE
    p_hash TEXT := '$2b$10$V.2aOBq3FBsMPy7pir8R.OImpRMtkQu.R9N1zIr.vrA9ryd5zepmy';
    v_tenant_id UUID;
    v_admin_user_id UUID;
    v_hr_user_id UUID; 
    v_employee1_user_id UUID;
    v_employee2_user_id UUID;
    v_manager_user_id UUID;
BEGIN

-- 1. Create a new tenant
INSERT INTO tenants (name, domain, email)
VALUES ('Seed Tenant', 'seedtenant', 'contact@seedtenant.com')
RETURNING id INTO v_tenant_id;

-- 2. Create an ADMIN user and employee
INSERT INTO users (tenant_id, email, password_hash, role, must_change_password)
VALUES (v_tenant_id, 'contact@seedtenant.com', p_hash, 'ADMIN', false)
RETURNING id INTO v_admin_user_id;

INSERT INTO employees (tenant_id, user_id, first_name, last_name)
VALUES (v_tenant_id, v_admin_user_id, 'Admin', 'User');

-- 3. Create an HR user and employee
INSERT INTO users (tenant_id, email, password_hash, role, must_change_password)
VALUES (v_tenant_id, 'testhr@seedtenant.com', p_hash, 'HR', false)
RETURNING id INTO v_hr_user_id;

INSERT INTO employees (tenant_id, user_id, first_name, last_name)
VALUES (v_tenant_id, v_hr_user_id, 'HR', 'User');

-- 4. Create an EMPLOYEE user and employee
INSERT INTO users (tenant_id, email, password_hash, role, must_change_password)
VALUES (v_tenant_id, 'testemployee1@seedtenant.com', p_hash, 'EMPLOYEE', false)
RETURNING id INTO v_employee1_user_id;

INSERT INTO employees (tenant_id, user_id, first_name, last_name)
VALUES (v_tenant_id, v_employee1_user_id, 'Employee', 'One');

-- 5. Create another EMPLOYEE user and employee
INSERT INTO users (tenant_id, email, password_hash, role, must_change_password)
VALUES (v_tenant_id, 'testemployee2@seedtenant.com', p_hash, 'EMPLOYEE', false)
RETURNING id INTO v_employee2_user_id;

INSERT INTO employees (tenant_id, user_id, first_name, last_name)
VALUES (v_tenant_id, v_employee2_user_id, 'Employee', 'Two');

-- 6. Create another MANAGER user and employee  
INSERT INTO users (tenant_id, email, password_hash, role, must_change_password)
VALUES (v_tenant_id, 'testmanager2@seedtenant.com', p_hash, 'MANAGER', false)
RETURNING id INTO v_manager_user_id;

INSERT INTO employees (tenant_id, user_id, first_name, last_name)
VALUES (v_tenant_id, v_manager_user_id, 'MANAGER', 'User');

END $$;

COMMIT;
