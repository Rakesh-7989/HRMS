-- ===================================================================
-- HRMS SAAS – CLEAN DATABASE SETUP
-- ===================================================================

-- Terminate active connections to avoid "database being accessed" errors
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'hrms_saas_db'
  AND pid <> pg_backend_pid();

-- ===================================================================
-- DROP + CREATE DATABASE
-- ===================================================================

DROP DATABASE IF EXISTS hrms_saas_db;
CREATE DATABASE hrms_saas_db;

-- ===================================================================
-- DROP + CREATE USER
-- ===================================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'hrms_user') THEN
        RAISE NOTICE 'Role exists, skipping drop';
    ELSE
        CREATE ROLE hrms_user LOGIN PASSWORD 'root';
    END IF;
END$$;

-- Ensure user has full access to database
GRANT ALL PRIVILEGES ON DATABASE hrms_saas_db TO hrms_user;

-- Switch to DB
\c hrms_saas_db;

-- ===================================================================
-- EXTENSIONS
-- ===================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===================================================================
-- FIX PERMISSIONS FOR PUBLIC SCHEMA
-- ===================================================================

GRANT ALL PRIVILEGES ON SCHEMA public TO hrms_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO hrms_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO hrms_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO hrms_user;
