-- ===================================================================
-- HRMS SAAS - DEMO DATA SEED
-- Run this AFTER seed_users.sql to add demo data for client presentation
-- ===================================================================

-- This script adds demo data to an EXISTING tenant for dashboard presentation
-- It requires tenant to already exist (created via seed_users.sql or registration)

DO $$
DECLARE
    v_tenant_id UUID;
    v_dept_engineering UUID;
    v_dept_sales UUID;
    v_dept_marketing UUID;
    v_dept_finance UUID;
    v_dept_operations UUID;
    v_design_senior UUID;
    v_design_junior UUID;
    v_design_lead UUID;
    v_design_manager UUID;
    v_design_director UUID;
    v_leave_type_annual UUID;
    v_leave_type_sick UUID;
    v_leave_type_casual UUID;
    v_leave_type_wfh UUID;
    v_emp_id UUID;
    v_user_id UUID;
    v_manager_emp_id UUID;
    p_hash TEXT := '$2b$10$V.2aOBq3FBsMPy7pir8R.OImpRMtkQu.R9N1zIr.vrA9ryd5zepmy';
    i INTEGER;
BEGIN

-- Get the first tenant (or you can specify a specific one)
SELECT id INTO v_tenant_id FROM tenants WHERE is_active = true LIMIT 1;

IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No active tenant found. Run seed_users.sql first.';
END IF;

RAISE NOTICE 'Seeding demo data for tenant: %', v_tenant_id;

-- ===================================================================
-- 1. DEPARTMENTS
-- ===================================================================
INSERT INTO departments (id, tenant_id, name, description, is_active)
VALUES 
    (uuid_generate_v4(), v_tenant_id, 'Engineering', 'Software Development & Technology', true),
    (uuid_generate_v4(), v_tenant_id, 'Sales', 'Business Development & Sales', true),
    (uuid_generate_v4(), v_tenant_id, 'Marketing', 'Marketing & Brand Management', true),
    (uuid_generate_v4(), v_tenant_id, 'Finance', 'Accounting & Financial Operations', true),
    (uuid_generate_v4(), v_tenant_id, 'Operations', 'Business Operations & Support', true),
    (uuid_generate_v4(), v_tenant_id, 'Product', 'Product Management', true),
    (uuid_generate_v4(), v_tenant_id, 'Design', 'UI/UX Design Team', true),
    (uuid_generate_v4(), v_tenant_id, 'Customer Success', 'Customer Support & Success', true)
ON CONFLICT DO NOTHING;

-- Get department IDs
SELECT id INTO v_dept_engineering FROM departments WHERE tenant_id = v_tenant_id AND name = 'Engineering' LIMIT 1;
SELECT id INTO v_dept_sales FROM departments WHERE tenant_id = v_tenant_id AND name = 'Sales' LIMIT 1;
SELECT id INTO v_dept_marketing FROM departments WHERE tenant_id = v_tenant_id AND name = 'Marketing' LIMIT 1;
SELECT id INTO v_dept_finance FROM departments WHERE tenant_id = v_tenant_id AND name = 'Finance' LIMIT 1;
SELECT id INTO v_dept_operations FROM departments WHERE tenant_id = v_tenant_id AND name = 'Operations' LIMIT 1;

-- ===================================================================
-- 2. DESIGNATIONS
-- ===================================================================
INSERT INTO designations (id, tenant_id, name, description, is_active)
VALUES 
    (uuid_generate_v4(), v_tenant_id, 'Software Engineer', 'Junior to Mid-level Developer', true),
    (uuid_generate_v4(), v_tenant_id, 'Senior Software Engineer', 'Senior Developer', true),
    (uuid_generate_v4(), v_tenant_id, 'Tech Lead', 'Technical Team Lead', true),
    (uuid_generate_v4(), v_tenant_id, 'Engineering Manager', 'Engineering Team Manager', true),
    (uuid_generate_v4(), v_tenant_id, 'Director', 'Department Director', true),
    (uuid_generate_v4(), v_tenant_id, 'Sales Executive', 'Sales Representative', true),
    (uuid_generate_v4(), v_tenant_id, 'Sales Manager', 'Sales Team Manager', true),
    (uuid_generate_v4(), v_tenant_id, 'Marketing Executive', 'Marketing Specialist', true),
    (uuid_generate_v4(), v_tenant_id, 'Marketing Manager', 'Marketing Team Manager', true),
    (uuid_generate_v4(), v_tenant_id, 'Financial Analyst', 'Finance Team Member', true),
    (uuid_generate_v4(), v_tenant_id, 'Finance Manager', 'Finance Department Manager', true),
    (uuid_generate_v4(), v_tenant_id, 'Operations Coordinator', 'Operations Team Member', true),
    (uuid_generate_v4(), v_tenant_id, 'Product Manager', 'Product Team Lead', true),
    (uuid_generate_v4(), v_tenant_id, 'UX Designer', 'User Experience Designer', true),
    (uuid_generate_v4(), v_tenant_id, 'Intern', 'Internship Position', true)
ON CONFLICT DO NOTHING;

-- Get designation IDs
SELECT id INTO v_design_senior FROM designations WHERE tenant_id = v_tenant_id AND name = 'Senior Software Engineer' LIMIT 1;
SELECT id INTO v_design_junior FROM designations WHERE tenant_id = v_tenant_id AND name = 'Software Engineer' LIMIT 1;
SELECT id INTO v_design_lead FROM designations WHERE tenant_id = v_tenant_id AND name = 'Tech Lead' LIMIT 1;
SELECT id INTO v_design_manager FROM designations WHERE tenant_id = v_tenant_id AND name = 'Engineering Manager' LIMIT 1;
SELECT id INTO v_design_director FROM designations WHERE tenant_id = v_tenant_id AND name = 'Director' LIMIT 1;

-- ===================================================================
-- 3. LEAVE TYPES
-- ===================================================================
INSERT INTO leave_types (id, tenant_id, name, code, description, is_paid, requires_approval, is_active)
VALUES 
    (uuid_generate_v4(), v_tenant_id, 'Annual Leave', 'AL', 'Paid annual vacation leave', true, true, true),
    (uuid_generate_v4(), v_tenant_id, 'Sick Leave', 'SL', 'Medical sick leave', true, true, true),
    (uuid_generate_v4(), v_tenant_id, 'Casual Leave', 'CL', 'Casual/personal leave', true, true, true),
    (uuid_generate_v4(), v_tenant_id, 'Work From Home', 'WFH', 'Remote work request', true, true, true),
    (uuid_generate_v4(), v_tenant_id, 'Maternity Leave', 'ML', 'Maternity leave', true, true, true),
    (uuid_generate_v4(), v_tenant_id, 'Paternity Leave', 'PL', 'Paternity leave', true, true, true),
    (uuid_generate_v4(), v_tenant_id, 'Compensatory Off', 'CO', 'Comp-off for extra work', true, true, true),
    (uuid_generate_v4(), v_tenant_id, 'Unpaid Leave', 'UL', 'Leave without pay', false, true, true)
ON CONFLICT DO NOTHING;

-- Get leave type IDs
SELECT id INTO v_leave_type_annual FROM leave_types WHERE tenant_id = v_tenant_id AND code = 'AL' LIMIT 1;
SELECT id INTO v_leave_type_sick FROM leave_types WHERE tenant_id = v_tenant_id AND code = 'SL' LIMIT 1;
SELECT id INTO v_leave_type_casual FROM leave_types WHERE tenant_id = v_tenant_id AND code = 'CL' LIMIT 1;
SELECT id INTO v_leave_type_wfh FROM leave_types WHERE tenant_id = v_tenant_id AND code = 'WFH' LIMIT 1;

-- ===================================================================
-- 4. DEMO EMPLOYEES (20+ employees with varied data)
-- ===================================================================

-- Engineering Manager (will be reports_to for others)
INSERT INTO users (id, tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (uuid_generate_v4(), v_tenant_id, 'rahul.sharma@demo.com', p_hash, 'MANAGER', true, false)
RETURNING id INTO v_user_id;

INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, 
    department_id, designation_id, join_date, employment_type)
VALUES (uuid_generate_v4(), v_tenant_id, v_user_id, 'Rahul', 'Sharma', '+91-9876543210', 
    '1988-03-15', 'Male', v_dept_engineering, v_design_manager, '2022-01-15', 'FULL_TIME')
RETURNING id INTO v_manager_emp_id;

-- Engineering Team Members
INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (v_tenant_id, 'priya.patel@demo.com', p_hash, 'EMPLOYEE', true, false)
RETURNING id INTO v_user_id;
INSERT INTO employees (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, 
    department_id, designation_id, join_date, employment_type, reports_to)
VALUES (v_tenant_id, v_user_id, 'Priya', 'Patel', '+91-9876543211', 
    CURRENT_DATE + INTERVAL '8 days', 'Female', v_dept_engineering, v_design_senior, '2023-06-10', 'FULL_TIME', v_manager_emp_id);

INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (v_tenant_id, 'amit.kumar@demo.com', p_hash, 'EMPLOYEE', true, false)
RETURNING id INTO v_user_id;
INSERT INTO employees (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, 
    department_id, designation_id, join_date, employment_type, reports_to)
VALUES (v_tenant_id, v_user_id, 'Amit', 'Kumar', '+91-9876543212', 
    CURRENT_DATE + INTERVAL '15 days', 'Male', v_dept_engineering, v_design_junior, CURRENT_DATE - INTERVAL '10 days', 'FULL_TIME', v_manager_emp_id)
RETURNING id INTO v_emp_id;

INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (v_tenant_id, 'sneha.reddy@demo.com', p_hash, 'EMPLOYEE', true, false)
RETURNING id INTO v_user_id;
INSERT INTO employees (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, 
    department_id, designation_id, join_date, employment_type, reports_to)
VALUES (v_tenant_id, v_user_id, 'Sneha', 'Reddy', '+91-9876543213', 
    '1995-07-22', 'Female', v_dept_engineering, v_design_lead, '2021-03-01', 'FULL_TIME', v_manager_emp_id);

INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (v_tenant_id, 'vikram.singh@demo.com', p_hash, 'EMPLOYEE', true, false)
RETURNING id INTO v_user_id;
INSERT INTO employees (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, 
    department_id, designation_id, join_date, employment_type, reports_to)
VALUES (v_tenant_id, v_user_id, 'Vikram', 'Singh', '+91-9876543214', 
    CURRENT_DATE + INTERVAL '3 days', 'Male', v_dept_engineering, v_design_senior, CURRENT_DATE - INTERVAL '5 days', 'FULL_TIME', v_manager_emp_id);

INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (v_tenant_id, 'neha.gupta@demo.com', p_hash, 'EMPLOYEE', true, false)
RETURNING id INTO v_user_id;
INSERT INTO employees (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, 
    department_id, designation_id, join_date, employment_type, reports_to)
VALUES (v_tenant_id, v_user_id, 'Neha', 'Gupta', '+91-9876543215', 
    '1992-11-08', 'Female', v_dept_engineering, v_design_junior, '2024-01-02', 'FULL_TIME', v_manager_emp_id);

INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (v_tenant_id, 'arjun.menon@demo.com', p_hash, 'EMPLOYEE', true, false)
RETURNING id INTO v_user_id;
INSERT INTO employees (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, 
    department_id, designation_id, join_date, employment_type, reports_to)
VALUES (v_tenant_id, v_user_id, 'Arjun', 'Menon', '+91-9876543216', 
    CURRENT_DATE, 'Male', v_dept_engineering, v_design_junior, CURRENT_DATE - INTERVAL '20 days', 'FULL_TIME', v_manager_emp_id);

-- Sales Team
INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (v_tenant_id, 'anita.joshi@demo.com', p_hash, 'MANAGER', true, false)
RETURNING id INTO v_user_id;
INSERT INTO employees (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, 
    department_id, designation_id, join_date, employment_type)
VALUES (v_tenant_id, v_user_id, 'Anita', 'Joshi', '+91-9876543217', 
    '1985-09-20', 'Female', v_dept_sales, v_design_manager, '2020-08-15', 'FULL_TIME');

INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (v_tenant_id, 'ravi.krishna@demo.com', p_hash, 'EMPLOYEE', true, false)
RETURNING id INTO v_user_id;
INSERT INTO employees (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, 
    department_id, designation_id, join_date, employment_type)
VALUES (v_tenant_id, v_user_id, 'Ravi', 'Krishna', '+91-9876543218', 
    '1990-12-05', 'Male', v_dept_sales, v_design_junior, '2023-09-01', 'FULL_TIME');

INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (v_tenant_id, 'meera.nair@demo.com', p_hash, 'EMPLOYEE', true, false)
RETURNING id INTO v_user_id;
INSERT INTO employees (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, 
    department_id, designation_id, join_date, employment_type)
VALUES (v_tenant_id, v_user_id, 'Meera', 'Nair', '+91-9876543219', 
    CURRENT_DATE + INTERVAL '12 days', 'Female', v_dept_sales, v_design_junior, '2024-02-15', 'FULL_TIME');

-- Marketing Team
INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (v_tenant_id, 'karan.mehta@demo.com', p_hash, 'EMPLOYEE', true, false)
RETURNING id INTO v_user_id;
INSERT INTO employees (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, 
    department_id, designation_id, join_date, employment_type)
VALUES (v_tenant_id, v_user_id, 'Karan', 'Mehta', '+91-9876543220', 
    '1993-04-18', 'Male', v_dept_marketing, v_design_senior, '2022-11-01', 'FULL_TIME');

INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (v_tenant_id, 'divya.shah@demo.com', p_hash, 'EMPLOYEE', true, false)
RETURNING id INTO v_user_id;
INSERT INTO employees (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, 
    department_id, designation_id, join_date, employment_type)
VALUES (v_tenant_id, v_user_id, 'Divya', 'Shah', '+91-9876543221', 
    CURRENT_DATE + INTERVAL '5 days', 'Female', v_dept_marketing, v_design_junior, CURRENT_DATE - INTERVAL '15 days', 'FULL_TIME');

INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (v_tenant_id, 'suresh.iyer@demo.com', p_hash, 'EMPLOYEE', true, false)
RETURNING id INTO v_user_id;
INSERT INTO employees (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, 
    department_id, designation_id, join_date, employment_type)
VALUES (v_tenant_id, v_user_id, 'Suresh', 'Iyer', '+91-9876543222', 
    '1988-06-30', 'Male', v_dept_marketing, v_design_manager, '2019-04-10', 'FULL_TIME');

-- Finance Team
INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (v_tenant_id, 'lakshmi.rao@demo.com', p_hash, 'EMPLOYEE', true, false)
RETURNING id INTO v_user_id;
INSERT INTO employees (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, 
    department_id, designation_id, join_date, employment_type)
VALUES (v_tenant_id, v_user_id, 'Lakshmi', 'Rao', '+91-9876543223', 
    '1991-02-14', 'Female', v_dept_finance, v_design_senior, '2021-07-15', 'FULL_TIME');

INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (v_tenant_id, 'arun.varma@demo.com', p_hash, 'EMPLOYEE', true, false)
RETURNING id INTO v_user_id;
INSERT INTO employees (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, 
    department_id, designation_id, join_date, employment_type)
VALUES (v_tenant_id, v_user_id, 'Arun', 'Varma', '+91-9876543224', 
    CURRENT_DATE + INTERVAL '20 days', 'Male', v_dept_finance, v_design_junior, '2024-03-01', 'FULL_TIME');

-- Operations Team
INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (v_tenant_id, 'pooja.desai@demo.com', p_hash, 'EMPLOYEE', true, false)
RETURNING id INTO v_user_id;
INSERT INTO employees (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, 
    department_id, designation_id, join_date, employment_type)
VALUES (v_tenant_id, v_user_id, 'Pooja', 'Desai', '+91-9876543225', 
    '1994-08-25', 'Female', v_dept_operations, v_design_senior, '2022-05-20', 'FULL_TIME');

INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (v_tenant_id, 'sanjay.pillai@demo.com', p_hash, 'EMPLOYEE', true, false)
RETURNING id INTO v_user_id;
INSERT INTO employees (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, 
    department_id, designation_id, join_date, employment_type)
VALUES (v_tenant_id, v_user_id, 'Sanjay', 'Pillai', '+91-9876543226', 
    '1987-10-12', 'Male', v_dept_operations, v_design_manager, '2018-09-01', 'FULL_TIME');

INSERT INTO users (tenant_id, email, password_hash, role, is_active, must_change_password)
VALUES (v_tenant_id, 'kavitha.rajan@demo.com', p_hash, 'EMPLOYEE', true, false)
RETURNING id INTO v_user_id;
INSERT INTO employees (tenant_id, user_id, first_name, last_name, phone, date_of_birth, gender, 
    department_id, designation_id, join_date, employment_type)
VALUES (v_tenant_id, v_user_id, 'Kavitha', 'Rajan', '+91-9876543227', 
    CURRENT_DATE + INTERVAL '2 days', 'Female', v_dept_operations, v_design_junior, CURRENT_DATE - INTERVAL '3 days', 'FULL_TIME');

-- ===================================================================
-- 5. ATTENDANCE DATA (Last 30 days for various employees)
-- ===================================================================
FOR i IN 0..29 LOOP
    -- Insert attendance for random employees each day
    INSERT INTO attendance (tenant_id, employee_id, date, check_in_time, check_out_time, status, is_late, late_by_minutes, work_mode)
    SELECT 
        v_tenant_id,
        e.id,
        CURRENT_DATE - (i || ' days')::INTERVAL,
        CASE 
            WHEN random() < 0.15 THEN '09:30:00'::TIME -- Late
            WHEN random() < 0.3 THEN '08:45:00'::TIME
            ELSE '09:00:00'::TIME 
        END,
        CASE 
            WHEN random() < 0.1 THEN '17:30:00'::TIME -- Early leave
            WHEN random() < 0.3 THEN '19:00:00'::TIME -- Overtime
            ELSE '18:00:00'::TIME 
        END,
        'PRESENT',
        CASE WHEN random() < 0.15 THEN true ELSE false END,
        CASE WHEN random() < 0.15 THEN floor(random() * 30 + 10)::INT ELSE 0 END,
        CASE 
            WHEN random() < 0.2 THEN 'REMOTE'
            ELSE 'OFFICE'
        END
    FROM employees e
    WHERE e.tenant_id = v_tenant_id
    AND random() < 0.85  -- 85% attendance rate
    AND NOT EXISTS (
        SELECT 1 FROM attendance a 
        WHERE a.employee_id = e.id 
        AND a.date = CURRENT_DATE - (i || ' days')::INTERVAL
    )
    LIMIT 15;
END LOOP;

-- ===================================================================
-- 6. LEAVE APPLICATIONS (Mix of approved, pending, rejected)
-- ===================================================================

-- Approved leaves
INSERT INTO leave_applications (tenant_id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status, created_at)
SELECT 
    v_tenant_id,
    e.id,
    v_leave_type_annual,
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE - INTERVAL '3 days',
    3,
    'Family vacation',
    'APPROVED',
    CURRENT_DATE - INTERVAL '10 days'
FROM employees e WHERE e.tenant_id = v_tenant_id LIMIT 1 OFFSET 2;

INSERT INTO leave_applications (tenant_id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status, created_at)
SELECT 
    v_tenant_id,
    e.id,
    v_leave_type_sick,
    CURRENT_DATE - INTERVAL '7 days',
    CURRENT_DATE - INTERVAL '6 days',
    2,
    'Not feeling well',
    'APPROVED',
    CURRENT_DATE - INTERVAL '8 days'
FROM employees e WHERE e.tenant_id = v_tenant_id LIMIT 1 OFFSET 3;

INSERT INTO leave_applications (tenant_id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status, created_at)
SELECT 
    v_tenant_id,
    e.id,
    v_leave_type_casual,
    CURRENT_DATE - INTERVAL '15 days',
    CURRENT_DATE - INTERVAL '15 days',
    1,
    'Personal work',
    'APPROVED',
    CURRENT_DATE - INTERVAL '17 days'
FROM employees e WHERE e.tenant_id = v_tenant_id LIMIT 1 OFFSET 4;

INSERT INTO leave_applications (tenant_id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status, created_at)
SELECT 
    v_tenant_id,
    e.id,
    v_leave_type_wfh,
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE - INTERVAL '3 days',
    1,
    'Waiting for plumber at home',
    'APPROVED',
    CURRENT_DATE - INTERVAL '4 days'
FROM employees e WHERE e.tenant_id = v_tenant_id LIMIT 1 OFFSET 5;

-- Pending leaves
INSERT INTO leave_applications (tenant_id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status, created_at)
SELECT 
    v_tenant_id,
    e.id,
    v_leave_type_annual,
    CURRENT_DATE + INTERVAL '10 days',
    CURRENT_DATE + INTERVAL '15 days',
    6,
    'Planning a trip to Goa',
    'PENDING',
    CURRENT_DATE - INTERVAL '2 days'
FROM employees e WHERE e.tenant_id = v_tenant_id LIMIT 1 OFFSET 6;

INSERT INTO leave_applications (tenant_id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status, created_at)
SELECT 
    v_tenant_id,
    e.id,
    v_leave_type_casual,
    CURRENT_DATE + INTERVAL '3 days',
    CURRENT_DATE + INTERVAL '3 days',
    1,
    'Doctor appointment',
    'PENDING',
    CURRENT_DATE - INTERVAL '1 day'
FROM employees e WHERE e.tenant_id = v_tenant_id LIMIT 1 OFFSET 7;

INSERT INTO leave_applications (tenant_id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status, created_at)
SELECT 
    v_tenant_id,
    e.id,
    v_leave_type_sick,
    CURRENT_DATE + INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '7 days',
    3,
    'Medical procedure scheduled',
    'PENDING',
    CURRENT_DATE
FROM employees e WHERE e.tenant_id = v_tenant_id LIMIT 1 OFFSET 8;

-- Rejected leave
INSERT INTO leave_applications (tenant_id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status, rejection_reason, created_at)
SELECT 
    v_tenant_id,
    e.id,
    v_leave_type_annual,
    CURRENT_DATE - INTERVAL '20 days',
    CURRENT_DATE - INTERVAL '15 days',
    6,
    'Extended vacation request',
    'REJECTED',
    'Team has critical deadlines during this period',
    CURRENT_DATE - INTERVAL '25 days'
FROM employees e WHERE e.tenant_id = v_tenant_id LIMIT 1 OFFSET 9;

-- ===================================================================
-- 7. PUBLIC HOLIDAYS
-- ===================================================================
INSERT INTO public_holidays (tenant_id, name, date, year, is_paid)
VALUES 
    (v_tenant_id, 'Republic Day', '2026-01-26', 2026, true),
    (v_tenant_id, 'Holi', '2026-03-14', 2026, true),
    (v_tenant_id, 'Good Friday', '2026-04-03', 2026, true),
    (v_tenant_id, 'Eid ul-Fitr', '2026-03-31', 2026, true),
    (v_tenant_id, 'Independence Day', '2026-08-15', 2026, true),
    (v_tenant_id, 'Gandhi Jayanti', '2026-10-02', 2026, true),
    (v_tenant_id, 'Diwali', '2026-10-20', 2026, true),
    (v_tenant_id, 'Christmas', '2026-12-25', 2026, true)
ON CONFLICT DO NOTHING;

RAISE NOTICE 'Demo data seeding completed successfully!';

END $$;
