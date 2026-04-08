-- Migration: 20260408_sync_tenant_schema.sql
-- Description: Ensures the tenants table has all required columns for the registration and payment flow.

-- 1. Ensure registration_status exists (for tracking PENDING_PAYMENT, COMPLETED, etc.)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS registration_status CHARACTER VARYING DEFAULT 'PENDING_PAYMENT';

-- 2. Ensure plan columns exist for subscription tracking
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_type INTEGER DEFAULT 1;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_expiry_date DATE;

-- 3. Ensure employee_count exists (for billing calculations)
-- (Included here for safety in case 001_add_employee_count was not run)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS employee_count INTEGER DEFAULT 1;

-- 4. Ensure settings is initialized as jsonb
ALTER TABLE tenants ALTER COLUMN settings SET DEFAULT '{}'::jsonb;
UPDATE tenants SET settings = '{}'::jsonb WHERE settings IS NULL;

-- 5. Create index on domain for faster lookup during registration
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
