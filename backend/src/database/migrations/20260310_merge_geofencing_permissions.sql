-- ===================================================================
-- MERGE GEO-FENCING PERMISSIONS INTO ATTENDANCE
-- Migration: 20260310_merge_geofencing_permissions.sql
-- ===================================================================

-- 1. Remove geo_fencing module permissions
-- Cascading deletes will handle role_permissions and user_permission_overrides
DELETE FROM permissions WHERE module = 'geo_fencing';

-- 2. Update attendance settings label to be more inclusive
UPDATE permissions 
SET label = 'Attendance & Geofencing Settings',
    description = 'Configure attendance rules, office locations, and geo-fencing settings'
WHERE module = 'attendance' AND action = 'manage_settings';

-- 3. Update attendance analytics label (optional but good)
UPDATE permissions
SET label = 'Attendance Analytics & Violations'
WHERE module = 'attendance' AND action = 'view_analytics';
