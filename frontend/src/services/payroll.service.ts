import api from './api';
import type { ApiResponse } from '@/types';

export interface MerchantTransaction {
    id: string;
    merchant_id?: string;
    merchant_name?: string;
    type?: string;
    amount?: number;
    date?: string;
    status?: string;
}

export interface VendorPayment {
    id: string;
    vendor_name?: string;
    vendor?: string;
    amount?: number;
    payout_date?: string;
    date?: string;
    status?: string;
    paid?: boolean;
}

export interface ThirdPartyPayout {
    id: string;
    provider_name?: string;
    provider?: string;
    amount?: number;
    payout_date?: string;
    date?: string;
    status?: string;
    paid?: boolean;
}

export interface Merchant {
    id: string;
    name: string;
    code?: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
    is_active?: boolean;
}

export interface PayrollSummary {
  total_employees: number;
  monthly_payroll: number; // assume rupees
  pending_payslips: number;
  reimbursements: number;
  // optional fields used by UI placeholders
  average_salary?: number | null;
  pending_bills?: number | null;
  loans?: number | null;
  active_loans?: number | null;
}

export interface DeductionType {
  id: string;
  name: string;
  code?: string;
  description?: string;
  category?: string;
  is_statutory?: boolean;
  type?: string;
  is_pre_tax: boolean;
  is_active: boolean;
  calculation_type?: string;
  is_taxable?: boolean;
  is_recurring?: boolean;
}

export interface LoanType {
  id: string;
  name: string;
  interest_rate?: number;
  interestRate?: number;
  interest_type?: 'FLAT' | 'REDUCING';
  interestType?: 'FLAT' | 'REDUCING';
  max_amount?: number;
  maxAmount?: number;
  max_tenure_months?: number;
  maxTenureMonths?: number;
  is_taxable?: boolean;
  isTaxable?: boolean;
  description?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  expense_date: string;
  status?: string;
  payroll_included?: boolean;
  category_id?: string;
  categoryId?: string;
  expenseDate?: string;
  payrollIncluded?: boolean;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export interface PTSlab {
  id: string;
  state: string;
  gender: 'MALE' | 'FEMALE' | 'ANY';
  min_salary: number;
  max_salary: number | null;
  monthly_tax: number;
}

export interface StatutoryConfig {
  pf_enabled: boolean;
  pf_employer_rate: number; // percentage
  pf_employee_rate: number; // percentage
  pf_wage_limit: number | null;
  esi_enabled: boolean;
  esi_employer_rate: number; // percentage
  esi_employee_rate: number; // percentage
  esi_wage_limit: number | null;
  pt_enabled: boolean;
  tds_enabled: boolean;
}

export const payrollService = {
  getSummary: async (): Promise<PayrollSummary> => {
    try {
      const response = await api.get<ApiResponse<PayrollSummary>>('/payroll/summary');
      return response.data.data!;
    } catch (err) {
      // fallback so UI doesn't break until backend endpoint exists
      return {
        total_employees: 0,
        monthly_payroll: 0,
        pending_payslips: 0,
        reimbursements: 0,
      };
    }
  },

  listSalaryComponents: async () => {
    const response = await api.get<ApiResponse<Array<{ id: string; name: string; amount: number }>>>('/payroll/salary-components');
    return response.data.data || [];
  },

  createSalaryComponent: async (payload: { name: string; amount: number }) => {
    const response = await api.post<ApiResponse<{ id: string; name: string; amount: number }>>('/payroll/salary-components', payload);
    return response.data.data!;
  },

  listExpenses: async () => {
    const response = await api.get<ApiResponse<Array<{ id: string; category: string; amount: number; expense_date: string; status?: string; payroll_included?: boolean }>>>('/payroll/expenses/getexpenses');
    return response.data.data || [];
  },

  createExpense: async (payload: { categoryId: string; amount: number; expenseDate?: string; payrollIncluded?: boolean }) => {
    // backend validator expects camelCase: categoryId, amount, expenseDate, payrollIncluded
    const body = {
      categoryId: payload.categoryId,
      amount: payload.amount,
      expenseDate: payload.expenseDate || new Date().toISOString().slice(0, 10),
      payrollIncluded: !!payload.payrollIncluded,
    };
    const response = await api.post<ApiResponse<{ id: string; category: string; amount: number; expense_date: string }>>('/payroll/expenses/createexpense', body);
    return response.data.data!;
  },

  listExpenseCategories: async () => {
    try {
      const response = await api.get<ApiResponse<Array<ExpenseCategory>>>('/payroll/expenses/getcategories');
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  createExpenseCategory: async (payload: { name: string; code: string; description?: string }) => {
    const response = await api.post<ApiResponse<{ id: string; name: string }>>('/payroll/expenses/createcategories', payload);
    return response.data.data!;
  },

  approveExpense: async (expenseId: string, payload: { status: 'APPROVED' | 'REJECTED' }) => {
    const response = await api.patch<ApiResponse<unknown>>(`/payroll/expenses/${expenseId}/approve`, payload);
    return response.data.data!;
  },

  rejectExpense: async (expenseId: string) => {
    // convenience wrapper
    const response = await api.patch<ApiResponse<unknown>>(`/payroll/expenses/${expenseId}/approve`, { status: 'REJECTED' });
    return response.data.data!;
  },

  setExpensePayrollInclusion: async (expenseId: string, payrollIncluded: boolean) => {
    const response = await api.patch<ApiResponse<unknown>>(`/payroll/expenses/${expenseId}/payroll`, { payrollIncluded });
    return response.data.data!;
  },

  updateExpense: async (expenseId: string, payload: { categoryId?: string; amount?: number; expenseDate?: string; description?: string; payrollIncluded?: boolean }) => {
    const response = await api.put<ApiResponse<unknown>>(`/payroll/expenses/${expenseId}`, payload);
    return response.data.data!;
  },

  deleteExpense: async (expenseId: string) => {
    const response = await api.delete<ApiResponse<unknown>>(`/payroll/expenses/${expenseId}`);
    return response.data.data!;
  },

  listLoans: async (scope?: 'employee' | 'team' | 'all') => {
    // determine backend endpoint based on role/scope
    let path = '/payroll/loans/getloans'; // default to employee
    if (scope === 'team') path = '/payroll/loans/team';
    else if (scope === 'all') path = '/payroll/loans/all';

    try {
      // log path for debugging
      console.debug('[payrollService] listLoans request to', path);

      // Inspect access token payload in dev mode to ensure the frontend sends the right identity/role
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.warn('[payrollService] No accessToken found in localStorage - request will be unauthenticated');
        } else {
          // decode base64 payload
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = JSON.parse(decodeURIComponent(atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
          console.debug('[payrollService] token-payload', { id: jsonPayload.id || jsonPayload.sub || null, role: jsonPayload.role || jsonPayload.roles || null, employeeId: jsonPayload.employeeId || jsonPayload.employee_id || null, exp: jsonPayload.exp });
        }
      } catch (tErr) {
        console.warn('[payrollService] Failed to decode accessToken', tErr);
      }

      const response = await api.get<ApiResponse<Array<{
        id: string;
        employee_id?: string;
        employee_name?: string;
        loan_type_id?: string;
        principal_amount?: number;
        amount?: number;
        interest_rate?: number;
        interest_type?: string;
        tenure_months?: number;
        emi_amount?: number;
        total_payable_amount?: number;
        outstanding_amount?: number;
        outstanding?: number;
        start_date?: string;
        end_date?: string;
        status?: string;
        remarks?: string;
        created_at?: string;
      }>>>(path);

      console.debug('[payrollService] listLoans response', response?.data);

      return response.data.data || [];
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: unknown }; message?: string };
      console.error('[payrollService] listLoans failed', axiosErr?.response?.status, axiosErr?.response?.data || axiosErr.message || err);
      // rethrow so callers (useQuery) can catch and show UI feedback
      throw err;
    }
  },

  createLoan: async (payload: Record<string, unknown>) => {
    // Accept either admin (snake_case) payloads or employee (camelCase) payloads and forward to backend
    const response = await api.post<ApiResponse<unknown>>('/payroll/loans/', payload);
    return response.data.data!;
  },

  listTransactions: async () => {
    const response = await api.get<ApiResponse<Array<{ id: string; employee_id?: string; type: string; amount: number; tx_date: string }>>>('/payroll/transactions');
    return response.data.data || [];
  },

  createTransaction: async (payload: { employee_id?: string; type: string; amount: number; tx_date?: string }) => {
    const response = await api.post<ApiResponse<{ id: string; employee_id?: string; type: string; amount: number; tx_date: string }>>('/payroll/transactions', payload);
    return response.data.data!;
  },

  // Payslips related placeholders
  listPayslips: async (params?: { from_date?: string; to_date?: string }) => {
    try {
      const response = await api.get<ApiResponse<unknown[]>>('/payroll/payslips', { params });
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  getMyPayslips: async () => {
    try {
      const response = await api.get<ApiResponse<unknown[]>>('/payroll/payslips/my');
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  listPaySchedules: async () => {
    try {
      const response = await api.get<ApiResponse<unknown[]>>('/payroll/schedules');
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  updatePaySchedule: async (scheduleId: string, payload: { cycle?: string; credit_day?: number; cutoff_day?: number }) => {
    const response = await api.post<ApiResponse<unknown>>(`/payroll/schedules/${scheduleId}`, payload);
    return response.data.data!;
  },

  listDeductions: async (params?: { from_date?: string; to_date?: string }) => {
    try {
      const response = await api.get<ApiResponse<unknown[]>>('/payroll/deductions', { params });
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  listDeductionTypes: async () => {
    try {
      const response = await api.get<ApiResponse<Array<DeductionType>>>('/payroll/deduction-types');
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  getDeductionTypes: async () => {
    // Alias for listDeductionTypes as used in StatutoryPage
    return payrollService.listDeductionTypes();
  },

  createDeductionType: async (payload: Partial<DeductionType>) => {
    const response = await api.post<ApiResponse<DeductionType>>('/payroll/deduction-types', payload);
    return response.data.data!;
  },

  createDeduction: async (payload: { employee_name?: string; employee_id?: string; type: string; amount: number; effective_date?: string; note?: string }) => {
    const response = await api.post<ApiResponse<unknown>>('/payroll/deductions', payload);
    return response.data.data!;
  },

  listIncomeTax: async (params?: { from_date?: string; to_date?: string }) => {
    try {
      const response = await api.get<ApiResponse<unknown[]>>('/payroll/income-tax', { params });
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  listSalaryRevisions: async (params?: { from_date?: string; to_date?: string }) => {
    try {
      const response = await api.get<ApiResponse<unknown[]>>('/payroll/salary-revisions', { params });
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  // Payslip generation, download, email and history
  generateMonthlyPayslips: async (payload: { month: number; year: number }) => {
    const response = await api.post<ApiResponse<unknown>>('/payroll/payslips/generate', payload);
    return response.data.data!;
  },

  downloadPayslip: async (payslipId: string) => {
    // returns binary PDF
    const response = await api.get(`/payroll/payslips/${payslipId}/download`, { responseType: 'blob' });
    return response.data;
  },

  emailPayslip: async (payslipId: string, payload?: { to?: string }) => {
    const response = await api.post<ApiResponse<unknown>>(`/payroll/payslips/${payslipId}/email`, payload);
    return response.data.data!;
  },

  listPayslipHistory: async (params?: { employee_id?: string; from_date?: string; to_date?: string }) => {
    try {
      const response = await api.get<ApiResponse<unknown[]>>('/payroll/payslips/history', { params });
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  // Void a payrun (keeps data for audit trail)
  voidPayRun: async (payrunId: string) => {
    const response = await api.patch<ApiResponse<unknown>>(`/payroll/payrun/${payrunId}/void`);
    return response.data.data!;
  },

  // Delete a single payslip item from a payrun
  deletePayslipItem: async (payrunId: string, itemId: string) => {
    const response = await api.delete<ApiResponse<unknown>>(`/payroll/payrun/${payrunId}/items/${itemId}`);
    return response.data.data!;
  },

  // Delete an entire payrun (DRAFT/CALCULATED/PENDING_APPROVAL only)
  deletePayRun: async (payrunId: string) => {
    const response = await api.delete<ApiResponse<unknown>>(`/payroll/payrun/${payrunId}`);
    return response.data.data!;
  },

  // Loan payments and closure
  createLoanPayment: async (loanId: string, payload: { amount: number; tx_date?: string; note?: string }) => {
    const response = await api.post<ApiResponse<unknown>>(`/payroll/loans/${loanId}/payments`, payload);
    return response.data.data!;
  },

  approveLoan: async (loanId: string, payload: { status: 'APPROVED' | 'REJECTED'; remarks?: string }) => {
    const response = await api.patch<ApiResponse<unknown>>(`/payroll/loans/${loanId}/approve`, payload);
    return response.data.data!;
  },

  closeLoan: async (loanId: string) => {
    // backend expects a PATCH for close
    const response = await api.patch<ApiResponse<unknown>>(`/payroll/loans/${loanId}/close`);
    return response.data.data!;
  },

  // Loan Types (HR / ADMIN)
  listLoanTypes: async (): Promise<LoanType[]> => {
    try {
      // Debug: inspect token payload to help verify the role sent with the request
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.debug('[payrollService] listLoanTypes - no accessToken found');
        } else {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = JSON.parse(decodeURIComponent(atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
          console.debug('[payrollService] listLoanTypes token-payload', { id: jsonPayload.id || jsonPayload.sub || null, role: jsonPayload.role || jsonPayload.roles || null, employeeId: jsonPayload.employeeId || jsonPayload.employee_id || null, exp: jsonPayload.exp });
        }
      } catch (tErr) {
        console.warn('[payrollService] Failed to decode accessToken for listLoanTypes', tErr);
      }

      const response = await api.get<ApiResponse<LoanType[]>>('/payroll/loan-types');
      return response.data.data || [];
    } catch (err: unknown) {
      console.error('[payrollService] listLoanTypes failed', err);
      throw err;
    }
  },

  listMerchants: async (): Promise<Merchant[]> => {
    const response = await api.get<ApiResponse<Merchant[]>>('/payroll/merchants');
    return response.data.data || [];
  },

  createMerchant: async (payload: { name: string; code: string; contact_email?: string; contact_phone?: string; address?: string; is_active?: boolean }) => {
    const response = await api.post<ApiResponse<unknown>>('/payroll/merchants', payload);
    return response.data.data!;
  },

  updateMerchant: async (id: string, payload: Partial<{ name: string; code: string; contact_email: string; contact_phone: string; address: string; is_active: boolean }>) => {
    const response = await api.put<ApiResponse<unknown>>(`/payroll/merchants/${id}`, payload);
    return response.data.data!;
  },

  deleteMerchant: async (id: string) => {
    const response = await api.delete<ApiResponse<unknown>>(`/payroll/merchants/${id}`);
    return response.data.data!;
  },

  listReimbursements: async (params?: { from_date?: string; to_date?: string; status?: string }) => {
    try {
      const response = await api.get<ApiResponse<unknown[]>>('/payroll/reimbursements', { params });
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  createReimbursement: async (payload: { employee_id?: string; category: string; amount: number; date?: string; description?: string }) => {
    const response = await api.post<ApiResponse<unknown>>('/payroll/reimbursements', payload);
    return response.data.data!;
  },

  approveReimbursement: async (id: string, payload: { status: 'APPROVED' | 'REJECTED'; remarks?: string }) => {
    const response = await api.patch<ApiResponse<unknown>>(`/payroll/reimbursements/${id}/approve`, payload);
    return response.data.data!;
  },

  // Salary structure management (Keka-style)
  listSalaryComponentsV2: async (filters?: { component_type?: string; is_active?: boolean }) => {
    const response = await api.get<ApiResponse<SalaryComponent[]>>('/payroll/salary-structures/components', { params: filters });
    return response.data.data || [];
  },

  createSalaryComponentV2: async (payload: Partial<SalaryComponent>) => {
    const response = await api.post<ApiResponse<SalaryComponent>>('/payroll/salary-structures/components', payload);
    return response.data.data!;
  },

  updateSalaryComponentV2: async (id: string, payload: Partial<SalaryComponent>) => {
    const response = await api.put<ApiResponse<SalaryComponent>>(`/payroll/salary-structures/components/${id}`, payload);
    return response.data.data!;
  },

  deleteSalaryComponentV2: async (id: string) => {
    await api.delete(`/payroll/salary-structures/components/${id}`);
  },

  // Salary Structures
  listSalaryStructures: async () => {
    const response = await api.get<ApiResponse<SalaryStructure[]>>('/payroll/salary-structures/structures');
    return response.data.data || [];
  },

  getSalaryStructureById: async (id: string) => {
    const response = await api.get<ApiResponse<SalaryStructureDetail>>(`/payroll/salary-structures/structures/${id}`);
    return response.data.data!;
  },

  createSalaryStructure: async (payload: CreateSalaryStructurePayload) => {
    const response = await api.post<ApiResponse<SalaryStructure>>('/payroll/salary-structures/structures', payload);
    return response.data.data!;
  },

  updateSalaryStructureV2: async (id: string, payload: Partial<CreateSalaryStructurePayload>) => {
    const response = await api.put<ApiResponse<SalaryStructure>>(`/payroll/salary-structures/structures/${id}`, payload);
    return response.data.data!;
  },

  deleteSalaryStructure: async (id: string) => {
    await api.delete(`/payroll/salary-structures/structures/${id}`);
  },

  migrateEmployeesToStructure: async (id: string) => {
    const response = await api.post<ApiResponse<unknown>>(`/payroll/salary-structures/structures/${id}/migrate`);
    return response.data; // Return the whole report object
  },

  // CTC Calculator
  calculateCTC: async (structureId: string, annualCTC: number) => {
    const response = await api.post<ApiResponse<CTCBreakdown>>('/payroll/salary-structures/calculate-ctc', {
      structure_id: structureId,
      annual_ctc: annualCTC
    });
    return response.data.data!;
  },

  // Employee Salary
  getEmployeeSalary: async (employeeId: string) => {
    const response = await api.get<ApiResponse<EmployeeSalary>>(`/payroll/salary-structures/employees/${employeeId}/salary`);
    return response.data.data;
  },

  assignEmployeeSalary: async (employeeId: string, payload: AssignSalaryPayload) => {
    const response = await api.post<ApiResponse<EmployeeSalary>>(`/payroll/salary-structures/employees/${employeeId}/salary`, payload);
    return response.data.data!;
  },

  getEmployeeSalaryHistory: async (employeeId: string) => {
    const response = await api.get<ApiResponse<SalaryRevision[]>>(`/payroll/salary-structures/employees/${employeeId}/salary/history`);
    return response.data.data || [];
  },

  // Seed defaults
  seedSalaryDefaults: async () => {
    const response = await api.post<ApiResponse<{ structure_id: string }>>('/payroll/salary-structures/seed-defaults');
    return response.data.data!;
  },

  // Structure Templates
  listStructureTemplates: async () => {
    const response = await api.get<ApiResponse<SalaryStructureTemplate[]>>('/payroll/salary-structures/templates');
    return response.data.data || [];
  },

  createStructureFromTemplate: async (templateId: string) => {
    const response = await api.post<ApiResponse<SalaryStructure>>('/payroll/salary-structures/structures/from-template', {
      template_id: templateId
    });
    return response.data.data!;
  },

  // Cost Centers
  listCostCenters: async () => {
    try {
      const response = await api.get<ApiResponse<Array<{ id: string; name: string; allocated: number; spent: number }>>>('/payroll/cost-centers');
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  // Merchant / Vendor / Third-party
  listMerchantTransactions: async (): Promise<MerchantTransaction[]> => {
    try {
      const primary = await api.get<ApiResponse<MerchantTransaction[]>>('/payroll/merchants/transactions');
      return primary.data.data || [];
    } catch (err) {
      try {
        const fallback = await api.get<ApiResponse<MerchantTransaction[]>>('/payroll/merchant-transactions');
        return fallback.data.data || [];
      } catch (err2) {
        return [];
      }
    }
  },

  listVendorPayments: async (): Promise<VendorPayment[]> => {
    try {
      const response = await api.get<ApiResponse<VendorPayment[]>>('/payroll/merchants/getvendors');
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  listThirdPartyPayouts: async (): Promise<ThirdPartyPayout[]> => {
    try {
      const response = await api.get<ApiResponse<ThirdPartyPayout[]>>('/payroll/merchants/getthird-party');
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  createVendorPayout: async (payload: { vendorName: string; amount: number; paymentDate?: string; notes?: string }) => {
    const body = { vendorName: payload.vendorName, amount: payload.amount, paymentDate: payload.paymentDate || new Date().toISOString().slice(0, 10), notes: payload.notes };
    const response = await api.post<ApiResponse<unknown>>('/payroll/merchants/createvendors', body);
    return response.data.data!;
  },

  createThirdPartyPayout: async (payload: { providerName: string; amount: number; payoutDate?: string; notes?: string }) => {
    const body = { providerName: payload.providerName, amount: payload.amount, payoutDate: payload.payoutDate || new Date().toISOString().slice(0, 10), notes: payload.notes };
    const response = await api.post<ApiResponse<unknown>>('/payroll/merchants/createthird-party', body);
    return response.data.data!;
  },

  markVendorPaymentPaid: async (paymentId: string) => {
    const response = await api.post<ApiResponse<unknown>>(`/payroll/vendor-payments/${paymentId}/paid`);
    return response.data.data!;
  },

  markThirdPartyPayoutPaid: async (payoutId: string) => {
    const response = await api.post<ApiResponse<unknown>>(`/payroll/third-party-payouts/${payoutId}/paid`);
    return response.data.data!;
  },

  // Loan Types (HR/Admin)
  createLoanType: async (payload: Record<string, unknown>) => {
    const body = {
      name: payload.name,
      interestRate: payload.interestRate ?? payload.interest_rate ?? 0,
      interestType: payload.interestType ?? payload.interest_type ?? 'FLAT',
      maxAmount: payload.maxAmount ?? payload.max_amount ?? undefined,
      maxTenureMonths: payload.maxTenureMonths ?? payload.max_tenure_months ?? undefined,
      isTaxable: payload.isTaxable ?? payload.is_taxable ?? false,
      isActive: payload.isActive ?? payload.is_active ?? true,
    };
    const response = await api.post<ApiResponse<unknown>>('/payroll/loans/loantype', body);
    return response.data.data!;
  },

  updateLoanType: async (loanTypeId: string, payload: Record<string, unknown>) => {
    const body = {
      name: payload.name,
      interestRate: payload.interestRate ?? payload.interest_rate,
      interestType: payload.interestType ?? payload.interest_type,
      maxAmount: payload.maxAmount ?? payload.max_amount,
      maxTenureMonths: payload.maxTenureMonths ?? payload.max_tenure_months,
      isTaxable: payload.isTaxable ?? payload.is_taxable,
      isActive: payload.isActive ?? payload.is_active,
    };
    const response = await api.put<ApiResponse<unknown>>(`/payroll/loans/loantype/${loanTypeId}`, body);
    return response.data.data!;
  },

  deleteLoanType: async (loanTypeId: string) => {
    const response = await api.delete<ApiResponse<unknown>>(`/payroll/loans/loantype/${loanTypeId}`);
    return response.data.data!;
  },

// Salary structure aliases for backward compatibility
  getSalaryStructure: async () => {
    const response = await api.get<ApiResponse<unknown>>('/payroll/salary-structure');
    return response.data.data || null;
  },

  updateSalaryStructure: async (payload: { basic: number; hra_percent: number; other_allowances: number; monthly_deductions: number; employer_contrib?: number }) => {
    const response = await api.post<ApiResponse<unknown>>('/payroll/salary-structure', payload);
    return response.data.data!;
  },

  // FnF Settlements
  getFnFSettlements: async () => {
    try {
      const response = await api.get<ApiResponse<FnFSettlement[]>>('/payroll/settlement/fnf');
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  getFnFSettlementById: async (id: string) => {
    const response = await api.get<ApiResponse<FnFSettlement>>(`/payroll/settlement/fnf/${id}`);
    return response.data.data!;
  },

  createFnFSettlement: async (payload: { employeeId: string; lastWorkingDay: string; resignationDate?: string }) => {
    const response = await api.post<ApiResponse<FnFSettlement>>('/payroll/settlement/fnf', payload);
    return response.data.data!;
  },

  submitFnF: async (id: string) => {
    const response = await api.patch<ApiResponse<FnFSettlement>>(`/payroll/settlement/fnf/${id}/submit`);
    return response.data.data!;
  },

  approveFnF: async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const response = await api.patch<ApiResponse<FnFSettlement>>(`/payroll/settlement/fnf/${id}/approve`, { status });
    return response.data.data!;
  },

  payFnF: async (id: string) => {
    const response = await api.patch<ApiResponse<FnFSettlement>>(`/payroll/settlement/fnf/${id}/pay`);
    return response.data.data!;
  },

  // Pay Runs
  getPayRuns: async () => {
    try {
      const response = await api.get<ApiResponse<unknown[]>>('/payroll/runs');
      return response.data.data || [];
    } catch {
      return [];
    }
  },

  createPayRun: async (payload: { periodMonth: number; periodYear: number }) => {
    const response = await api.post<ApiResponse<unknown>>('/payroll/runs', payload);
    return response.data.data!;
  },

  calculatePayRun: async (id: string) => {
    const response = await api.post<ApiResponse<unknown>>(`/payroll/runs/${id}/calculate`);
    return response.data.data!;
  },

  approvePayRun: async (id: string) => {
    const response = await api.put<ApiResponse<unknown>>(`/payroll/runs/${id}/approve`);
    return response.data.data!;
  },

  lockPayRun: async (id: string) => {
    const response = await api.put<ApiResponse<unknown>>(`/payroll/runs/${id}/lock`);
    return response.data.data!;
  },

  // Salary Templates (legacy)
  getSalaryTemplates: async () => {
    return payrollService.listStructureTemplates();
  },

  createSalaryTemplate: async (payload: Record<string, unknown>) => {
    return payrollService.createSalaryComponentV2(payload as Partial<SalaryComponent>);
  },

  updateSalaryTemplate: async (id: string, payload: Record<string, unknown>) => {
    return payrollService.updateSalaryComponentV2(id, payload as Partial<SalaryComponent>);
  },

  deleteSalaryTemplate: async (id: string) => {
    return payrollService.deleteSalaryComponentV2(id);
  },

  // Statutory
  getStatutoryConfig: async () => {
    const response = await api.get<ApiResponse<StatutoryConfig>>('/payroll/statutory/config');
    return response.data.data!;
  },

  updateStatutoryConfig: async (payload: Partial<StatutoryConfig>) => {
    const response = await api.put<ApiResponse<StatutoryConfig>>('/payroll/statutory/config', payload);
    return response.data.data!;
  },

  getPTSlabs: async () => {
    const response = await api.get<ApiResponse<PTSlab[]>>('/payroll/statutory/pt-slabs');
    return response.data.data || [];
  },

  createPTSlab: async (payload: Partial<PTSlab>) => {
    const response = await api.post<ApiResponse<PTSlab>>('/payroll/statutory/pt-slabs', payload);
    return response.data.data!;
  },

  deletePTSlab: async (id: string) => {
    const response = await api.delete<ApiResponse<unknown>>(`/payroll/statutory/pt-slabs/${id}`);
    return response.data.data!;
  },

  // Cost Centers
  getCostCenters: async () => {
    return payrollService.listCostCenters();
  },

  createCostCenter: async (payload: { name: string; allocated?: number }) => {
    const response = await api.post<ApiResponse<unknown>>('/payroll/cost-centers', payload);
    return response.data.data!;
  },

  getCostCentreAllocations: async (params?: { costCentreId?: string; employeeId?: string }) => {
    try {
      const response = await api.get<ApiResponse<unknown[]>>('/payroll/statutory/cost-centre-allocations', { params });
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  upsertCostCentreAllocation: async (payload: { costCentreId: string; employeeId: string; allocationPercentage: number }) => {
    const response = await api.post<ApiResponse<unknown>>('/payroll/statutory/cost-centre-allocations', payload);
    return response.data.data!;
  },

  deleteCostCentreAllocation: async (id: string) => {
    const response = await api.delete<ApiResponse<unknown>>(`/payroll/statutory/cost-centre-allocations/${id}`);
    return response.data.data!;
  },

  // Tax Declarations
  getTaxDeclaration: async (fy: string) => {
    try {
      const response = await api.get<ApiResponse<unknown>>(`/payroll/tax-declarations/${fy}`);
      return response.data.data;
    } catch (err) {
      return null;
    }
  },

  submitTaxDeclaration: async (payload: Record<string, unknown>) => {
    const response = await api.post<ApiResponse<unknown>>('/payroll/tax-declarations', payload);
    return response.data.data!;
  },
};

// =====================================================
// SALARY STRUCTURE INTERFACES
// =====================================================

export interface SalaryComponent {
  id: string;
  name: string;
  code: string;
  component_type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION' | 'REIMBURSEMENT';
  category?: string;
  is_taxable: boolean;
  is_pro_rata: boolean;
  is_statutory: boolean;
  statutory_code?: string;
  is_active: boolean;
  display_order: number;
  description?: string;
}

export interface SalaryStructure {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  component_count?: number;
  created_at: string;
}

export interface StructureComponent {
  id: string;
  component_id: string;
  component_name: string;
  component_code: string;
  component_type: string;
  category?: string;
  is_taxable: boolean;
  calculation_type: 'FIXED' | 'PERCENTAGE_OF_CTC' | 'PERCENTAGE_OF_BASIC' | 'FORMULA' | 'REMAINING';
  percentage?: number;
  fixed_amount?: number;
  formula?: string;
  min_value?: number;
  max_value?: number;
  display_order: number;
}

export interface SalaryStructureDetail extends SalaryStructure {
  components: StructureComponent[];
}

export interface CreateSalaryStructurePayload {
  name: string;
  description?: string;
  is_default?: boolean;
  is_active?: boolean;
  components?: {
    component_id: string;
    calculation_type: string;
    percentage?: number;
    fixed_amount?: number;
    formula?: string;
    min_value?: number;
    max_value?: number;
    display_order?: number;
  }[];
}

export interface SalaryStructureTemplate {
  id: string;
  name: string;
  description: string;
  country: string;
  tags: string[];
  components: {
    code: string;
    name: string;
    calculation_type: string;
    percentage?: number;
    fixed_amount?: number;
    max_value?: number;
    description: string;
  }[];
}

export interface CTCBreakdown {
  annual_ctc: number;
  monthly_ctc: number;
  gross_earnings: number;
  total_deductions: number;
  employer_contributions: number;
  net_salary: number;
  monthly_net: number;
  breakdown: {
    component_id: string;
    component_name: string;
    component_code: string;
    component_type: string;
    annual_amount: number;
    monthly_amount: number;
  }[];
}

export interface EmployeeSalary {
  id: string;
  employee_id: string;
  structure_id: string;
  structure_name?: string;
  annual_ctc: number;
  monthly_ctc: number;
  effective_from: string;
  is_current: boolean;
  components: {
    component_id: string;
    component_name: string;
    component_code: string;
    component_type: string;
    monthly_amount: number;
    annual_amount: number;
  }[];
  summary: {
    monthly_gross: number;
    monthly_deductions: number;
    monthly_net: number;
  };
}

export interface AssignSalaryPayload {
  structure_id: string;
  annual_ctc: number;
  effective_from: string;
  revision_reason?: string;
}

export interface SalaryRevision {
  id: string;
  annual_ctc: number;
  monthly_ctc: number;
  effective_from: string;
  effective_to?: string;
  structure_name?: string;
  revision_reason?: string;
  created_by_email?: string;
  created_at: string;
  is_current?: boolean;
}

export interface FnFSettlement {
  id: string;
  employee_id: string;
  first_name?: string;
  last_name?: string;
  emp_code?: string;
  resignation_date?: string;
  last_working_day: string;
  net_payable?: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PAID' | 'HOLD_ASSET_PENDING';
  created_at: string;

  // Financials
  pending_salary?: number;
  leave_encashment?: number;
  gratuity?: number;
  bonus_pending?: number;
  other_earnings?: number;
  gross_payable?: number; // total_earnings

  notice_period_recovery?: number;
  loan_recovery?: number;
  it_assets_recovery?: number;
  other_recoveries?: number;
  total_deductions?: number;
  tds_on_fnf?: number;

  hold_reason?: string;
  remarks?: string;
  paid_at?: string;
}

export default payrollService;