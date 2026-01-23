-- Migration: Add payroll tables

CREATE TABLE payroll_salary_components (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    amount numeric NOT NULL DEFAULT 0,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payroll_salary_components_tenant_idx ON payroll_salary_components(tenant_id);

CREATE TABLE payroll_expenses (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category varchar(255) NOT NULL,
    amount numeric NOT NULL DEFAULT 0,
    expense_date date NOT NULL DEFAULT CURRENT_DATE,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payroll_expenses_tenant_idx ON payroll_expenses(tenant_id);

CREATE TABLE payroll_loans (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id uuid REFERENCES employees(id),
    employee_name varchar(255),
    amount numeric NOT NULL DEFAULT 0,
    outstanding numeric NOT NULL DEFAULT 0,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payroll_loans_tenant_idx ON payroll_loans(tenant_id);

CREATE TABLE payroll_transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id uuid REFERENCES employees(id),
    type varchar(50) NOT NULL,
    amount numeric NOT NULL DEFAULT 0,
    tx_date date NOT NULL DEFAULT CURRENT_DATE,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payroll_transactions_tenant_idx ON payroll_transactions(tenant_id);

CREATE TABLE payroll_payslips (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id uuid NOT NULL REFERENCES employees(id),
    amount numeric NOT NULL DEFAULT 0,
    status varchar(30) NOT NULL DEFAULT 'PENDING', -- PENDING | PAID | FAILED
    issued_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payroll_payslips_tenant_idx ON payroll_payslips(tenant_id);

-- Enable RLS
ALTER TABLE payroll_salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_payslips ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies: tenant isolation
CREATE POLICY payroll_salary_components_select ON payroll_salary_components
    FOR SELECT
    USING (tenant_id = current_tenant());
CREATE POLICY payroll_salary_components_insert ON payroll_salary_components
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant());

CREATE POLICY payroll_expenses_select ON payroll_expenses
    FOR SELECT
    USING (tenant_id = current_tenant());
CREATE POLICY payroll_expenses_insert ON payroll_expenses
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant());

CREATE POLICY payroll_loans_select ON payroll_loans
    FOR SELECT
    USING (tenant_id = current_tenant());
CREATE POLICY payroll_loans_insert ON payroll_loans
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant());

CREATE POLICY payroll_transactions_select ON payroll_transactions
    FOR SELECT
    USING (tenant_id = current_tenant());
CREATE POLICY payroll_transactions_insert ON payroll_transactions
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant());

CREATE POLICY payroll_payslips_select ON payroll_payslips
    FOR SELECT
    USING (tenant_id = current_tenant());
CREATE POLICY payroll_payslips_insert ON payroll_payslips
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant());
