-- ===================================================================
-- ADD GRANULAR GEO-FENCING PERMISSIONS TO ATTENDANCE MODULE
-- Migration: 20260310_granular_geofence_under_attendance.sql
-- ===================================================================

-- 1. Insert granular geofencing permissions under 'attendance' module
INSERT INTO permissions (module, action, label, description) VALUES
    ('attendance', 'manage_geofence', 'Manage Geofencing', 'Configure geofencing rules and office locations'),
    ('attendance', 'view_geofence_violations', 'Geofencing Violations', 'Access geofencing violation reports')
ON CONFLICT (module, action) DO NOTHING;

-- 2. Restore 'Attendance Settings' label to original (without Geofencing)
UPDATE permissions 
SET label = 'Attendance Settings',
    description = 'Configure general attendance rules and policies'
WHERE module = 'attendance' AND action = 'manage_settings';

-- 3. Restore 'Attendance Analytics' label (without Violations)
UPDATE permissions
SET label = 'Attendance Analytics',
    description = 'Access attendance dashboards and reports'
WHERE module = 'attendance' AND action = 'view_analytics';

-- 4. Seed new permissions for ADMIN and HR based on their current attendance access
DO $$
DECLARE
    t RECORD;
    manage_id UUID;
    view_id UUID;
BEGIN
    SELECT id INTO manage_id FROM permissions WHERE module = 'attendance' AND action = 'manage_geofence';
    SELECT id INTO view_id FROM permissions WHERE module = 'attendance' AND action = 'view_geofence_violations';

    FOR t IN SELECT id FROM tenants LOOP
        -- Seed for ADMIN
        INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
        VALUES (t.id, 'ADMIN', manage_id, TRUE)
        ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;
        
        INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
        VALUES (t.id, 'ADMIN', view_id, TRUE)
        ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;

        -- Seed for HR
        INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
        VALUES (t.id, 'HR', manage_id, TRUE)
        ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;
        
        INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
        VALUES (t.id, 'HR', view_id, TRUE)
        ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;
    END LOOP;
END $$;
