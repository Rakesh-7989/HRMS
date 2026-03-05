-- ===================================================================
-- HRMS SAAS - MULTI-TENANT DEMO DATA SEED
-- Creates 3 Tenants with different plans: Standard, Premium, Elite
-- ===================================================================

DO $$
DECLARE
    -- Plan IDs (Verified from DB)
    v_plan_std UUID := '4f0ef514-28fe-4a6c-995d-305f89b77fb0';
    v_plan_prm UUID := 'f9ff9a1a-77c1-4002-a699-aeaf95338bf0';
    v_plan_elt UUID := '814a8807-bdd6-4e6b-8c39-277a6972a31f';

    -- Tenant IDs
    v_tenant_std UUID;
    v_tenant_prm UUID;
    v_tenant_elt UUID;

    -- Common Variables
    v_user_id UUID;
    v_emp_id UUID;
    v_dept_id UUID;
    v_desig_id UUID;
    p_hash TEXT := '$2b$10$toJpVrPEo5Gm7tbAS6S1V.kHTfavqzmA8Dx5tMGm6xbJJ49PMliLy'; -- 'password123'
BEGIN

    -- 0. Cleanup existing demo data
    DELETE FROM tenants WHERE domain IN ('standard.demo', 'premium.demo', 'elite.demo');

    -- Assign Tenant IDs
    v_tenant_std := uuid_generate_v4();
    v_tenant_prm := uuid_generate_v4();
    v_tenant_elt := uuid_generate_v4();

    -- ===================================================================
    -- 1. TENANT: STANDARD CORP (STANDARD PLAN)
    -- ===================================================================
    INSERT INTO tenants (id, name, domain, email, plan_type, is_active)
    VALUES (v_tenant_std, 'Standard Corp', 'standard.demo', 'contact@standard.demo', 1, true);

    INSERT INTO subscriptions (tenant_id, plan_id, status, billing_cycle, start_date, end_date)
    VALUES (v_tenant_std, v_plan_std, 'ACTIVE', 'MONTHLY', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year');

    -- Departments & Designations for Standard
    INSERT INTO departments (id, tenant_id, name) VALUES (uuid_generate_v4(), v_tenant_std, 'General Administration') RETURNING id INTO v_dept_id;
    INSERT INTO designations (id, tenant_id, name) VALUES (uuid_generate_v4(), v_tenant_std, 'Admin Assistant') RETURNING id INTO v_desig_id;

    -- Standard Admin
    INSERT INTO users (id, tenant_id, email, password_hash, role, is_active, must_change_password)
    VALUES (uuid_generate_v4(), v_tenant_std, 'admin@standard.demo', p_hash, 'ADMIN', true, false) RETURNING id INTO v_user_id;
    INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, department_id, designation_id, join_date)
    VALUES (uuid_generate_v4(), v_tenant_std, v_user_id, 'Alice', 'Admin', v_dept_id, v_desig_id, CURRENT_DATE - INTERVAL '1 month');

    -- Standard HR
    INSERT INTO users (id, tenant_id, email, password_hash, role, is_active, must_change_password)
    VALUES (uuid_generate_v4(), v_tenant_std, 'hr@standard.demo', p_hash, 'HR', true, false) RETURNING id INTO v_user_id;
    INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, department_id, designation_id, join_date)
    VALUES (uuid_generate_v4(), v_tenant_std, v_user_id, 'Sarah', 'Standard', v_dept_id, v_desig_id, CURRENT_DATE - INTERVAL '1 month');

    -- Standard Manager
    INSERT INTO users (id, tenant_id, email, password_hash, role, is_active, must_change_password)
    VALUES (uuid_generate_v4(), v_tenant_std, 'manager@standard.demo', p_hash, 'MANAGER', true, false) RETURNING id INTO v_user_id;
    INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, department_id, designation_id, join_date)
    VALUES (uuid_generate_v4(), v_tenant_std, v_user_id, 'Mike', 'Manager', v_dept_id, v_desig_id, CURRENT_DATE - INTERVAL '2 months');

    -- Standard Employee
    INSERT INTO users (id, tenant_id, email, password_hash, role, is_active, must_change_password)
    VALUES (uuid_generate_v4(), v_tenant_std, 'employee@standard.demo', p_hash, 'EMPLOYEE', true, false) RETURNING id INTO v_user_id;
    INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, department_id, designation_id, join_date)
    VALUES (uuid_generate_v4(), v_tenant_std, v_user_id, 'John', 'Doe', v_dept_id, v_desig_id, CURRENT_DATE - INTERVAL '3 months');

    -- ===================================================================
    -- 2. TENANT: PREMIUM SOLUTIONS (PREMIUM PLAN)
    -- ===================================================================
    INSERT INTO tenants (id, name, domain, email, plan_type, is_active)
    VALUES (v_tenant_prm, 'Premium Solutions', 'premium.demo', 'contact@premium.demo', 2, true);

    INSERT INTO subscriptions (tenant_id, plan_id, status, billing_cycle, start_date, end_date)
    VALUES (v_tenant_prm, v_plan_prm, 'ACTIVE', 'YEARLY', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year');

    -- Departments & Designations for Premium
    INSERT INTO departments (id, tenant_id, name) VALUES (uuid_generate_v4(), v_tenant_prm, 'Software Development') RETURNING id INTO v_dept_id;
    INSERT INTO designations (id, tenant_id, name) VALUES (uuid_generate_v4(), v_tenant_prm, 'Senior Developer') RETURNING id INTO v_desig_id;

    -- Premium Admin
    INSERT INTO users (id, tenant_id, email, password_hash, role, is_active, must_change_password)
    VALUES (uuid_generate_v4(), v_tenant_prm, 'admin@premium.demo', p_hash, 'ADMIN', true, false) RETURNING id INTO v_user_id;
    INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, department_id, designation_id, join_date)
    VALUES (uuid_generate_v4(), v_tenant_prm, v_user_id, 'Andrew', 'Admin', v_dept_id, v_desig_id, CURRENT_DATE - INTERVAL '6 months');

    -- Premium HR
    INSERT INTO users (id, tenant_id, email, password_hash, role, is_active, must_change_password)
    VALUES (uuid_generate_v4(), v_tenant_prm, 'hr@premium.demo', p_hash, 'HR', true, false) RETURNING id INTO v_user_id;
    INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, department_id, designation_id, join_date)
    VALUES (uuid_generate_v4(), v_tenant_prm, v_user_id, 'Paula', 'Premium', v_dept_id, v_desig_id, CURRENT_DATE - INTERVAL '6 months');

    -- Premium Manager
    INSERT INTO users (id, tenant_id, email, password_hash, role, is_active, must_change_password)
    VALUES (uuid_generate_v4(), v_tenant_prm, 'manager@premium.demo', p_hash, 'MANAGER', true, false) RETURNING id INTO v_user_id;
    INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, department_id, designation_id, join_date)
    VALUES (uuid_generate_v4(), v_tenant_prm, v_user_id, 'Mark', 'Manager', v_dept_id, v_desig_id, CURRENT_DATE - INTERVAL '8 months');

    -- Premium Custom Role: Recruitment Specialist
    INSERT INTO roles (name, description) VALUES ('RECRUITER', 'Specialized recruitment role') ON CONFLICT DO NOTHING;
    INSERT INTO users (id, tenant_id, email, password_hash, role, is_active, must_change_password)
    VALUES (uuid_generate_v4(), v_tenant_prm, 'recruiter@premium.demo', p_hash, 'RECRUITER', true, false) RETURNING id INTO v_user_id;
    INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, department_id, designation_id, join_date)
    VALUES (uuid_generate_v4(), v_tenant_prm, v_user_id, 'Ray', 'Recruiter', v_dept_id, v_desig_id, CURRENT_DATE - INTERVAL '2 months');

    -- ===================================================================
    -- 3. TENANT: ELITE ENTERPRISES (ELITE PLAN)
    -- ===================================================================
    INSERT INTO tenants (id, name, domain, email, plan_type, is_active)
    VALUES (v_tenant_elt, 'Elite Enterprises', 'elite.demo', 'contact@elite.demo', 3, true);

    INSERT INTO subscriptions (tenant_id, plan_id, status, billing_cycle, start_date, end_date)
    VALUES (v_tenant_elt, v_plan_elt, 'ACTIVE', 'YEARLY', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 years');

    -- Departments & Designations for Elite
    INSERT INTO departments (id, tenant_id, name) VALUES (uuid_generate_v4(), v_tenant_elt, 'Executive Leadership') RETURNING id INTO v_dept_id;
    INSERT INTO designations (id, tenant_id, name) VALUES (uuid_generate_v4(), v_tenant_elt, 'Chief Strategy Officer') RETURNING id INTO v_desig_id;

    -- Elite Admin
    INSERT INTO users (id, tenant_id, email, password_hash, role, is_active, must_change_password)
    VALUES (uuid_generate_v4(), v_tenant_elt, 'admin@elite.demo', p_hash, 'ADMIN', true, false) RETURNING id INTO v_user_id;
    INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, department_id, designation_id, join_date)
    VALUES (uuid_generate_v4(), v_tenant_elt, v_user_id, 'Arthur', 'Admin', v_dept_id, v_desig_id, CURRENT_DATE - INTERVAL '1 year');

    -- Elite HR
    INSERT INTO users (id, tenant_id, email, password_hash, role, is_active, must_change_password)
    VALUES (uuid_generate_v4(), v_tenant_elt, 'hr@elite.demo', p_hash, 'HR', true, false) RETURNING id INTO v_user_id;
    INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, department_id, designation_id, join_date)
    VALUES (uuid_generate_v4(), v_tenant_elt, v_user_id, 'Edward', 'Elite', v_dept_id, v_desig_id, CURRENT_DATE - INTERVAL '1 year');

    -- Elite Manager
    INSERT INTO users (id, tenant_id, email, password_hash, role, is_active, must_change_password)
    VALUES (uuid_generate_v4(), v_tenant_elt, 'manager@elite.demo', p_hash, 'MANAGER', true, false) RETURNING id INTO v_user_id;
    INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, department_id, designation_id, join_date)
    VALUES (uuid_generate_v4(), v_tenant_elt, v_user_id, 'Emily', 'Executive', v_dept_id, v_desig_id, CURRENT_DATE - INTERVAL '1.5 years');

    -- Elite Custom Role: Audit Manager
    INSERT INTO roles (name, description) VALUES ('AUDITOR', 'Internal audit and compliance') ON CONFLICT DO NOTHING;
    INSERT INTO users (id, tenant_id, email, password_hash, role, is_active, must_change_password)
    VALUES (uuid_generate_v4(), v_tenant_elt, 'auditor@elite.demo', p_hash, 'AUDITOR', true, false) RETURNING id INTO v_user_id;
    INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, department_id, designation_id, join_date)
    VALUES (uuid_generate_v4(), v_tenant_elt, v_user_id, 'Arthur', 'Audit', v_dept_id, v_desig_id, CURRENT_DATE - INTERVAL '4 months');

    -- ===================================================================
    -- 4. SEED ROLE PERMISSIONS
    -- ===================================================================
    PERFORM seed_role_permissions_for_tenant(v_tenant_std);
    PERFORM seed_role_permissions_for_tenant(v_tenant_prm);
    PERFORM seed_role_permissions_for_tenant(v_tenant_elt);

    -- Ensure custom roles also get some basic permissions (cloning from EMPLOYEE)
    -- This is a bit of a hack but ensures they can at least log in and see basics
    INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
    SELECT v_tenant_prm, 'RECRUITER', permission_id, enabled 
    FROM role_permissions WHERE tenant_id = v_tenant_prm AND role = 'EMPLOYEE'
    ON CONFLICT DO NOTHING;

    INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
    SELECT v_tenant_elt, 'AUDITOR', permission_id, enabled 
    FROM role_permissions WHERE tenant_id = v_tenant_elt AND role = 'EMPLOYEE'
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Multi-tenant demo data seeded successfully!';
END $$;
