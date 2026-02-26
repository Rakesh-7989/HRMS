-- Migration to add dynamic dashboard redirection paths to roles
ALTER TABLE roles ADD COLUMN default_path VARCHAR(255);

-- Update existing system roles with their correct dashboard paths
UPDATE roles SET default_path = '/dashboard/system' WHERE name = 'SUPER_ADMIN' AND tenant_id IS NULL;
UPDATE roles SET default_path = '/dashboard/organization' WHERE name = 'ADMIN';
UPDATE roles SET default_path = '/dashboard/hr' WHERE name IN ('HR_MANAGER', 'HR');
UPDATE roles SET default_path = '/dashboard/team' WHERE name = 'MANAGER';
UPDATE roles SET default_path = '/dashboard/personal' WHERE name = 'EMPLOYEE';
UPDATE roles SET default_path = '/dashboard/dba' WHERE name = 'DBA';

-- Ensure new roles default to personal dashboard if not specified
ALTER TABLE roles ALTER COLUMN default_path SET DEFAULT '/dashboard/personal';
