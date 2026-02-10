-- Robust SaaS Subscription Migration
-- Migration: 20260206_robust_subscriptions.sql

-- 1. Update subscriptions table with lifecycle fields
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS next_billing_date DATE;

-- Update status check if needed (existing is VARCHAR(20))
-- TRIAL, ACTIVE, PAST_DUE, CANCELLED, EXPIRED, SUSPENDED

-- 2. Create Invoices table
CREATE TABLE IF NOT EXISTS subscription_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PAID, VOID, OVERDUE
    
    billing_period_start DATE,
    billing_period_end DATE,
    due_date DATE,
    
    cashfree_order_id VARCHAR(255),
    payment_link TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create Payments table
CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES subscription_invoices(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(20) NOT NULL, -- SUCCESS, FAILED, PENDING
    
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    provider_raw_response JSONB,
    
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Seed/Update Plans and Limits
-- Ensure plans exist
INSERT INTO plans (name, description, price, max_employees, features)
VALUES 
('STANDARD', 'Starter plan for small businesses', 0, 50, '{"payroll": false, "attendance": true, "leave": true}'),
('PREMIUM', 'Growing companies with full payroll', 0, 150, '{"payroll": true, "attendance": true, "leave": true, "reports": true}'),
('ELITE', 'Enterprise grade with performance and RBAC', 0, 500, '{"payroll": true, "attendance": true, "leave": true, "performance": true, "rbac": true}'),
('CUSTOM', 'Custom limits and dedicated support', 0, NULL, '{"custom": true}')
ON CONFLICT (name) DO UPDATE SET 
    max_employees = EXCLUDED.max_employees,
    description = EXCLUDED.description;

-- Update Setup Fees
ALTER TABLE plans ADD COLUMN IF NOT EXISTS setup_fee NUMERIC(12, 2) DEFAULT 0;
UPDATE plans SET setup_fee = 0 WHERE name = 'STANDARD';
UPDATE plans SET setup_fee = 1000.00 WHERE name = 'PREMIUM';
UPDATE plans SET setup_fee = 1500.00 WHERE name = 'ELITE';

-- 5. Seed Variations (Per User Pricing from image)
-- Clear old variations to ensure exact match with new plan
DELETE FROM plan_variations WHERE plan_id IN (SELECT id FROM plans);

-- STANDARD
INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price)
SELECT id, 'MONTHLY', 1, 55.00 FROM plans WHERE name = 'STANDARD';
INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price)
SELECT id, 'YEARLY', 12, 45.00 FROM plans WHERE name = 'STANDARD';

-- PREMIUM
INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price)
SELECT id, 'MONTHLY', 1, 70.00 FROM plans WHERE name = 'PREMIUM';
INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price)
SELECT id, 'QUARTERLY', 3, 67.00 FROM plans WHERE name = 'PREMIUM';
INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price)
SELECT id, 'HALF_YEARLY', 6, 65.00 FROM plans WHERE name = 'PREMIUM';
INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price)
SELECT id, 'YEARLY', 12, 60.00 FROM plans WHERE name = 'PREMIUM';

-- ELITE
INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price)
SELECT id, 'MONTHLY', 1, 220.00 FROM plans WHERE name = 'ELITE';
INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price)
SELECT id, 'QUARTERLY', 3, 214.00 FROM plans WHERE name = 'ELITE';
INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price)
SELECT id, 'HALF_YEARLY', 6, 208.00 FROM plans WHERE name = 'ELITE';
INSERT INTO plan_variations (plan_id, frequency, duration_months, unit_price)
SELECT id, 'YEARLY', 12, 200.00 FROM plans WHERE name = 'ELITE';
