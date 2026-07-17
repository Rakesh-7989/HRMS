-- Ensure core billing tables exist (safe fallback for tables that
-- may have been missed due to migration ordering issues)

DO $$
BEGIN
  -- plan_prices
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'plan_prices') THEN
    CREATE TABLE plan_prices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        plan_id UUID,
        interval VARCHAR(20) NOT NULL CHECK (interval IN ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY')),
        interval_count INTEGER DEFAULT 1,
        unit_amount NUMERIC(12, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        is_active BOOLEAN DEFAULT TRUE,
        active_from TIMESTAMP DEFAULT NOW(),
        active_to TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX idx_plan_prices_plan ON plan_prices(plan_id);
    CREATE INDEX idx_plan_prices_active ON plan_prices(plan_id) WHERE is_active = TRUE;
  END IF;

  -- subscription_items
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'subscription_items') THEN
    CREATE TABLE subscription_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        subscription_id UUID,
        price_id UUID,
        quantity INTEGER NOT NULL DEFAULT 1,
        type VARCHAR(20) DEFAULT 'SEAT',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX idx_sub_items_sub ON subscription_items(subscription_id);
  END IF;

  -- invoices
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'invoices') THEN
    CREATE TABLE invoices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID,
        subscription_id UUID,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        amount_due NUMERIC(12, 2) NOT NULL DEFAULT 0,
        amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
        subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
        tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
        total NUMERIC(12, 2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'INR',
        line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
        billing_reason VARCHAR(50),
        period_start TIMESTAMP,
        period_end TIMESTAMP,
        due_date TIMESTAMP,
        invoice_pdf TEXT,
        hosted_invoice_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
    CREATE INDEX idx_invoices_sub ON invoices(subscription_id);
    CREATE INDEX idx_invoices_status ON invoices(status);
  END IF;

  -- webhook_events
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'webhook_events') THEN
    CREATE TABLE webhook_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider VARCHAR(50) DEFAULT 'CASHFREE',
        event_id VARCHAR(255) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        processing_error TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP,
        UNIQUE(provider, event_id)
    );
    CREATE INDEX idx_webhooks_status ON webhook_events(status);
  END IF;
END $$;
