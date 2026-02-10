-- Migration: 20260210_billing_system_final.sql
-- Description: Comprehensive schema for Subscription, Pricing, and Cashfree Integration

-- ==========================================
-- 1. PLANS & PRICING
-- ==========================================

-- Enhance plans table
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS code VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 1, -- 1=Standard, 2=Premium, 3=Elite
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Update existing plans with codes/tiers if they exist
UPDATE plans SET code = 'STANDARD_001', tier = 1 WHERE name = 'STANDARD';
UPDATE plans SET code = 'PREMIUM_001', tier = 2 WHERE name = 'PREMIUM';
UPDATE plans SET code = 'ELITE_001', tier = 3 WHERE name = 'ELITE';

-- Plan Prices (Versioning support)
CREATE TABLE IF NOT EXISTS plan_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    
    interval VARCHAR(20) NOT NULL CHECK (interval IN ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY')),
    interval_count INTEGER DEFAULT 1, -- e.g. 1 for Monthly, 3 for Quarterly
    
    unit_amount NUMERIC(12, 2) NOT NULL, -- Price per seat
    currency VARCHAR(10) DEFAULT 'INR',
    
    is_active BOOLEAN DEFAULT TRUE,
    active_from TIMESTAMP DEFAULT NOW(),
    active_to TIMESTAMP, -- NULL means currently active
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_plan_prices_plan ON plan_prices(plan_id);
CREATE INDEX idx_plan_prices_active ON plan_prices(plan_id) WHERE is_active = TRUE;

-- ==========================================
-- 2. COUPONS & DISCOUNTS
-- ==========================================
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENT', 'FIXED')),
    discount_value NUMERIC(12, 2) NOT NULL,
    
    currency VARCHAR(10) DEFAULT 'INR', -- Required for FIXED
    
    max_redemptions INTEGER,
    times_redeemed INTEGER DEFAULT 0,
    
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 3. SUBSCRIPTIONS (Enhanced)
-- ==========================================
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cashfree_subscription_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS billing_anchor TIMESTAMP, -- Renewal date reference
ADD COLUMN IF NOT EXISTS pause_collection JSONB, -- { "behavior": "void", "resumes_at": "..." }
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Update status constraint/check if exists, or handled by app logic
-- Ensures status column can hold new values
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
-- (Re-adding constraint is optional, usually handled by app, but good for data integrity)

-- Subscription Items (Seats & Add-ons)
CREATE TABLE IF NOT EXISTS subscription_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    price_id UUID NOT NULL REFERENCES plan_prices(id),
    
    quantity INTEGER NOT NULL DEFAULT 1,
    type VARCHAR(20) DEFAULT 'SEAT', -- SEAT, ADDON
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sub_items_sub ON subscription_items(subscription_id);

-- ==========================================
-- 4. INVOICING
-- ==========================================
-- Re-defining or Enhancing existing subscription_invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, OPEN, PAID, VOID, UNCOLLECTIBLE
    
    amount_due NUMERIC(12, 2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'INR',
    
    line_items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Snapshot of what was billed
    
    billing_reason VARCHAR(50), -- SUBSCRIPTION_CREATE, SUBSCRIPTION_CYCLE, SUBSCRIPTION_UPDATE, MANUAL
    
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    due_date TIMESTAMP,
    
    invoice_pdf TEXT, -- URL
    hosted_invoice_url TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_sub ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ==========================================
-- 5. WEBHOOK HANDLING & EVENTS
-- ==========================================
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) DEFAULT 'CASHFREE',
    event_id VARCHAR(255) NOT NULL, -- External ID from header
    event_type VARCHAR(100) NOT NULL,
    
    payload JSONB NOT NULL,
    
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSED, FAILED
    processing_error TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    
    UNIQUE(provider, event_id)
);

CREATE INDEX idx_webhooks_status ON webhook_events(status);

-- ==========================================
-- 6. SEED DATA (Pricing from Requirements)
-- ==========================================
-- Helper to get Plan IDs (assuming plans exist from previous migrations)
DO $$
DECLARE
    std_id UUID;
    prm_id UUID;
    elt_id UUID;
BEGIN
    SELECT id INTO std_id FROM plans WHERE name = 'STANDARD';
    SELECT id INTO prm_id FROM plans WHERE name = 'PREMIUM';
    SELECT id INTO elt_id FROM plans WHERE name = 'ELITE';

    -- STANDARD
    IF std_id IS NOT NULL THEN
        INSERT INTO plan_prices (plan_id, interval, interval_count, unit_amount) VALUES 
        (std_id, 'MONTHLY', 1, 55.00),
        (std_id, 'YEARLY', 1, 45.00 * 12); -- Yearly rate per seat (derived from 45/mo)
    END IF;

    -- PREMIUM
    IF prm_id IS NOT NULL THEN
        INSERT INTO plan_prices (plan_id, interval, interval_count, unit_amount) VALUES 
        (prm_id, 'MONTHLY', 1, 70.00),
        (prm_id, 'QUARTERLY', 1, 201.00),   -- 67 * 3
        (prm_id, 'HALF_YEARLY', 1, 390.00), -- 65 * 6
        (prm_id, 'YEARLY', 1, 720.00);      -- 60 * 12
    END IF;

    -- ELITE
    IF elt_id IS NOT NULL THEN
        INSERT INTO plan_prices (plan_id, interval, interval_count, unit_amount) VALUES 
        (elt_id, 'MONTHLY', 1, 220.00),
        (elt_id, 'QUARTERLY', 1, 642.00),   -- 214 * 3
        (elt_id, 'HALF_YEARLY', 1, 1248.00), -- 208 * 6
        (elt_id, 'YEARLY', 1, 2400.00);      -- 200 * 12
    END IF;
END $$;
