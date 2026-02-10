-- Migration: Make email globally unique (not per-tenant)
-- This ensures one email = one user in the entire system

-- Step 1: Drop the existing per-tenant unique index
DROP INDEX IF EXISTS users_email_per_tenant;

-- Step 2: Create a new global unique index on email (case-insensitive)
-- Only considers active (non-deleted) users
CREATE UNIQUE INDEX users_email_unique ON users(LOWER(email)) WHERE is_deleted = false;

-- Note: This migration will fail if there are duplicate emails across tenants.
-- You must resolve duplicates before running this migration.
