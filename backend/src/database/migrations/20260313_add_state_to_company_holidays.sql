-- Add state column to company_holidays to support region-specific holidays
ALTER TABLE company_holidays ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT NULL;

-- Drop the old unique constraint (tenant_id, date)
ALTER TABLE company_holidays DROP CONSTRAINT IF EXISTS company_holidays_tenant_id_date_key;

-- Add new unique constraint that includes state (Postgres treats NULLs as distinct by default, meaning multiple NULL states for same date/tenant would NOT conflict, which is what we want to avoid for tenant-wide holidays)
-- Since native UNIQUE NULLS NOT DISTINCT requires PG 15+, we use a coalesce workaround for older PGs
CREATE UNIQUE INDEX IF NOT EXISTS company_holidays_tenant_date_state_idx 
ON company_holidays (tenant_id, date, COALESCE(state, 'ALL_REGIONS'));

