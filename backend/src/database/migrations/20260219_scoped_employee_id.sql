-- Migration: Scoped Employee ID
-- Description: Changes employee_id uniqueness from global to per-tenant

BEGIN;

-- 1. Drop the existing global unique constraint
-- Note: The standard naming convention for unique constraint on column 'employee_id' in table 'employees' is 'employees_employee_id_key'
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_employee_id_key;

-- 2. Add the new composite unique constraint (tenant_id, employee_id)
-- We use a named constraint so we can catch it reliably in the backend
ALTER TABLE employees 
ADD CONSTRAINT employees_tenant_id_employee_id_key 
UNIQUE (tenant_id, employee_id);

COMMIT;
