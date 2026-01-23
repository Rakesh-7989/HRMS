-- Migration: Add extended employee fields
-- This adds personal, emergency, professional, finance, and address fields to employees table

ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);

-- Emergency Contact
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_relation VARCHAR(50);

-- Professional
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) UNIQUE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS join_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift VARCHAR(50);

-- Finance
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS account_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS account_number VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);

-- Address
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address TEXT;

COMMIT;
