-- Patch: Add missing columns to existing tables
-- Date: 2026-01-09

-- 1. Employee Salary Details
ALTER TABLE employee_salary_details 
ADD COLUMN IF NOT EXISTS da numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS special_allowance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_allowance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS per_day_salary numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS bank_name varchar(100),
ADD COLUMN IF NOT EXISTS bank_account_number varchar(50),
ADD COLUMN IF NOT EXISTS bank_ifsc varchar(20),
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES salary_templates(id),
ADD COLUMN IF NOT EXISTS effective_to date;

-- 2. Payroll Run Items
ALTER TABLE payroll_run_items
ADD COLUMN IF NOT EXISTS gross_salary numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_salary numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earnings numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_deductions numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS reimbursements numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS basic numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS hra numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS da numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS special_allowance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_allowance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS pf_employee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS esi_employee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS professional_tax numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tds numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS loan_deduction numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS partial_days numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS lop_days numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS leave_days numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS working_days numeric DEFAULT 0;

-- 3. Payroll Runs
ALTER TABLE payroll_runs
ADD COLUMN IF NOT EXISTS total_net numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS run_number varchar(50),
ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'DRAFT'; 
-- status likely exists but ensuring.
