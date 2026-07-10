-- ===================================================================
-- ADD WFH AND SHIFTS PERMISSIONS
-- Migration: 20260303_add_wfh_shifts_permissions.sql
-- ===================================================================

-- Step 1: Add WFH and Shifts to the master catalog
INSERT INTO permissions (module, action, label, description) VALUES
    -- WFH (Work From Home)
    ('wfh', 'view', 'View WFH Requests', 'View work from home requests'),
    ('wfh', 'create', 'Request WFH', 'Submit work from home requests'),
    ('wfh', 'approve', 'Approve WFH', 'Approve or reject WFH requests'),

    -- Shifts
    ('shifts', 'view', 'View Shifts', 'View shift schedules and assignments'),
    ('shifts', 'manage', 'Manage Shifts', 'Create, edit, and delete shift schedules')
ON CONFLICT (module, action) DO NOTHING;

-- Step 2: Seed permissions for all existing tenants
DO $$
DECLARE
    t RECORD;
    perm RECORD;
BEGIN
    FOR t IN SELECT id FROM tenants LOOP
        FOR perm IN SELECT id, module, action FROM permissions WHERE module IN ('wfh', 'shifts') LOOP
            -- ADMIN: full access
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'ADMIN', perm.id, TRUE)
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

            -- HR: full access
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'HR', perm.id, TRUE)
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

            -- MANAGER: view + approve WFH, view shifts
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'MANAGER', perm.id,
                CASE
                    WHEN perm.module = 'wfh' AND perm.action IN ('view', 'approve') THEN TRUE
                    WHEN perm.module = 'wfh' AND perm.action = 'create' THEN TRUE
                    WHEN perm.module = 'shifts' AND perm.action = 'view' THEN TRUE
                    ELSE FALSE
                END
            )
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

            -- EMPLOYEE: view + create WFH, view shifts
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'EMPLOYEE', perm.id,
                CASE
                    WHEN perm.module = 'wfh' AND perm.action IN ('view', 'create') THEN TRUE
                    WHEN perm.module = 'shifts' AND perm.action = 'view' THEN TRUE
                    ELSE FALSE
                END
            )
            ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
