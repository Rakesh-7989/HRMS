-- ===================================================================
-- HRMS SAAS – CLEAN DATABASE SETUP
-- ===================================================================

-- Terminate active connections to avoid "database being accessed" errors
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'hrms_new_db'
  AND pid <> pg_backend_pid();

-- ===================================================================
-- DROP + CREATE DATABASE
-- ===================================================================

DROP DATABASE IF EXISTS hrms_new_db;
CREATE DATABASE hrms_new_db;

-- ===================================================================
-- DROP + CREATE USER
-- ===================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'new_hrms_admin') THEN
        RAISE NOTICE 'Role exists, skipping create';
    ELSE
        CREATE ROLE new_hrms_admin LOGIN PASSWORD 'admin';
    END IF;
END$$;

-- Ensure user has full access to database
GRANT ALL PRIVILEGES ON DATABASE hrms_new_db TO new_hrms_admin;

-- Switch to DB
\c hrms_new_db;

-- ===================================================================
-- EXTENSIONS
-- ===================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===================================================================
-- FIX PERMISSIONS FOR PUBLIC SCHEMA
-- ===================================================================

GRANT ALL PRIVILEGES ON SCHEMA public TO new_hrms_admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO new_hrms_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO new_hrms_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO new_hrms_admin;
