-- Migration to add device tracking to attendance and geo-fencing
-- Date: 2026-01-24

-- Add device columns to attendance table
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS check_in_device VARCHAR(50),
ADD COLUMN IF NOT EXISTS check_out_device VARCHAR(50);

-- Add device column to geo-fencing violations for auditing
ALTER TABLE geo_fence_violations
ADD COLUMN IF NOT EXISTS device_type VARCHAR(50);

COMMENT ON COLUMN attendance.check_in_device IS 'Type of device used for clocking in (Mobile, Tablet, Desktop)';
COMMENT ON COLUMN attendance.check_out_device IS 'Type of device used for clocking out (Mobile, Tablet, Desktop)';
COMMENT ON COLUMN geo_fence_violations.device_type IS 'Type of device used during the geo-fence violation';
