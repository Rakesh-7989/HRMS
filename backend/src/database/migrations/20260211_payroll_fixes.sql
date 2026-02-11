-- Migration: Payroll module fixes
-- Date: 2026-02-11
 
-- 1. Add lwf_employee column to payroll_run_items table
ALTER TABLE payroll_run_items
ADD COLUMN IF NOT EXISTS lwf_employee NUMERIC DEFAULT 0;
 
-- 2. Make component_id nullable in payroll_run_item_components
-- Required because statutory deductions (PF, ESI, PT) are dynamically calculated
-- and don't have a corresponding salary_components entry
ALTER TABLE payroll_run_item_components
ALTER COLUMN component_id DROP NOT NULL;
 
-- 3. Add voided_by and voided_at columns to payroll_runs for void audit trail  
ALTER TABLE payroll_runs
ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;