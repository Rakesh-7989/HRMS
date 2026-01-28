-- Migration: Add UAN, PF Account, and ESI Number to employees table
-- Date: 2026-01-28

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS uan VARCHAR(50),
ADD COLUMN IF NOT EXISTS pf_account VARCHAR(50),
ADD COLUMN IF NOT EXISTS esi_number VARCHAR(50);
