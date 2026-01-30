-- Add setup_fee to plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS setup_fee DECIMAL(10, 2) DEFAULT 0.00;

-- Create plan_variations table
CREATE TABLE IF NOT EXISTS plan_variations (
    id SERIAL PRIMARY KEY,
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
    frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY')),
    duration_months INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL, -- Price per user per month
    gst_percentage DECIMAL(5, 2) DEFAULT 18.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(plan_id, frequency)
);

-- Seed initial data based on the screenshot (Best effort migration)

-- STANDARD
INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price, gst_percentage)
SELECT id, 'MONTHLY', 1, 55.00, 18.00 FROM plans WHERE name = 'STANDARD'
ON CONFLICT DO NOTHING;

INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price, gst_percentage)
SELECT id, 'YEARLY', 12, 45.00, 18.00 FROM plans WHERE name = 'STANDARD'
ON CONFLICT DO NOTHING;

-- PREMIUM
INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price, gst_percentage)
SELECT id, 'MONTHLY', 1, 70.00, 18.00 FROM plans WHERE name = 'PREMIUM'
ON CONFLICT DO NOTHING;

INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price, gst_percentage)
SELECT id, 'QUARTERLY', 3, 67.00, 18.00 FROM plans WHERE name = 'PREMIUM'
ON CONFLICT DO NOTHING;

INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price, gst_percentage)
SELECT id, 'HALF_YEARLY', 6, 65.00, 18.00 FROM plans WHERE name = 'PREMIUM'
ON CONFLICT DO NOTHING;

INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price, gst_percentage)
SELECT id, 'YEARLY', 12, 60.00, 18.00 FROM plans WHERE name = 'PREMIUM'
ON CONFLICT DO NOTHING;

UPDATE plans SET setup_fee = 1000.00 WHERE name = 'PREMIUM';

-- ELITE
INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price, gst_percentage)
SELECT id, 'MONTHLY', 1, 220.00, 18.00 FROM plans WHERE name = 'ELITE'
ON CONFLICT DO NOTHING;

INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price, gst_percentage)
SELECT id, 'QUARTERLY', 3, 214.00, 18.00 FROM plans WHERE name = 'ELITE'
ON CONFLICT DO NOTHING;

INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price, gst_percentage)
SELECT id, 'HALF_YEARLY', 6, 208.00, 18.00 FROM plans WHERE name = 'ELITE'
ON CONFLICT DO NOTHING;

INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price, gst_percentage)
SELECT id, 'YEARLY', 12, 200.00, 18.00 FROM plans WHERE name = 'ELITE'
ON CONFLICT DO NOTHING;

UPDATE plans SET setup_fee = 1770.00 WHERE name = 'ELITE';
