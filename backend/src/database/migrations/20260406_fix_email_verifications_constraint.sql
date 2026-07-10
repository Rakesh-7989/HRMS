-- Migration: 20260406_fix_email_verifications_constraint.sql
-- Description: Adds a unique constraint to email_verifications(email) to support ON CONFLICT

-- 1. Deduplicate if needed (keep latest)
DELETE FROM email_verifications
WHERE id NOT IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER(PARTITION BY email ORDER BY created_at DESC) as rn
        FROM email_verifications
    ) t WHERE t.rn = 1
);

-- 2. Drop existing non-unique index if it exists
DROP INDEX IF EXISTS idx_email_verifications_email;

-- 3. Add unique constraint (which creates a unique index)
ALTER TABLE email_verifications 
ADD CONSTRAINT email_verifications_email_key UNIQUE (email);
