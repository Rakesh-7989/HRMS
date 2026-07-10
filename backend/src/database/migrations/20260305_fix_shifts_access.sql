-- ===================================================================
-- ENABLE SHIFTS FEATURE FOR STANDARD (TRIAL) PLAN
-- Migration: 20260305_fix_shifts_access.sql
-- ===================================================================

-- Enable Scheduling/Shifts for Tier 1 (Standard)
INSERT INTO feature_permissions (plan_type, feature_key, is_enabled) VALUES
    (1, 'attendance.scheduling', true)
ON CONFLICT (plan_type, feature_key) 
DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
