-- ===================================================================
-- COMPREHENSIVE PERMISSION ALIGNMENT
-- ===================================================================

-- 1. ADD MISSING GRANULAR PERMISSIONS
INSERT INTO permissions (name, category, description, resource, action) VALUES
-- Geofencing
('view_geofencing',     'attendance', 'View geofencing settings and violations', 'geofencing', 'read'),
('manage_geofencing',   'attendance', 'Configure geofencing locations and settings', 'geofencing', 'manage'),

-- Projects & Kanban
('manage_kanban',       'projects',   'Setup and manage Kanban boards for projects', 'kanban', 'manage'),
('view_timesheets',     'projects',   'View all employee timesheets', 'timesheet', 'read'),
('approve_timesheets',  'projects',   'Approve or reject employee timesheets', 'timesheet', 'approve'),

-- Payroll Extras
('request_loan',        'payroll',    'Apply for employee loans', 'loan', 'create'),

-- Communication & Calendar
('manage_calendar',     'organisation', 'Manage company-wide holidays and calendar events', 'calendar', 'manage'),
('manage_announcements','organisation', 'Create and manage company announcements', 'announcement', 'manage'),

-- WFH
('view_wfh',            'attendance', 'View work from home requests', 'wfh', 'read'),
('approve_wfh',         'attendance', 'Approve/reject work from home requests', 'wfh', 'approve')
ON CONFLICT (name) DO NOTHING;

-- 2. ASSIGN NEW PERMISSIONS TO THE SYSTEM ADMIN ROLE
-- We'll add them to the system-level ADMIN role (tenant_id IS NULL)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ADMIN' AND r.tenant_id IS NULL
AND p.name IN (
    'view_geofencing', 'manage_geofencing', 
    'manage_kanban', 'view_timesheets', 'approve_timesheets',
    'request_loan', 'manage_calendar', 'manage_announcements',
    'view_wfh', 'approve_wfh'
)
ON CONFLICT DO NOTHING;

-- 3. UPDATING EXISTING TENANT ADMIN ROLES
-- This ensures existing tenants also get the new permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ADMIN' AND r.tenant_id IS NOT NULL
AND p.name IN (
    'view_geofencing', 'manage_geofencing', 
    'manage_kanban', 'view_timesheets', 'approve_timesheets',
    'request_loan', 'manage_calendar', 'manage_announcements',
    'view_wfh', 'approve_wfh'
)
ON CONFLICT DO NOTHING;
