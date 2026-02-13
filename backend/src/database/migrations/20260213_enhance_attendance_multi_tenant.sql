-- Migration: Enhance Attendance Module for Multi-Tenant Support
-- Date: 2026-02-13
-- Logic: Adds configurable work hours, overtime support, and precise time tracking

-- 1. Enhance shifts table
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS work_hours DECIMAL(4, 2) DEFAULT 9.0, -- Configurable work hours (defaults to 9 for legacy support)
ADD COLUMN IF NOT EXISTS half_day_threshold_hours DECIMAL(4, 2) DEFAULT 4.0,
ADD COLUMN IF NOT EXISTS week_offs TEXT[] DEFAULT NULL, -- No default week offs
ADD COLUMN IF NOT EXISTS overtime_enabled BOOLEAN DEFAULT FALSE;

-- 2. Enhance attendance table for OT and precise tracking
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(4, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS effective_work_hours DECIMAL(4, 2) DEFAULT 0;
