-- Migration: 001_add_employee_count_and_update_fees.sql
-- Description: Adds employee_count column to tenants and updates setup fees for Premium, Elite, and Custom plans.

-- 1. Add employee_count to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS employee_count INTEGER DEFAULT 1;

-- 2. Update Setup Fees in plans table
UPDATE plans SET setup_fee = 10000 WHERE name = 'CUSTOM';
UPDATE plans SET setup_fee = 6000 WHERE name = 'PREMIUM';
UPDATE plans SET setup_fee = 7000 WHERE name = 'ELITE';

-- 3. Ensure setup_fee is numeric/not null (optional but recommended)
-- ALTER TABLE plans ALTER COLUMN setup_fee SET DEFAULT 0.00;
