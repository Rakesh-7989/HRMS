-- Add status_message and status_expiry columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_message TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_expiry TIMESTAMPTZ;
