-- Migration: Expand sensitive columns for AES-256-GCM encrypted values
-- Encrypted format (iv:authTag:ciphertext) produces ~86-120 char hex strings
-- All sensitive columns need varchar(255) to accommodate encrypted data

-- Employees table
ALTER TABLE employees
  ALTER COLUMN phone TYPE varchar(255),
  ALTER COLUMN emergency_phone TYPE varchar(255),
  ALTER COLUMN aadhar_number TYPE varchar(255),
  ALTER COLUMN ifsc_code TYPE varchar(255),
  ALTER COLUMN account_number TYPE varchar(255),
  ALTER COLUMN tax_id TYPE varchar(255),
  ALTER COLUMN uan TYPE varchar(255),
  ALTER COLUMN pf_account TYPE varchar(255),
  ALTER COLUMN esi_number TYPE varchar(255);

-- Employee Salary Details table
ALTER TABLE employee_salary_details
  ALTER COLUMN bank_account_number TYPE varchar(255),
  ALTER COLUMN bank_ifsc TYPE varchar(255);
