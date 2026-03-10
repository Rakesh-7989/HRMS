-- Migration to clean up Geofencing and Attendance permissions
-- Date: 2026-03-10

-- 1. Remove any remaining permissions belonging to the old 'geo_fencing' module
DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE module = 'geo_fencing');
DELETE FROM permissions WHERE module = 'geo_fencing';

-- 2. Clean up duplicate role_permissions (keep the most recently updated one)
DELETE FROM role_permissions a
USING role_permissions b
WHERE a.id < b.id
  AND a.tenant_id = b.tenant_id
  AND a.role = b.role
  AND a.permission_id = b.permission_id;

-- 3. Ensure HR role does NOT have 'attendance:manage' by default (should be for ADMIN)
-- This removes the broad bypass that causes the leak
UPDATE role_permissions 
SET enabled = false 
WHERE role = 'HR' 
AND permission_id IN (SELECT id FROM permissions WHERE module = 'attendance' AND action = 'manage');

-- 4. Ensure HR role has 'attendance:view_all' and other base permissions enabled if they exist
-- (This ensures they don't lose normal HR functionality, just the administrative bypass)
INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
SELECT t.id, 'HR', p.id, true
FROM tenants t
CROSS JOIN permissions p
WHERE p.module = 'attendance' 
AND p.action IN ('view_all', 'view_team', 'view_analytics', 'approve', 'regularize')
ON CONFLICT (tenant_id, role, permission_id) DO UPDATE SET enabled = true;

-- 5. Final check: Ensure manage_geofence is correctly set (will be false if user disabled it in UI, but let's reset it to a sane default of true for HR IF it was previously missing, the user can then disable it)
-- Actually, the user says they DISABLED it, so let's not force it to true here if it's already there. 
-- But if it's missing, let's add it.
INSERT INTO role_permissions (tenant_id, role, permission_id, enabled)
SELECT t.id, 'HR', p.id, true
FROM tenants t
CROSS JOIN permissions p
WHERE p.module = 'attendance' 
AND p.action = 'manage_geofence'
ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;
