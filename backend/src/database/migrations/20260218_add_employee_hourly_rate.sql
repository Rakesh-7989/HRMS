-- Migration: Add hourly_rate to employees table

ALTER TABLE employees ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2) DEFAULT 0.00;

COMMIT;
