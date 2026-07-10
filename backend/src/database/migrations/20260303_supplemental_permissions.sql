-- ===================================================================
-- SUPPLEMENTAL PERMISSIONS: ATTENDANCE & PAYROLL
-- Migration: 20260303_supplemental_permissions.sql
-- ===================================================================

-- 1. INSERT PERMISSIONS
INSERT INTO permissions (module, action, label, description) VALUES
    -- Attendance
    ('attendance', 'clock_in_out', 'Clock In/Out', 'Self clock in, clock out, and break management'),
    ('attendance', 'view_my', 'View My Attendance', 'View personal attendance history'),
    ('attendance', 'view_team', 'View Team Attendance', 'View attendance for direct or indirect reports'),
    ('attendance', 'view_all', 'View All Attendance', 'View attendance for all employees in the organisation'),
    ('attendance', 'approve', 'Approve Attendance', 'Approve/Reject attendance records'),
    ('attendance', 'manage_settings', 'Attendance Settings', 'Configure global attendance rules and auto-approvals'),
    ('attendance', 'view_analytics', 'Attendance Analytics', 'Access attendance dashboards and reports'),
    ('attendance', 'regularize', 'Regularization', 'Apply for and review attendance regularization requests'),

    -- Payroll (Payrun)
    ('payroll', 'view_dashboard', 'Payroll Dashboard', 'Access payroll summary and charts'),
    ('payroll', 'manage_schedules', 'Manage Pay Schedules', 'Create and edit pay schedules'),
    ('payroll', 'create_payrun', 'Create Payrun', 'Initiate a new payroll run'),
    ('payroll', 'view_payruns', 'View Payruns', 'View current and historical payroll runs'),
    ('payroll', 'calculate_payrun', 'Calculate Payroll', 'Trigger payroll calculations for a run'),
    ('payroll', 'approve_payrun', 'Approve Payroll', 'Final approval for payroll disbursement'),
    ('payroll', 'manage_payruns', 'Manage Payruns', 'Revoke, delete, or void payruns'),

    -- Payroll (Salary & Tax)
    ('payroll', 'manage_salary', 'Manage Salary Structures', 'Configure salary components and templates'),
    ('payroll', 'manage_statutory', 'Manage Statutory & Tax', 'Configure tax, PF, ESI, and other deductions'),
    ('payroll', 'view_payslips', 'View All Payslips', 'Access payslips for all employees'),
    ('payroll', 'manage_loans', 'Manage Loans', 'Approve, close, and configure employee loans'),

    -- Leave (Sub-modules)
    ('leave', 'manage_types', 'Manage Leave Types', 'Create and edit leave types'),
    ('leave', 'manage_policies', 'Manage Leave Policies', 'Configure accruals and assignment rules'),
    ('leave', 'view_balances', 'View All Balances', 'Access leave balances for all employees')
ON CONFLICT (module, action) DO NOTHING;

-- 2. SEED FOR EXISTING TENANTS
DO $$
DECLARE
    t RECORD;
    perm RECORD;
BEGIN
    FOR t IN SELECT id FROM tenants LOOP
        FOR perm IN 
            SELECT id, module, action FROM permissions 
            WHERE module IN ('attendance', 'payroll', 'leave')
        LOOP
            -- ADMIN: full access
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'ADMIN', perm.id, TRUE)
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

            -- HR: full access
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'HR', perm.id, TRUE)
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

            -- MANAGER: access to team views and regularization
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'MANAGER', perm.id,
                CASE
                    WHEN perm.module = 'attendance' AND perm.action IN ('clock_in_out', 'view_my', 'view_team', 'regularize') THEN TRUE
                    WHEN perm.module = 'payroll' AND perm.action IN ('view_payruns') THEN TRUE
                    WHEN perm.module = 'leave' AND perm.action IN ('view', 'approve') THEN TRUE
                    ELSE FALSE
                END
            )
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

            -- EMPLOYEE: self access only
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'EMPLOYEE', perm.id,
                CASE
                    WHEN perm.module = 'attendance' AND perm.action IN ('clock_in_out', 'view_my', 'regularize') THEN TRUE
                    WHEN perm.module = 'leave' AND perm.action IN ('view', 'create') THEN TRUE
                    ELSE FALSE
                END
            )
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
