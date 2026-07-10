-- Add Work From Home (WFH) Leave Type
-- This leave type allows employees to request WFH.
-- When approved:
-- 1. It creates an approved leave record (visible in calendar).
-- 2. The Attendance service sees this code 'WFH' and allows clock-in without Geofencing.
-- 3. We set is_paid = TRUE so it doesn't trigger LOP deduction in payroll.

DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN SELECT id FROM tenants LOOP
        INSERT INTO leave_types (
            tenant_id, 
            name, 
            code, 
            description, 
            is_paid, 
            requires_approval, 
            requires_attachment, 
            min_days_notice, 
            is_active
        )
        VALUES (
            t.id, 
            'Work From Home', 
            'WFH', 
            'Request to work remotely. Skips Geo-Fencing if approved.', 
            true,   -- Paid leave (don't deduct salary)
            true,   -- Requires manager approval
            false,  -- No attachment needed
            0,      -- Can apply same-day
            true
        )
        ON CONFLICT (tenant_id, code) DO NOTHING;
    END LOOP;
END $$;
