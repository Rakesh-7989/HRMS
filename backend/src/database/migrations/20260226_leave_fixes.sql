-- ===================================================================
-- LEAVE MODULE FIXES MIGRATION
-- Created: 2026-02-26
-- Fixes issues: 11, 13, 14, 16
-- ===================================================================

-- Issue 11: created_by in leave_balance_adjustments should be nullable
-- (Accrual jobs and system cancellations pass NULL)
ALTER TABLE leave_balance_adjustments ALTER COLUMN created_by DROP NOT NULL;

-- Issue 13: Add PENDING_HR to leave_applications status CHECK constraint
-- First drop the old constraint if it exists, then add the new one
DO $$
BEGIN
    -- Try to drop the old constraint
    BEGIN
        ALTER TABLE leave_applications DROP CONSTRAINT IF EXISTS leave_applications_status_check;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore if constraint doesn't exist
    END;

    -- Add updated constraint with PENDING_HR
    ALTER TABLE leave_applications ADD CONSTRAINT leave_applications_status_check 
        CHECK (status IN ('PENDING', 'PENDING_HR', 'APPROVED', 'REJECTED', 'CANCELLED'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Status constraint update skipped: %', SQLERRM;
END $$;

-- Issue 16: Add carry_forward column to leave_balances if missing
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS carry_forward NUMERIC(6,2) DEFAULT 0;

-- Issue 16: Add pending column if missing
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS pending NUMERIC(6,2) DEFAULT 0;

-- Issue 16: Update generated column to include carry_forward and pending
-- Drop and recreate the generated column (Postgres requires this for GENERATED ALWAYS)
DO $$
BEGIN
    ALTER TABLE leave_balances DROP COLUMN IF EXISTS current_balance;
    ALTER TABLE leave_balances ADD COLUMN current_balance NUMERIC(6,2) GENERATED ALWAYS AS 
        (opening_balance + accrued - used + adjusted + carry_forward - pending) STORED;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'current_balance column update skipped: %', SQLERRM;
END $$;

-- Add index for performance on leave applications status lookups
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_applications_employee_status ON leave_applications(tenant_id, employee_id, status);
