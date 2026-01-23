-- Migration: Comprehensive Payroll Schema Fix (Tables Only - No RLS)
-- Date: 2026-01-09

-- 1. Pay Schedules
CREATE TABLE IF NOT EXISTS pay_schedules (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name varchar(100) NOT NULL,
    cycle varchar(50) DEFAULT 'MONTHLY', -- MONTHLY, WEEKLY, BIWEEKLY
    pay_day integer DEFAULT 28,
    cut_off_day integer DEFAULT 25,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Salary Templates
CREATE TABLE IF NOT EXISTS salary_templates (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name varchar(100) NOT NULL,
    code varchar(50),
    description text,
    basic_percentage numeric DEFAULT 40,
    hra_percentage numeric DEFAULT 20,
    da_percentage numeric DEFAULT 10,
    special_allowance_percentage numeric DEFAULT 20,
    other_allowance_percentage numeric DEFAULT 10,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Statutory Configuration
CREATE TABLE IF NOT EXISTS statutory_config (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pf_enabled boolean DEFAULT true,
    pf_employee_rate numeric DEFAULT 12,
    pf_employer_rate numeric DEFAULT 12,
    pf_wage_ceiling numeric DEFAULT 15000,
    esi_enabled boolean DEFAULT true,
    esi_employee_rate numeric DEFAULT 0.75,
    esi_employer_rate numeric DEFAULT 3.25,
    esi_wage_ceiling numeric DEFAULT 21000,
    pt_enabled boolean DEFAULT true,
    pt_state varchar(100) DEFAULT 'Karnataka',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. PT Slabs
CREATE TABLE IF NOT EXISTS pt_slabs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    state varchar(100) NOT NULL,
    min_salary numeric NOT NULL,
    max_salary numeric,
    monthly_tax numeric NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 5. Deduction Types
CREATE TABLE IF NOT EXISTS deduction_types (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name varchar(100) NOT NULL,
    code varchar(50) NOT NULL,
    category varchar(50) DEFAULT 'OTHER', -- STATUTORY, LOAN, ADVANCE, PENALTY, OTHER
    is_statutory boolean DEFAULT false,
    calculation_type varchar(50) DEFAULT 'FIXED', -- FIXED, PERCENTAGE
    is_taxable boolean DEFAULT true,
    is_recurring boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 6. Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    code varchar(50) NOT NULL,
    description text,
    requires_approval boolean DEFAULT false,
    approval_threshold numeric,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 7. Employee Expenses (replaces reimbursements)
CREATE TABLE IF NOT EXISTS employee_expenses (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id uuid REFERENCES employees(id),
    category_id uuid REFERENCES expense_categories(id),
    amount numeric NOT NULL DEFAULT 0,
    expense_date date NOT NULL DEFAULT CURRENT_DATE,
    include_in_payroll boolean DEFAULT true,
    remarks text,
    status varchar(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, PAID
    is_deleted boolean DEFAULT false,
    payroll_run_id uuid, -- Link to payroll run when paid
    created_by uuid REFERENCES users(id),
    approved_by uuid REFERENCES users(id),
    approved_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 8. Employee Salary Details
CREATE TABLE IF NOT EXISTS employee_salary_details (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
    template_id uuid REFERENCES salary_templates(id),
    ctc numeric NOT NULL DEFAULT 0,
    basic numeric DEFAULT 0,
    hra numeric DEFAULT 0,
    da numeric DEFAULT 0,
    special_allowance numeric DEFAULT 0,
    other_allowance numeric DEFAULT 0,
    per_day_salary numeric DEFAULT 0,
    bank_name varchar(100),
    bank_account_number varchar(50),
    bank_ifsc varchar(20),
    is_current boolean DEFAULT true,
    effective_from date DEFAULT CURRENT_DATE,
    effective_to date,
    created_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 9. Salary Revisions
CREATE TABLE IF NOT EXISTS salary_revisions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id uuid REFERENCES employees(id),
    old_ctc numeric,
    new_ctc numeric NOT NULL,
    increment_amount numeric,
    increment_percentage numeric,
    revision_type varchar(50) DEFAULT 'INCREMENT', -- INCREMENT, CORRECTION, PROMOTION
    effective_from date NOT NULL,
    remarks text,
    status varchar(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    approved_by uuid REFERENCES users(id),
    approved_at timestamptz,
    created_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 10. Employee Loans
CREATE TABLE IF NOT EXISTS employee_loans (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id uuid REFERENCES employees(id),
    loan_type varchar(100),
    amount numeric NOT NULL,
    outstanding_amount numeric NOT NULL,
    monthly_deduction numeric DEFAULT 0,
    status varchar(50) DEFAULT 'ACTIVE', -- ACTIVE, CLOSED, PENDING
    approved_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 11. Employee Loan Installments
CREATE TABLE IF NOT EXISTS employee_loan_installments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    loan_id uuid REFERENCES employee_loans(id) ON DELETE CASCADE,
    employee_id uuid REFERENCES employees(id),
    installment_amount numeric NOT NULL,
    due_month date NOT NULL,
    payment_status varchar(50) DEFAULT 'PENDING', -- PENDING, PAID, SKIPPED
    paid_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 12. Payroll Runs
CREATE TABLE IF NOT EXISTS payroll_runs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    schedule_id uuid REFERENCES pay_schedules(id),
    run_number varchar(50),
    period_month integer NOT NULL,
    period_year integer NOT NULL,
    period_start date,
    period_end date,
    pay_date date,
    status varchar(50) DEFAULT 'DRAFT', -- DRAFT, CALCULATING, PENDING_APPROVAL, APPROVED, REJECTED, PAID, REVOKED, LOCKED
    total_employees integer DEFAULT 0,
    total_gross numeric DEFAULT 0,
    total_deductions numeric DEFAULT 0,
    total_net numeric DEFAULT 0,
    is_locked boolean DEFAULT false,
    locked_by uuid REFERENCES users(id),
    locked_at timestamptz,
    approved_by uuid REFERENCES users(id),
    approved_at timestamptz,
    rejected_by uuid REFERENCES users(id),
    rejected_at timestamptz,
    rejection_reason text,
    created_by uuid REFERENCES users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 13. Payroll Run Items (Payslips)
CREATE TABLE IF NOT EXISTS payroll_run_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payroll_run_id uuid REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id uuid REFERENCES employees(id),
    
    -- Attendance Stats
    total_working_days numeric DEFAULT 0,
    payable_days numeric DEFAULT 0,
    present_days numeric DEFAULT 0,
    absent_days numeric DEFAULT 0,
    leave_days numeric DEFAULT 0,
    lop_days numeric DEFAULT 0,
    holidays numeric DEFAULT 0,
    weekends numeric DEFAULT 0,
    
    -- Earnings
    gross_salary numeric DEFAULT 0,
    basic numeric DEFAULT 0,
    hra numeric DEFAULT 0,
    da numeric DEFAULT 0,
    special_allowance numeric DEFAULT 0,
    other_allowance numeric DEFAULT 0,
    reimbursements numeric DEFAULT 0,
    total_earnings numeric DEFAULT 0,
    
    -- Deductions
    pf_employee numeric DEFAULT 0,
    pf_employer numeric DEFAULT 0,
    esi_employee numeric DEFAULT 0,
    esi_employer numeric DEFAULT 0,
    professional_tax numeric DEFAULT 0,
    tds numeric DEFAULT 0,
    loan_deduction numeric DEFAULT 0,
    lop_deduction numeric DEFAULT 0,
    total_deductions numeric DEFAULT 0,
    
    -- Net
    net_salary numeric DEFAULT 0,
    status varchar(50) DEFAULT 'GENERATED',
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 14. Tax Declarations
CREATE TABLE IF NOT EXISTS employee_tax_declarations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id uuid REFERENCES employees(id),
    financial_year varchar(20) NOT NULL,
    regime varchar(20) DEFAULT 'OLD', -- OLD, NEW
    
    -- Sections
    section_80c numeric DEFAULT 0,
    section_80ccc numeric DEFAULT 0,
    section_80ccd_1 numeric DEFAULT 0,
    section_80ccd_1b numeric DEFAULT 0,
    section_80ccd_2 numeric DEFAULT 0,
    section_80d numeric DEFAULT 0,
    section_80dd numeric DEFAULT 0,
    section_80ddb numeric DEFAULT 0,
    section_80e numeric DEFAULT 0,
    section_80g numeric DEFAULT 0,
    section_80gg numeric DEFAULT 0,
    section_80tta numeric DEFAULT 0,
    section_80u numeric DEFAULT 0,
    hra_exemption numeric DEFAULT 0,
    rent_paid_annually numeric DEFAULT 0,
    metro_city boolean DEFAULT false,
    section_24 numeric DEFAULT 0,
    section_80ee numeric DEFAULT 0,
    lta_claimed numeric DEFAULT 0,
    other_exemptions numeric DEFAULT 0,
    
    total_declared numeric DEFAULT 0,
    status varchar(50) DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, VERIFIED, REJECTED
    
    verified_by uuid REFERENCES users(id),
    verified_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 15. Holidays
CREATE TABLE IF NOT EXISTS holidays (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name varchar(100) NOT NULL,
    date date NOT NULL,
    type varchar(50) DEFAULT 'PUBLIC', -- PUBLIC, RESTRICTED, COMPANY
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
