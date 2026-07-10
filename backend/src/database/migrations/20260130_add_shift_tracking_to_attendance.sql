-- Add shift_id and late_by columns to attendance table

ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id),
ADD COLUMN IF NOT EXISTS late_by VARCHAR(50);

-- Index for faster lookups on shift_id
CREATE INDEX IF NOT EXISTS idx_attendance_shift_id ON attendance(shift_id);
