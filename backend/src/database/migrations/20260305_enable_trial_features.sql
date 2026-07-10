-- ===================================================================
-- ENABLE CORE FEATURES FOR STANDARD (TRIAL) PLAN
-- Migration: 20260305_enable_trial_features.sql
-- ===================================================================

-- 1. Enable Project Management features for Tier 1 (Standard)
INSERT INTO feature_permissions (plan_type, feature_key, is_enabled) VALUES
    (1, 'project.client_management', true),
    (1, 'project.task_board', true),
    (1, 'project.timesheets', true)
ON CONFLICT (plan_type, feature_key) 
DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- 2. Enable Geo-fencing for Tier 1 (Standard)
-- This ensures trial users can test the location-based attendance feature.
INSERT INTO feature_permissions (plan_type, feature_key, is_enabled) VALUES
    (1, 'attendance.geofencing', true)
ON CONFLICT (plan_type, feature_key) 
DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- 3. Ensure other core features are enabled for safety
INSERT INTO feature_permissions (plan_type, feature_key, is_enabled) VALUES
    (1, 'dashboard.stats', true),
    (1, 'employee.directory', true),
    (1, 'attendance.basic', true),
    (1, 'leave.basic', true)
ON CONFLICT (plan_type, feature_key) 
DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
