-- ===================================================================
-- HRMS SAAS - MASTER SCHEMA (FINAL WORKING VERSION)
-- ===================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===================================================================
-- 1. TENANTS
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    zip_code VARCHAR(20),
    settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX tenants_domain_key ON tenants(domain);
CREATE UNIQUE INDEX tenants_email_key ON tenants(email);

-- ===================================================================
-- 1.1 PLANS
-- ===================================================================
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE, -- STANDARD, PREMIUM, ELITE
    description TEXT,
    price NUMERIC(12, 2) NOT NULL,
    max_employees INTEGER, -- NULL for unlimited
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===================================================================
-- 1.2 SUBSCRIPTIONS
-- ===================================================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    
    status VARCHAR(20) NOT NULL DEFAULT 'TRIAL', -- TRIAL, ACTIVE, EXPIRED, CANCELLED
    billing_cycle VARCHAR(20) DEFAULT 'MONTHLY', -- MONTHLY, YEARLY
    
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE, -- NULL for trials/forever
    
    trial_ends_at DATE,
    is_trial BOOLEAN DEFAULT FALSE,
    
    last_payment_date DATE,
    amount_paid NUMERIC(12, 2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ===================================================================
-- 2. ROLES & RBAC
-- ===================================================================
CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    role_type       VARCHAR(20) NOT NULL DEFAULT 'CUSTOM',   -- PLATFORM, SYSTEM, CUSTOM
    is_deletable    BOOLEAN NOT NULL DEFAULT TRUE,
    is_customizable BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID,
    created_at      TIMESTAMP DEFAULT now(),
    updated_at      TIMESTAMP DEFAULT now()
);

-- System roles (tenant_id IS NULL) must have unique names
CREATE UNIQUE INDEX roles_unique_system ON roles(name) WHERE tenant_id IS NULL;
-- Tenant roles must have unique names within their tenant
CREATE UNIQUE INDEX roles_unique_per_tenant ON roles(tenant_id, name) WHERE tenant_id IS NOT NULL;

-- 2.1 PERMISSIONS (system-wide, immutable)
CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL UNIQUE,  -- e.g. 'employees.view', 'leave.approve'
    category    VARCHAR(50) NOT NULL,           -- e.g. 'employees', 'leave', 'payroll'
    description TEXT,
    created_at  TIMESTAMP DEFAULT now()
);

-- 2.2 ROLE PERMISSIONS (many-to-many)
CREATE TABLE role_permissions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at    TIMESTAMP DEFAULT now(),
    UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_perm ON role_permissions(permission_id);

-- 2.3 USER ROLES (many-to-many with optional scope)
CREATE TABLE user_roles (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
    scope_type    VARCHAR(30),     -- NULL, 'department', 'location'
    scope_id      UUID,            -- department_id, location_id, etc.
    assigned_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at   TIMESTAMP DEFAULT now(),
    UNIQUE(user_id, role_id, COALESCE(scope_type, ''), COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'))
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_tenant ON user_roles(tenant_id);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- 3. USERS
-- ===================================================================
CREATE TABLE users (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id            UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email                VARCHAR(150) NOT NULL,
    password_hash        TEXT NOT NULL,
    role                 VARCHAR(30) NOT NULL,

    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,

    last_login_at        TIMESTAMP,
    last_password_change TIMESTAMP,

    is_deleted           BOOLEAN NOT NULL DEFAULT FALSE,
    portal_access_until  DATE,
    created_at           TIMESTAMP DEFAULT now(),
    updated_at           TIMESTAMP DEFAULT now(),
    created_by           UUID,
    updated_by           UUID
);

-- superadmin must not collide with any tenant
CREATE UNIQUE INDEX users_unique_global_superadmin ON users(email)
    WHERE tenant_id IS NULL;

-- per-tenant user email uniqueness
CREATE UNIQUE INDEX users_email_per_tenant ON users(tenant_id, email);

-- ===================================================================
-- 4. EMPLOYEES (one-to-one with users)
-- ===================================================================
CREATE TABLE employees (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    -- Basic Information
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    phone           VARCHAR(20),
    
    -- Personal Information
    date_of_birth   DATE,
    gender          VARCHAR(20),
    marital_status  VARCHAR(50),
    nationality     VARCHAR(100),
    
    -- Emergency Contact
    emergency_name  VARCHAR(100),
    emergency_phone VARCHAR(20),
    emergency_relation VARCHAR(50),
    
    -- Professional Details
    employee_id     VARCHAR(50) UNIQUE,
    department_id   UUID,
    designation_id  UUID,
    reports_to      UUID,
    join_date       DATE,
    employment_type VARCHAR(50),
    shift           VARCHAR(50),
    
    -- Finance Information
    bank_name       VARCHAR(100),
    account_name    VARCHAR(100),
    account_number  VARCHAR(50),
    ifsc_code       VARCHAR(20),
    tax_id          VARCHAR(50),
    
    -- Address
    address         TEXT,

    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    status          VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, TERMINATED, ONBOARDING
    termination_date DATE,
    termination_reason TEXT,

    created_at      TIMESTAMP DEFAULT now(),
    updated_at      TIMESTAMP DEFAULT now(),
    created_by      UUID,
    updated_by      UUID
);

-- ===================================================================
-- 5. DEPARTMENTS
-- ===================================================================
CREATE TABLE departments (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    description  TEXT,
    is_active    BOOLEAN DEFAULT TRUE,

    created_at   TIMESTAMP DEFAULT now(),
    updated_at   TIMESTAMP DEFAULT now(),
    created_by   UUID,
    updated_by   UUID
);

CREATE UNIQUE INDEX dept_unique_name_per_tenant ON departments(tenant_id, name);

-- ===================================================================
-- 6. DESIGNATIONS
-- ===================================================================
CREATE TABLE designations (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    description  TEXT,
    is_active    BOOLEAN DEFAULT TRUE,

    created_at   TIMESTAMP DEFAULT now(),
    updated_at   TIMESTAMP DEFAULT now(),
    created_by   UUID,
    updated_by   UUID
);

CREATE UNIQUE INDEX designation_unique_name_per_tenant ON designations(tenant_id, name);

-- ===================================================================
-- 7. USER SESSIONS (Refresh Token)
-- ===================================================================
CREATE TABLE user_sessions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id      UUID,
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    refresh_token  TEXT NOT NULL,
    ip_address     TEXT,
    user_agent     TEXT,
    is_revoked     BOOLEAN DEFAULT FALSE,

    expires_at     TIMESTAMP NOT NULL,
    created_at     TIMESTAMP DEFAULT now(),
    updated_at     TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_sessions_refresh ON user_sessions(refresh_token);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);

-- ===================================================================
-- 8. PASSWORD RESET TOKENS
-- ===================================================================
CREATE TABLE password_resets (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email        TEXT NOT NULL,
    token        TEXT NOT NULL,
    expires_at   TIMESTAMP NOT NULL,
    created_at   TIMESTAMP DEFAULT now()
);

CREATE INDEX password_reset_email_idx ON password_resets(email);

-- ===================================================================
-- 9. AUDIT LOGS
-- ===================================================================
CREATE TABLE audit_logs (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID,
    actor_id      UUID,
    target_table  TEXT,
    target_id     UUID,
    action        TEXT,
    old_data      JSONB,
    new_data      JSONB,
    created_at    TIMESTAMP DEFAULT now()
);

-- ===================================================================
-- 10. ATTENDANCE
-- Status values: PRESENT, HALF_DAY, ABSENT, APPROVED, REJECTED, PENDING_CHECKOUT
-- PENDING_CHECKOUT: Auto-set when employee forgets checkout (11:59 PM nightly job)
--                   Allows employee/manager review before final status confirmation
-- ===================================================================
CREATE TABLE attendance (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date                DATE NOT NULL,
    check_in_time       TIME,
    check_out_time      TIME,
    check_in_ip         TEXT,
    check_out_ip        TEXT,
    status              VARCHAR(20) DEFAULT 'PRESENT',
    is_late             BOOLEAN DEFAULT FALSE,
    late_by_minutes     INTEGER DEFAULT 0,
    is_early_checkout   BOOLEAN DEFAULT FALSE,
    early_checkout_minutes INTEGER DEFAULT 0,
    approved_by         UUID REFERENCES users(id),
    approval_reason     TEXT,
    rejection_reason    TEXT,
    work_mode           VARCHAR(50) DEFAULT 'OFFICE',
    notes               TEXT,
    
    created_at          TIMESTAMP DEFAULT now(),
    updated_at          TIMESTAMP DEFAULT now(),
    created_by          UUID,
    updated_by          UUID
);

CREATE UNIQUE INDEX attendance_unique_employee_date ON attendance(tenant_id, employee_id, date);
CREATE INDEX attendance_date_idx ON attendance(tenant_id, date);
CREATE INDEX attendance_employee_idx ON attendance(tenant_id, employee_id);
CREATE INDEX attendance_status_idx ON attendance(tenant_id, status);
-- Indexes for PENDING_CHECKOUT workflow
CREATE INDEX attendance_pending_checkout_idx ON attendance(tenant_id, status, created_at) WHERE status = 'PENDING_CHECKOUT';
CREATE INDEX attendance_employee_status_idx ON attendance(tenant_id, employee_id, status);

-- ==========================================
-- LEAVE APPLICATIONS
-- ==========================================
-- ==========================================
-- 10.1 LEAVE TYPES
-- ==========================================
CREATE TABLE leave_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL, -- e.g. AL, SL, CL
    description TEXT,
    is_paid BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT TRUE,
    requires_attachment BOOLEAN DEFAULT FALSE,
    min_days_notice INTEGER DEFAULT 0,
    max_consecutive_days INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

CREATE UNIQUE INDEX idx_leave_types_code ON leave_types(tenant_id, code);

-- ==========================================
-- 10.2 LEAVE POLICIES (Accrual Rules)
-- ==========================================
CREATE TABLE leave_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Eligibility
    applicable_roles TEXT[], -- e.g. ['EMPLOYEE', 'MANAGER']
    employment_types TEXT[], -- e.g. ['FULL_TIME', 'PART_TIME']
    is_probation_eligible BOOLEAN DEFAULT FALSE,
    min_tenure_months INTEGER DEFAULT 0,
    
    -- Accrual Logic
    accrual_type VARCHAR(20) DEFAULT 'MONTHLY', -- MONTHLY, YEARLY, FIXED
    accrual_rate NUMERIC(5, 2) DEFAULT 0, -- e.g. 1.5 days per month
    max_balance NUMERIC(5, 2), -- Max days that can be accumulated
    year_start_month INTEGER DEFAULT 1, -- 1=Jan, 4=Apr
    
    priority INTEGER DEFAULT 100, -- Processing order if multiple match
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

-- ==========================================
-- 10.3 EMPLOYEE LEAVE POLICY OVERRIDES
-- ==========================================
CREATE TABLE employee_leave_policy_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES leave_policies(id),
    
    reason TEXT,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,
    
    UNIQUE(tenant_id, employee_id, leave_type_id)
);

-- ==========================================
-- 10.4 LEAVE BALANCES
-- ==========================================
CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    
    opening_balance NUMERIC(6, 2) DEFAULT 0,
    accrued NUMERIC(6, 2) DEFAULT 0,
    used NUMERIC(6, 2) DEFAULT 0,
    adjusted NUMERIC(6, 2) DEFAULT 0, -- Manual adjustments
    
    current_balance NUMERIC(6, 2) GENERATED ALWAYS AS (opening_balance + accrued - used + adjusted) STORED,
    
    accrual_start_date DATE,
    last_accrual_date DATE,
    
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(tenant_id, employee_id, leave_type_id, year)
);

-- ==========================================
-- 10.5 LEAVE BALANCE ADJUSTMENTS (Audit Trail)
-- ==========================================
CREATE TABLE leave_balance_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    balance_id UUID NOT NULL REFERENCES leave_balances(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    adjustment_type VARCHAR(20) NOT NULL, -- ACCRUAL, MANUAL, CARRY_FORWARD, RESET, DEDUCT, GRANT
    amount NUMERIC(6, 2) NOT NULL,
    reason TEXT,
    
    previous_balance NUMERIC(6, 2),
    new_balance NUMERIC(6, 2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

-- ==========================================
-- 10.6 PUBLIC HOLIDAYS
-- ==========================================
CREATE TABLE public_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    year INTEGER NOT NULL,
    
    is_paid BOOLEAN DEFAULT TRUE,
    is_optional BOOLEAN DEFAULT FALSE, -- If true, it's a restricted holiday pool usually, but simplifying here
    
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,
    
    UNIQUE(tenant_id, date)
);

-- ==========================================
-- 10.7 RESTRICTED (FLOATING) HOLIDAYS
-- ==========================================
CREATE TABLE restricted_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    year INTEGER NOT NULL,
    description TEXT,
    max_claims INTEGER, -- Max employees who can claim
    current_claims INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);

CREATE TABLE restricted_holiday_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    restricted_holiday_id UUID NOT NULL REFERENCES restricted_holidays(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'APPROVED', -- Usually auto-approved if slot available
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(tenant_id, employee_id, restricted_holiday_id)
);

-- ==========================================
-- 10.8 APPROVAL DELEGATIONS
-- ==========================================
CREATE TABLE approval_delegations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    delegator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Manager
    delegate_id UUID NOT NULL REFERENCES users(id), -- Person acting on behalf
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMP,
    revoked_by UUID,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 10.9 LEAVE APPLICATIONS (Updated)
-- ==========================================
CREATE TABLE leave_applications (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id     uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

    leave_type_id   uuid REFERENCES leave_types(id), -- New FK
    -- leave_type varchar(30) NO LONGER USED, replaced by ID but kept for migration if needed or removed
    
    start_date      date NOT NULL,
    end_date        date NOT NULL,
    days_count      numeric(5, 2), -- Calculated days

    is_half_day     boolean NOT NULL DEFAULT false,
    half_day_session varchar(10), -- 'MORNING', 'AFTERNOON'

    reason          text,
    attachment_url  text,
    status          varchar(20) NOT NULL DEFAULT 'PENDING', 
        -- PENDING | APPROVED | REJECTED | CANCELLED

    manager_note    text,

    approved_by     uuid,
    approved_at     timestamptz,
    rejected_by     uuid,
    rejected_at     timestamptz,
    rejection_reason text,
    
    cancelled_by    uuid,
    cancelled_at    timestamptz,

    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    created_by      uuid,
    updated_by      uuid
);

CREATE INDEX idx_leave_tenant_employee_dates 
    ON leave_applications (tenant_id, employee_id, start_date, end_date);

ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY leave_isolation ON leave_applications
    USING (
        tenant_id = current_setting('app.tenant_id', true)::uuid
    );


-- ===================================================================
-- 11.Loan 
-- ===================================================================

CREATE TABLE loan_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,

    name VARCHAR(50) NOT NULL,      -- Salary Advance, Personal Loan
    max_amount NUMERIC(12,2),
    max_tenure_months INT,
    interest_rate NUMERIC(5,2),
    interest_type VARCHAR(20),      -- FLAT | REDUCING

    is_taxable BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE employee_loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    loan_type_id UUID NOT NULL REFERENCES loan_types(id),

    principal_amount NUMERIC(12,2) NOT NULL,   -- ✅ MISSING COLUMN (ROOT CAUSE)

    interest_rate NUMERIC(5,2) DEFAULT 0,
    interest_type VARCHAR(20) DEFAULT 'FLAT',
        -- FLAT | REDUCING

    tenure_months INT NOT NULL,
    emi_amount NUMERIC(12,2) NOT NULL,

    total_payable_amount NUMERIC(12,2) NOT NULL,
    outstanding_amount NUMERIC(12,2) NOT NULL,

    start_date DATE NOT NULL,
    end_date DATE,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        -- PENDING | APPROVED | REJECTED | ACTIVE | CLOSED | CANCELLED

    remarks TEXT,

    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,

    closed_by UUID REFERENCES users(id),
    closed_at TIMESTAMP,
    closure_reason TEXT,

    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);


CREATE TABLE employee_loan_installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    tenant_id UUID NOT NULL,
    loan_id UUID NOT NULL,               -- FK → employee_loans.id
    employee_id UUID NOT NULL,
    salary_component_id UUID NOT NULL,

    installment_number INT NOT NULL,
    due_month DATE NOT NULL,

    principal_component NUMERIC(12,2) NOT NULL,
    interest_component NUMERIC(12,2) DEFAULT 0,
    installment_amount NUMERIC(12,2) NOT NULL,

    payment_status VARCHAR(20) DEFAULT 'PENDING',
        -- PENDING | PAID | SKIPPED | ADJUSTED

    payroll_run_id UUID,                 -- FK → payroll_runs.id
    paid_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);


CREATE TABLE employee_loan_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    tenant_id UUID NOT NULL,
    loan_id UUID NOT NULL,
    employee_id UUID NOT NULL,

    payment_date DATE NOT NULL,
    payment_amount NUMERIC(12,2) NOT NULL,

    payment_source VARCHAR(30),
        -- PAYROLL | MANUAL | ADJUSTMENT

    payroll_run_id UUID,                 -- nullable
    remarks TEXT,

    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE employee_loan_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    loan_id UUID NOT NULL,
    
    approver_id UUID NOT NULL,      -- users.id
    approver_role VARCHAR(30),      -- HR | FINANCE | ADMIN
    approval_level INT NOT NULL,    -- 1,2,3...

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        -- PENDING | APPROVED | REJECTED

    remarks TEXT,
    action_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT now()
);


CREATE TABLE employee_loan_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    loan_id UUID NOT NULL,

    adjustment_type VARCHAR(30),
        -- WAIVER | WRITE_OFF | EMI_ADJUSTMENT

    adjustment_amount NUMERIC(12,2) NOT NULL,
    reason TEXT,

    approved_by UUID,
    approved_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT now()
);


CREATE INDEX idx_loans_employee ON employee_loans(tenant_id, employee_id);
CREATE INDEX idx_loan_installments_due ON employee_loan_installments(tenant_id, due_month);
CREATE INDEX idx_loan_installments_payrun ON employee_loan_installments(payroll_run_id);


-- ===================================================================
-- 12. EXPENSE CATEGORIES
-- ===================================================================
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  requires_approval BOOLEAN DEFAULT false,
  approval_threshold NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),

  CONSTRAINT uq_expense_category_code UNIQUE (tenant_id, code)
);


CREATE TABLE employee_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  category_id UUID NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  expense_date DATE NOT NULL,

  include_in_payroll BOOLEAN DEFAULT false,

  status VARCHAR(20) DEFAULT 'PENDING',
    -- PENDING | APPROVED | REJECTED

  remarks TEXT,

  approved_by UUID,
  approved_at TIMESTAMP,

  created_by UUID,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    is_deleted BOOLEAN DEFAULT false
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_expenses ENABLE ROW LEVEL SECURITY;

-- ============================
-- VENDOR / CONSULTANT PAYMENTS
-- ============================
CREATE TABLE vendor_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  vendor_name VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  created_by UUID,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ============================
-- 3RD PARTY PAYROLL PAYOUTS
-- ============================
CREATE TABLE third_party_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  provider_name VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  payout_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  created_by UUID,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ============================
-- MERCHANT TRANSACTIONS
-- ============================
CREATE TABLE merchant_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  merchant_name VARCHAR(255) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  transaction_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'SUCCESS',
  created_at TIMESTAMP DEFAULT now()
);

-- ============================
-- INBOX & TASKS
-- ============================
CREATE TABLE inbox_tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  category    VARCHAR(50) NOT NULL, -- Onboarding, Payroll, Compliance, etc.
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  due_date    DATE,
  
  status      VARCHAR(20) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED
  
  created_at  TIMESTAMP DEFAULT now(),
  updated_at  TIMESTAMP DEFAULT now(),
  created_by  UUID -- Assignor
);

CREATE TABLE inbox_activities (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id    UUID NOT NULL REFERENCES inbox_tasks(id) ON DELETE CASCADE,
  actor_id   UUID NOT NULL REFERENCES users(id),
  message    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- ============================
-- EMPLOYEE DOCUMENTS
-- ============================
CREATE TABLE employee_documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  file_name   VARCHAR(255) NOT NULL,
  file_url    TEXT NOT NULL,
  file_type   VARCHAR(50),
  
  created_at  TIMESTAMP DEFAULT now(),
  created_by  UUID
);

CREATE INDEX idx_inbox_employee ON inbox_tasks(tenant_id, employee_id);
CREATE INDEX idx_documents_employee ON employee_documents(tenant_id, employee_id);

ALTER TABLE inbox_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;


-- ===================================================================
-- 11. RLS CONTEXT FUNCTIONS
-- ===================================================================

CREATE OR REPLACE FUNCTION current_tenant()
RETURNS UUID LANGUAGE sql AS $$
    SELECT current_setting('app.tenant_id', true)::uuid;
$$;

CREATE OR REPLACE FUNCTION current_app_role()
RETURNS TEXT LANGUAGE sql AS $$
    SELECT current_setting('app.role', true);
$$;

CREATE OR REPLACE FUNCTION current_app_user()
RETURNS UUID LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.user_id', true), '')::uuid;
$$;

-- Check if current user (via app.user_id) has a specific permission
CREATE OR REPLACE FUNCTION has_permission(perm_name TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
          AND p.name = perm_name
    );
$$;

-- ===================================================================
-- 11.Loan 
-- ===================================================================

-- ===================================================================
-- 12. RLS POLICIES (FINAL)
-- ===================================================================

-- PERMISSIONS (readable by all authenticated, immutable by system)
CREATE POLICY permissions_select ON permissions
    FOR SELECT
    USING (true);

-- ROLE_PERMISSIONS (readable by all authenticated, managed via service)
CREATE POLICY role_permissions_select ON role_permissions
    FOR SELECT
    USING (true);

CREATE POLICY role_permissions_manage ON role_permissions
    FOR ALL
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR has_permission('roles.manage')
    );

-- USER_ROLES (tenant-isolated, manageable by admins)
CREATE POLICY user_roles_select ON user_roles
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY user_roles_manage ON user_roles
    FOR ALL
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR (tenant_id = current_tenant() AND has_permission('roles.assign'))
    );

-- ROLES (system roles readable by all, tenant roles by tenant, management by admins)
CREATE POLICY roles_select ON roles
    FOR SELECT
    USING (
        tenant_id IS NULL
        OR current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY roles_insert ON roles
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR (tenant_id = current_tenant() AND has_permission('roles.manage'))
    );

CREATE POLICY roles_update ON roles
    FOR UPDATE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR (tenant_id = current_tenant() AND has_permission('roles.manage'))
    );

CREATE POLICY roles_delete ON roles
    FOR DELETE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR (tenant_id = current_tenant() AND has_permission('roles.manage') AND is_deletable = true)
    );

-- TENANTS (super admin only)
CREATE POLICY tenants_select ON tenants
    FOR SELECT
    USING (current_app_role() = 'SUPER_ADMIN');

CREATE POLICY tenants_insert ON tenants
    FOR INSERT
    WITH CHECK (current_app_role() = 'SUPER_ADMIN');

CREATE POLICY tenants_update ON tenants
    FOR UPDATE
    USING (current_app_role() = 'SUPER_ADMIN');

CREATE POLICY tenants_delete ON tenants
    FOR DELETE
    USING (current_app_role() = 'SUPER_ADMIN');

-- USERS
CREATE POLICY users_select ON users
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY users_insert ON users
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY users_update ON users
    FOR UPDATE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY users_delete ON users
    FOR DELETE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

-- EMPLOYEES
CREATE POLICY employees_select ON employees
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY employees_insert ON employees
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY employees_update ON employees
    FOR UPDATE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY employees_delete ON employees
    FOR DELETE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

-- DEPARTMENTS
CREATE POLICY departments_select ON departments
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY departments_insert ON departments
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY departments_update ON departments
    FOR UPDATE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY departments_delete ON departments
    FOR DELETE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

-- DESIGNATIONS
CREATE POLICY designations_select ON designations
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY designations_insert ON designations
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY designations_update ON designations
    FOR UPDATE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY designations_delete ON designations
    FOR DELETE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

-- USER SESSIONS (handle NULL tenant_id for system accounts)
CREATE POLICY sessions_select ON user_sessions
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR (tenant_id IS NOT NULL AND tenant_id = current_tenant())
        OR (tenant_id IS NULL AND current_app_role() = 'SUPER_ADMIN')
    );

CREATE POLICY sessions_insert ON user_sessions
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR (tenant_id IS NULL OR tenant_id = current_tenant())
    );

-- AUDIT LOGS (Read-only for all users within tenant, write-only for backend)
CREATE POLICY audit_logs_select ON audit_logs
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR (tenant_id IS NOT NULL AND tenant_id = current_tenant())
    );

CREATE POLICY audit_logs_insert ON audit_logs
    FOR INSERT
    WITH CHECK (true);

-- PASSWORD RESETS (publicly accessible by email, but read-only)
CREATE POLICY password_resets_select ON password_resets
    FOR SELECT
    USING (true);

CREATE POLICY password_resets_insert ON password_resets
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY password_resets_delete ON password_resets
    FOR DELETE
    USING (true);

-- ATTENDANCE
CREATE POLICY attendance_select ON attendance
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY attendance_insert ON attendance
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY attendance_update ON attendance
    FOR UPDATE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY attendance_delete ON attendance
    FOR DELETE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

-- LEAVE APPLICATIONS
CREATE POLICY leave_select ON leave_applications
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY leave_insert ON leave_applications
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY leave_update ON leave_applications
    FOR UPDATE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

-- EMPLOYEE LOANS
CREATE POLICY loan_select ON employee_loans
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY loan_insert ON employee_loans
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY loan_update ON employee_loans
    FOR UPDATE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

-- EMPLOYEE LOAN INSTALLMENTS
CREATE POLICY loan_installments_select ON employee_loan_installments
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY loan_installments_insert ON employee_loan_installments
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

-- EMPLOYEE LOAN PAYMENTS
CREATE POLICY loan_payments_select ON employee_loan_payments
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY loan_payments_insert ON employee_loan_payments
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

-- EMPLOYEE LOAN APPROVALS
CREATE POLICY loan_approvals_select ON employee_loan_approvals
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY loan_approvals_insert ON employee_loan_approvals
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

-- EMPLOYEE LOAN ADJUSTMENTS
CREATE POLICY loan_adjustments_select ON employee_loan_adjustments
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY loan_adjustments_insert ON employee_loan_adjustments
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

-- LOAN TYPES
CREATE POLICY loan_types_select ON loan_types
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY loan_types_insert ON loan_types
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

-- EXPENSE CATEGORIES
CREATE POLICY expense_categories_select ON expense_categories
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY expense_categories_insert ON expense_categories
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

-- ===================================================================
-- ASSET MANAGEMENT TABLES
-- ===================================================================

-- ASSETS TABLE
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Asset Identification
    asset_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Purchase Information
    purchase_date DATE,
    purchase_price DECIMAL(12, 2),
    manufacturer VARCHAR(100),
    serial_number VARCHAR(100),
    warranty_expiry DATE,
    
    -- Technical Configuration (For Hardware Assets)
    operating_system VARCHAR(255),
    processor_cpu VARCHAR(255),
    ram VARCHAR(100),
    storage VARCHAR(100),
    graphics_gpu VARCHAR(255),
    display VARCHAR(100),
    battery VARCHAR(100),
    model_number VARCHAR(100),
    
    -- Assignment Information
    assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
    assigned_date TIMESTAMP,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    return_date TIMESTAMP,
    
    -- Status Tracking
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    
    -- Additional Info
    notes TEXT,
    
    -- Audit Trail
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX assets_unique_code_per_tenant ON assets(tenant_id, asset_code);
CREATE INDEX assets_tenant_idx ON assets(tenant_id);
CREATE INDEX assets_status_idx ON assets(tenant_id, status);
CREATE INDEX assets_category_idx ON assets(tenant_id, category);
CREATE INDEX assets_assigned_to_idx ON assets(assigned_to);

-- ASSET TRACKING TABLE
CREATE TABLE IF NOT EXISTS asset_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Event Type
    event_type VARCHAR(50) NOT NULL,
    
    -- Event Details
    description TEXT,
    related_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    
    -- Audit Trail
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX asset_tracking_asset_idx ON asset_tracking(asset_id);
CREATE INDEX asset_tracking_tenant_idx ON asset_tracking(tenant_id);
CREATE INDEX asset_tracking_created_at_idx ON asset_tracking(created_at DESC);

-- ASSET USAGE HISTORY TABLE
CREATE TABLE IF NOT EXISTS asset_usage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Usage Details
    assigned_date DATE NOT NULL,
    return_date DATE,
    description TEXT,
    
    -- Audit Trail
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX usage_history_asset_idx ON asset_usage_history(asset_id);
CREATE INDEX usage_history_employee_idx ON asset_usage_history(employee_id);
CREATE INDEX usage_history_tenant_idx ON asset_usage_history(tenant_id);



CREATE POLICY expense_categories_update ON expense_categories
    FOR UPDATE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY expense_categories_delete ON expense_categories
    FOR DELETE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

-- EMPLOYEE EXPENSES
CREATE POLICY employee_expenses_select ON employee_expenses
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY employee_expenses_insert ON employee_expenses
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY employee_expenses_update ON employee_expenses
    FOR UPDATE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY employee_expenses_delete ON employee_expenses
    FOR DELETE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

-- PLANS (everyone can read, only super-admin can manage)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_select ON plans
    FOR SELECT
    USING (true);

CREATE POLICY plans_manage ON plans
    FOR ALL
    USING (current_app_role() = 'SUPER_ADMIN');

-- SUBSCRIPTIONS (restricted by tenant, super-admin can see all)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_isolation ON subscriptions
    FOR ALL
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );
-- ===================================================================
-- ASSET MANAGEMENT RLS POLICIES
-- ===================================================================

-- ASSETS TABLE
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY assets_select ON assets
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY assets_insert ON assets
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR (tenant_id = current_tenant() AND current_app_role() IN ('ADMIN', 'HR'))
    );

CREATE POLICY assets_update ON assets
    FOR UPDATE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR (tenant_id = current_tenant() AND current_app_role() = 'ADMIN')
    );

CREATE POLICY assets_delete ON assets
    FOR DELETE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR (tenant_id = current_tenant() AND current_app_role() = 'ADMIN')
    );

-- ASSET TRACKING TABLE
ALTER TABLE asset_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY asset_tracking_select ON asset_tracking
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY asset_tracking_insert ON asset_tracking
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR (tenant_id = current_tenant() AND current_app_role() IN ('ADMIN', 'HR'))
    );

-- ASSET USAGE HISTORY TABLE
ALTER TABLE asset_usage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY asset_usage_history_select ON asset_usage_history
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY asset_usage_history_insert ON asset_usage_history
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR (tenant_id = current_tenant() AND current_app_role() IN ('ADMIN', 'HR'))
    );

-- ASSET REQUESTS TABLE
CREATE TABLE IF NOT EXISTS asset_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Request Details
    asset_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    reason TEXT,
    
    -- Status and Review
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    
    -- Audit Trail
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX asset_requests_tenant_idx ON asset_requests(tenant_id);
CREATE INDEX asset_requests_employee_idx ON asset_requests(employee_id);
CREATE INDEX asset_requests_status_idx ON asset_requests(tenant_id, status);

-- ASSET REQUESTS RLS POLICIES
ALTER TABLE asset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY asset_requests_select ON asset_requests
    FOR SELECT
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY asset_requests_insert ON asset_requests
    FOR INSERT
    WITH CHECK (
        current_app_role() = 'SUPER_ADMIN'
        OR tenant_id = current_tenant()
    );

CREATE POLICY asset_requests_update ON asset_requests
    FOR UPDATE
    USING (
        current_app_role() = 'SUPER_ADMIN'
        OR (tenant_id = current_tenant() AND current_app_role() IN ('ADMIN', 'HR'))
    );

-- ===================================================================
-- 18. PROJECT MANAGEMENT
-- ===================================================================

-- 18.1 CLIENTS
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    zip_code VARCHAR(20),
    
    status VARCHAR(20) DEFAULT 'ACTIVE',
    notes TEXT,
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 18.2 PROJECTS
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'PLANNING', 
    
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15, 2),
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 18.2.1 PROJECT MEMBERS (Employee-to-Project Assignment)
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    role VARCHAR(50) DEFAULT 'MEMBER', -- LEAD, MEMBER
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(tenant_id, project_id, employee_id)
);

-- 18.3 KANBAN COLUMNS
CREATE TABLE project_kanban_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    column_key VARCHAR(50) NOT NULL,
    column_label VARCHAR(100) NOT NULL,
    order_index INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT TRUE,
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 18.4 TASKS
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    column_key VARCHAR(50) NOT NULL,
    order_index INTEGER DEFAULT 0,
    
    due_date DATE,
    estimated_hours DECIMAL(8, 2),
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 18.4.1 TASK ASSIGNEES (Multiple Assignees Junction Table)
CREATE TABLE task_assignees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(task_id, employee_id)
);

CREATE INDEX idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_employee ON task_assignees(employee_id);
CREATE INDEX idx_task_assignees_tenant ON task_assignees(tenant_id);

-- 18.5 TIMESHEETS
CREATE TABLE timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    total_hours DECIMAL(8, 2) DEFAULT 0,
    
    status VARCHAR(20) DEFAULT 'DRAFT', 
    
    submitted_at TIMESTAMP,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 18.6 TIMESHEET ENTRIES
CREATE TABLE timesheet_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    timesheet_id UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    work_date DATE NOT NULL,
    hours DECIMAL(5, 2) NOT NULL,
    notes TEXT,
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_isolation ON clients USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
CREATE POLICY project_isolation ON projects USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
CREATE POLICY project_member_isolation ON project_members USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
CREATE POLICY kanban_isolation ON project_kanban_columns USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
CREATE POLICY task_isolation ON tasks USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
CREATE POLICY task_assignee_isolation ON task_assignees USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
CREATE POLICY timesheet_isolation ON timesheets USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
CREATE POLICY timesheet_entry_isolation ON timesheet_entries USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- INDEXES
CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_employee ON project_members(employee_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_timesheets_employee ON timesheets(employee_id);
CREATE INDEX idx_te_timesheet ON timesheet_entries(timesheet_id);
CREATE INDEX idx_te_date ON timesheet_entries(tenant_id, work_date);
