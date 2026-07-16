-- Add login attempt tracking columns to users table
-- For account lockout after failed login attempts

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;