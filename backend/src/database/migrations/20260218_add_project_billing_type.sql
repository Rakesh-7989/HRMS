-- Migration: Add billing_type to projects table
-- Default to 'HOURLY' for existing projects to maintain current behavior

ALTER TABLE projects ADD COLUMN IF NOT EXISTS billing_type VARCHAR(50) DEFAULT 'HOURLY'; -- 'FIXED', 'HOURLY', 'NON_BILLABLE'

-- Update existing rows to have a default if needed (handled by DEFAULT above, but good to be explicit)
UPDATE projects SET billing_type = 'HOURLY' WHERE billing_type IS NULL;

COMMIT;
