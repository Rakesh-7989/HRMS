-- Create attendance_breaks table if it doesn't exist
CREATE TABLE IF NOT EXISTS attendance_breaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
    
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    
    duration_minutes INTEGER, -- Calculated on completion
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_attendance_breaks_attendance ON attendance_breaks(attendance_id);
