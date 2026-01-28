-- Migration: Make component_id nullable for statutory deductions
-- Date: 2026-01-28
-- Reason: Statutory deductions (PF, ESI, PT, LWF) don't have corresponding entries
--         in salary_components table, so component_id must be nullable.

ALTER TABLE payroll_run_item_components 
ALTER COLUMN component_id DROP NOT NULL;
