-- Add timezone column to employees table for user-specific preferences
ALTER TABLE employees ADD COLUMN timezone VARCHAR(50);

-- Comment for clarity
COMMENT ON COLUMN employees.timezone IS 'Stores IANA timezone string (e.g., Asia/Kolkata, UTC) for the specific employee.';
