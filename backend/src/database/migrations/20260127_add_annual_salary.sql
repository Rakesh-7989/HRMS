-- Add annual_salary column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS annual_salary NUMERIC(15, 2) DEFAULT 0;
