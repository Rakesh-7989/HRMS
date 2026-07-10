-- ===================================================================
-- REPAIR ATTENDANCE PERMISSIONS
-- Migration: 20260408_fix_attendance_permissions.sql
-- ===================================================================

-- 1. Insert missing attendance permissions
INSERT INTO permissions (module, action, label, description) VALUES
    ('attendance', 'clock_in_out', 'Clock In/Out', 'Permission to record attendance clock-in and clock-out'),
    ('attendance', 'view_my', 'View My Attendance', 'Permission to view own attendance records'),
    ('attendance', 'view_team', 'View Team Attendance', 'Permission to view attendance of team members'),
    ('attendance', 'view_all', 'View All Attendance', 'Permission to view all attendance records in the organisation'),
    ('attendance', 'manage_settings', 'Manage Attendance Settings', 'Permission to configure attendance policies and settings'),
    ('attendance', 'view_analytics', 'View Attendance Analytics', 'Permission to access attendance dashboards and analytics'),
    ('attendance', 'regularize', 'Attendance Regularization', 'Permission to apply for and manage attendance regularization'),
    ('attendance', 'manage_geofence', 'Manage Geo-Fencing', 'Permission to configure and manage geo-fencing locations')
ON CONFLICT (module, action) DO NOTHING;

-- 2. Re-run seeding specifically for these new permissions for ADMIN role
DO $$
DECLARE
    t RECORD;
    p RECORD;
BEGIN
    FOR t IN SELECT id FROM tenants LOOP
        FOR p IN SELECT id FROM permissions WHERE module = 'attendance' LOOP
            -- Grant all attendance permissions to ADMIN
            INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
            VALUES (t.id, 'ADMIN', p.id, TRUE)
            ON CONFLICT (tenant_id, role, permission_id) DO UPDATE SET enabled = TRUE;

            -- Grant view_my, clock_in_out, regularize to EMPLOYEE
            IF (SELECT action FROM permissions WHERE id = p.id) IN ('view_my', 'clock_in_out', 'regularize', 'view') THEN
                INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
                VALUES (t.id, 'EMPLOYEE', p.id, TRUE)
                ON CONFLICT (tenant_id, role, permission_id) DO UPDATE SET enabled = TRUE;
            END IF;

            -- Grant view_team, approve, view_my, clock_in_out to MANAGER
            IF (SELECT action FROM permissions WHERE id = p.id) IN ('view_team', 'approve', 'view_my', 'clock_in_out', 'regularize', 'view') THEN
                INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
                VALUES (t.id, 'MANAGER', p.id, TRUE)
                ON CONFLICT (tenant_id, role, permission_id) DO UPDATE SET enabled = TRUE;
            END IF;
        END LOOP;
    END LOOP;
END $$;
