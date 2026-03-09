-- ===================================================================
-- FIX MISSING PERMISSIONS IN MASTER CATALOG
-- Migration: 20260305_fix_missing_permissions.sql
-- ===================================================================

-- 1. Add missing Geo-fencing permissions
INSERT INTO permissions (module, action, label, description) VALUES
    ('geo_fencing', 'view', 'View Geo-fencing', 'Access geo-fencing settings and locations'),
    ('geo_fencing', 'manage_settings', 'Manage Geo-fencing Settings', 'Enable/disable geo-fencing and configure global rules'),
    ('geo_fencing', 'manage_locations', 'Manage Locations', 'Create and edit geo-fenced work locations'),
    ('geo_fencing', 'view_violations', 'View Violations', 'Access geo-fencing violation logs')
ON CONFLICT (module, action) DO NOTHING;

-- 2. Add missing Attendance permissions (Granular)
INSERT INTO permissions (module, action, label, description) VALUES
    ('attendance', 'clock_in_out', 'Clock In/Out', 'Permission to perform clock-in and clock-out actions'),
    ('attendance', 'view_my', 'View My Attendance', 'View personal attendance history'),
    ('attendance', 'view_team', 'View Team Attendance', 'View attendance for direct reports'),
    ('attendance', 'view_all', 'View All Attendance', 'View attendance records across the organization'),
    ('attendance', 'view_analytics', 'View Attendance Analytics', 'Access attendance dashboards and reports'),
    ('attendance', 'regularize', 'Regularize Attendance', 'Apply for or approve attendance regularization'),
    ('attendance', 'manage_settings', 'Manage Attendance Settings', 'Configure shifts, grace periods, and late rules')
ON CONFLICT (module, action) DO NOTHING;

-- 3. Add missing Project Management permissions (Granular)
INSERT INTO permissions (module, action, label, description) VALUES
    ('projects', 'update', 'Edit Projects', 'Modify existing project details'),
    ('projects', 'delete', 'Delete Projects', 'Remove project records from the system'),
    ('projects', 'manage_members', 'Manage Project Members', 'Add or remove members from projects'),
    ('projects', 'view_kanban', 'View Kanban Board', 'Access project task boards'),
    ('projects', 'manage_kanban', 'Manage Kanban Board', 'Configure project task boards and columns'),
    ('projects', 'manage_timesheets', 'Manage Timesheets', 'View organization-wide timesheets'),
    ('projects', 'approve_timesheets', 'Approve Timesheets', 'Approve or reject submitted timesheets'),
    ('projects', 'view_reports', 'View Project Reports', 'Access project-wise and resource-wise reporting')
ON CONFLICT (module, action) DO NOTHING;

-- 4. RE-SEED permissions for all existing tenants
-- This ensures that the ADMIN role for every tenant gets these newly added permissions automatically.
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN SELECT id FROM tenants LOOP
        PERFORM seed_role_permissions_for_tenant(t.id);
    END LOOP;
END $$;
