-- Add work_mode column to attendance table if it doesn't exist
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS work_mode VARCHAR(50) DEFAULT 'OFFICE';

-- Add index for valid work modes
CREATE INDEX IF NOT EXISTS idx_attendance_work_mode ON attendance(tenant_id, work_mode);
