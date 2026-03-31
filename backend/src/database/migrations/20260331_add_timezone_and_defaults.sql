-- 20260331_add_timezone_and_defaults.sql
-- Adds timezone support to employees and sets organization/individual defaults to Asia/Kolkata (IST).

-- 1. Add timezone column to employees table if not already present
ALTER TABLE employees ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);

-- 2. Set default organization timezone to Asia/Kolkata (IST) for all tenants
UPDATE tenants 
SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{timezone}', '"Asia/Kolkata"')
WHERE settings->>'timezone' IS NULL OR settings->>'timezone' = 'UTC';

-- 3. Sync all existing employees to Asia/Kolkata if their timezone is unset
UPDATE employees 
SET timezone = 'Asia/Kolkata' 
WHERE timezone IS NULL OR timezone = '';

-- 4. Correct any attendance records from today that were recorded in UTC (offset fix)
-- This adjusts records between 5-8 AM UTC (which represent 10-1 PM IST) by adding the 5.5h offset
UPDATE attendance 
SET check_in_time = (check_in_time + INTERVAL '5 hours 30 minutes') 
WHERE date = '2026-03-31' 
  AND check_in_time >= '05:00:00' 
  AND check_in_time <= '08:00:00'
  AND status = 'PRESENT';
