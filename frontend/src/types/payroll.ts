
// Salary Types
export interface SalaryTemplate {
    id: string;
    name: string;
    code?: string;
    description?: string;
    basic_percentage: number;
    hra_percentage: number;
    da_percentage: number;
    special_allowance_percentage: number;
    other_allowance_percentage: number;
    is_default: boolean;
    is_active: boolean;
    created_at: string;
}

export interface EmployeeSalary {
    id: string;
    employee_id: string;
    template_id?: string;
    template_name?: string;
    ctc: number;
    basic: number;
    hra: number;
    da: number;
    special_allowance: number;
    other_allowance: number;
    per_day_salary: number;
    bank_name?: string;
    bank_account_number?: string;
    bank_ifsc?: string;
    effective_from: string;
    effective_to?: string;
    is_current: boolean;
}

export interface SalaryRevision {
    id: string;
    tenant_id: string;
    employee_id: string;
    old_ctc: number;
    new_ctc: number;
    increment_amount: number;
    increment_percentage: number;
    revision_type: 'APPRAISAL' | 'PROMOTION' | 'CORRECTION' | 'INITIAL';
    effective_from: string;
    remarks?: string;
    status: 'PENDING' | 'PAID' | 'REJECTED';
    created_by: string;
    approved_by?: string;
    approved_at?: string;
    payment_reference?: string;
    paid_at?: string;
    // joined fields
    first_name?: string;
    last_name?: string;
    emp_code?: string;
}

// Payrun Types
export interface PaySchedule {
    id: string;
    name: string;
    cycle: 'MONTHLY' | 'BI_WEEKLY' | 'WEEKLY';
    pay_day: number;
    cut_off_day: number;
    is_default: boolean;
    is_active: boolean;
}

export interface PayRun {
    id: string;
    run_number: string;
    schedule_id?: string;
    period_month: number;
    period_year: number;
    period_start: string;
    period_end: string;
    pay_date: string;
    status: 'DRAFT' | 'CALCULATING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PAID' | 'REVOKED';
    total_employees: number;
    total_gross: number;
    total_deductions: number;
    total_net: number;
    is_locked: boolean;
    created_at: string;
}

export interface PayRunItem {
    id: string;
    payroll_run_id: string;
    employee_id: string;
    total_working_days: number;
    payable_days: number;
    present_days: number;
    absent_days: number;
    leave_days: number;
    lop_days: number;
    gross_salary: number;
    net_salary: number;
    total_earnings: number;
    total_deductions: number;
    status: string;
    // joined
    first_name?: string;
    last_name?: string;
    emp_code?: string;
}

// Statutory Types
export interface StatutoryConfig {
    pf_enabled: boolean;
    pf_employer_rate: number;
    pf_employee_rate: number;
    pf_wage_ceiling: number;
    esi_enabled: boolean;
    esi_employer_rate: number;
    esi_employee_rate: number;
    esi_wage_ceiling: number;
    pt_enabled: boolean;
    pt_state?: string;
    lwf_enabled: boolean;
    tds_enabled: boolean;
}

export interface PTSlab {
    id: string;
    state: string;
    min_salary: number;
    max_salary?: number;
    monthly_tax: number;
    gender?: 'MALE' | 'FEMALE' | 'ALL';
}

export interface DeductionType {
    id: string;
    name: string;
    code: string;
    category: 'STATUTORY' | 'LOAN' | 'PENALTY' | 'ADVANCE' | 'OTHER';
    is_statutory: boolean;
    is_taxable: boolean;
    is_recurring: boolean;
    calculation_type: 'FIXED' | 'PERCENTAGE' | 'SLAB';
    default_value?: number;
    percentage_of?: string;
}

export interface EmployeeDeduction {
    id: string;
    employee_id: string;
    deduction_type_id: string;
    amount: number;
    effective_from: string;
    effective_to?: string;
    is_active: boolean;
    // joined
    deduction_name?: string;
    deduction_code?: string;
}

// Expenses & Reimbursements
export interface ExpenseCategory {
    id: string;
    name: string;
    description?: string;
    is_active: boolean;
}

export interface Expense {
    id: string;
    category: string;
    amount: number;
    expense_date: string;
    description?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
}

export interface Reimbursement {
    id: string;
    employee_id: string;
    category: string;
    amount: number;
    claim_date: string;
    description?: string;
    receipt_url?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
    include_in_payroll: boolean;
    payroll_run_id?: string;
    approved_by?: string;
    // joined
    first_name?: string;
    last_name?: string;
    emp_code?: string;
}

// Loans
export interface LoanType {
    id: string;
    name: string;
    interest_rate: number;
    interest_type: 'FLAT' | 'REDUCING';
    max_amount?: number;
    max_tenure_months?: number;
    is_taxable: boolean;
    is_active: boolean;
}

export interface Loan {
    id: string;
    employee_id: string;
    loan_type_id?: string;
    amount: number;
    principal_amount: number;
    outstanding: number; // legacy alias
    outstanding_amount: number;
    tenure_months: number;
    emi_amount: number;
    status: 'PENDING' | 'ACTIVE' | 'CLOSED' | 'REJECTED';
    start_date?: string;
    end_date?: string;
    // joined
    employee_name?: string;
    loan_type_name?: string;
}

// F&F
export interface FnFSettlement {
    id: string;
    employee_id: string;
    last_working_day: string;
    resignation_date?: string;
    gross_payable: number;
    total_deductions: number;
    net_payable: number;
    status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';
    // joined
    first_name?: string;
    last_name?: string;
    emp_code?: string;
}

// Consultants & Merchants
export interface Consultant {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    monthly_rate?: number;
    hourly_rate?: number;
    contract_start?: string;
    contract_end?: string;
    is_active: boolean;
}

export interface Invoice {
    id: string;
    consultant_id: string;
    invoice_number: string;
    invoice_date: string;
    amount: number;
    status: 'PENDING' | 'APPROVED' | 'PAID';
}

export interface PayrollSummary {
    total_employees: number;
    monthly_payroll: number;
    pending_payslips: number;
    reimbursements: number;
    active_loans: number;
    // Personal fields
    my_net_pay?: number;
    my_ytd_earnings?: number;
    my_pending_claims?: number;
    my_active_loan_balance?: number;
}

export interface TaxDeclaration {
    id: string;
    employee_id: string;
    financial_year: string;
    regime: 'OLD' | 'NEW';
    section_80c_amount: number;
    section_80d_amount: number;
    hra_rent_paid: number;
    other_deductions_amount: number;
    status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
    created_at: string;
    updated_at: string;
}
