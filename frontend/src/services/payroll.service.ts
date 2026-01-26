import api from './api';
import type { ApiResponse } from '@/types';

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
      const response = await api.get<ApiResponse<Array<{ id: string; name: string }>>>('/payroll/expenses/getcategories');
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  createExpenseCategory: async (payload: { name: string }) => {
    const response = await api.post<ApiResponse<{ id: string; name: string }>>('/payroll/expenses/createcategories', payload);
    return response.data.data!;
  },

  approveExpense: async (expenseId: string, payload: { status: 'APPROVED' | 'REJECTED' }) => {
    const response = await api.patch<ApiResponse<any>>(`/payroll/expenses/${expenseId}/approve`, payload);
    return response.data.data!;
  },

  rejectExpense: async (expenseId: string) => {
    // convenience wrapper
    const response = await api.patch<ApiResponse<any>>(`/payroll/expenses/${expenseId}/approve`, { status: 'REJECTED' });
    return response.data.data!;
  },

  setExpensePayrollInclusion: async (expenseId: string, payrollIncluded: boolean) => {
    const response = await api.patch<ApiResponse<any>>(`/payroll/expenses/${expenseId}/payroll`, { payrollIncluded });
    return response.data.data!;
  },

  updateExpense: async (expenseId: string, payload: { categoryId?: string; amount?: number; expenseDate?: string; description?: string; payrollIncluded?: boolean }) => {
    const response = await api.put<ApiResponse<any>>(`/payroll/expenses/${expenseId}`, payload);
    return response.data.data!;
  },

  deleteExpense: async (expenseId: string) => {
    const response = await api.delete<ApiResponse<any>>(`/payroll/expenses/${expenseId}`);
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
    } catch (err: any) {
      console.error('[payrollService] listLoans failed', err?.response?.status, err?.response?.data || err.message || err);
      // rethrow so callers (useQuery) can catch and show UI feedback
      throw err;
    }
  },

  createLoan: async (payload: any) => {
    // Accept either admin (snake_case) payloads or employee (camelCase) payloads and forward to backend
    const response = await api.post<ApiResponse<any>>('/payroll/loans/', payload);
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
      const response = await api.get<ApiResponse<Array<any>>>('/payroll/payslips', { params });
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  listPaySchedules: async () => {
    try {
      const response = await api.get<ApiResponse<Array<any>>>('/payroll/schedules');
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  updatePaySchedule: async (scheduleId: string, payload: { cycle?: string; credit_day?: number; cutoff_day?: number }) => {
    const response = await api.post<ApiResponse<any>>(`/payroll/schedules/${scheduleId}`, payload);
    return response.data.data!;
  },

  listDeductions: async (params?: { from_date?: string; to_date?: string }) => {
    try {
      const response = await api.get<ApiResponse<Array<any>>>('/payroll/deductions', { params });
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
    const response = await api.post<ApiResponse<any>>('/payroll/deductions', payload);
    return response.data.data!;
  },

  listIncomeTax: async (params?: { from_date?: string; to_date?: string }) => {
    try {
      const response = await api.get<ApiResponse<Array<any>>>('/payroll/income-tax', { params });
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  listSalaryRevisions: async (params?: { from_date?: string; to_date?: string }) => {
    try {
      const response = await api.get<ApiResponse<Array<any>>>('/payroll/salary-revisions', { params });
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  // Payslip generation, download, email and history
  generateMonthlyPayslips: async (payload: { month: number; year: number }) => {
    const response = await api.post<ApiResponse<any>>('/payroll/payslips/generate', payload);
    return response.data.data!;
  },

  downloadPayslip: async (payslipId: string) => {
    // returns binary PDF
    const response = await api.get(`/payroll/payslips/${payslipId}/download`, { responseType: 'blob' as any });
    return response.data;
  },

  emailPayslip: async (payslipId: string, payload?: { to?: string }) => {
    const response = await api.post<ApiResponse<any>>(`/payroll/payslips/${payslipId}/email`, payload);
    return response.data.data!;
  },

  listPayslipHistory: async (params?: { employee_id?: string; from_date?: string; to_date?: string }) => {
    try {
      const response = await api.get<ApiResponse<Array<any>>>('/payroll/payslips/history', { params });
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  // Loan payments and closure
  createLoanPayment: async (loanId: string, payload: { amount: number; tx_date?: string; note?: string }) => {
    const response = await api.post<ApiResponse<any>>(`/payroll/loans/${loanId}/payments`, payload);
    return response.data.data!;
  },

  approveLoan: async (loanId: string, payload: { status: 'APPROVED' | 'REJECTED'; remarks?: string }) => {
    const response = await api.patch<ApiResponse<any>>(`/payroll/loans/${loanId}/approve`, payload);
    return response.data.data!;
  },

  closeLoan: async (loanId: string) => {
    // backend expects a PATCH for close
    const response = await api.patch<ApiResponse<any>>(`/payroll/loans/${loanId}/close`);
    return response.data.data!;
  },

  // Loan Types (HR / ADMIN)
  listLoanTypes: async () => {
    try {
      // Debug: inspect token payload to help verify the role sent with the request
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          // eslint-disable-next-line no-console
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

      const response = await api.get<ApiResponse<Array<any>>>('/payroll/loans/loantype');
      return response.data.data || [];
    } catch (err: any) {
      console.error('[payrollService] listLoanTypes failed', err?.response?.status, err?.response?.data || err.message || err);
      // Rethrow so callers (useQuery) can surface the error to UI
      throw err;
    }
  },

  getLoanType: async (loanTypeId: string) => {
    const response = await api.get<ApiResponse<any>>(`/payroll/loans/loantype/${loanTypeId}`);
    return response.data.data!;
  },

  createLoanType: async (payload: any) => {
    // normalize payload to camelCase keys expected by backend validator
    const body = {
      name: payload.name,
      interestRate: payload.interestRate ?? payload.interest_rate ?? 0,
      interestType: payload.interestType ?? payload.interest_type ?? 'FLAT',
      maxAmount: payload.maxAmount ?? payload.max_amount ?? undefined,
      maxTenureMonths: payload.maxTenureMonths ?? payload.max_tenure_months ?? undefined,
      isTaxable: payload.isTaxable ?? payload.is_taxable ?? false,
      isActive: payload.isActive ?? payload.is_active ?? true,
    };
    const response = await api.post<ApiResponse<any>>('/payroll/loans/loantype', body);
    return response.data.data!;
  },

  updateLoanType: async (loanTypeId: string, payload: any) => {
    const body = {
      name: payload.name,
      interestRate: payload.interestRate ?? payload.interest_rate,
      interestType: payload.interestType ?? payload.interest_type,
      maxAmount: payload.maxAmount ?? payload.max_amount,
      maxTenureMonths: payload.maxTenureMonths ?? payload.max_tenure_months,
      isTaxable: payload.isTaxable ?? payload.is_taxable,
      isActive: payload.isActive ?? payload.is_active,
    };
    const response = await api.put<ApiResponse<any>>(`/payroll/loans/loantype/${loanTypeId}`, body);
    return response.data.data!;
  },

  deleteLoanType: async (loanTypeId: string) => {
    const response = await api.delete<ApiResponse<any>>(`/payroll/loans/loantype/${loanTypeId}`);
    return response.data.data!;
  },

  // Cost centers & project allocations
  listCostCenters: async () => {
    try {
      const response = await api.get<ApiResponse<Array<{ id: string; name: string; allocated: number; spent: number }>>>('/payroll/cost-centers');
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  // Create cost center (simple helper for frontend forms)
  createCostCenter: async (payload: { name: string; allocated?: number }) => {
    const response = await api.post<ApiResponse<any>>('/payroll/cost-centers', payload);
    return response.data.data!;
  },


  listProjectAllocations: async () => {
    try {
      const response = await api.get<ApiResponse<Array<{ id: string; project_name: string; department: string; allocated: number; spent: number }>>>('/payroll/project-allocations');
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  getCostCenterReports: async (params?: { from_date?: string; to_date?: string }) => {
    try {
      const response = await api.get<ApiResponse<Array<any>>>('/payroll/cost-center-reports', { params });
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  // Merchants, vendors and third-party payouts
  listMerchants: async () => {
    try {
      const response = await api.get<ApiResponse<Array<any>>>('/payroll/merchants');
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  // Salary structure
  getSalaryStructure: async () => {
    try {
      const response = await api.get<ApiResponse<any>>('/payroll/salary-structure');
      return response.data.data || null;
    } catch (err) {
      return null;
    }
  },

  // Vendor / 3rd-party payouts - use Merchants router endpoints which are now mounted at /payroll/merchants
  listVendorPayments: async () => {
    try {
      const response = await api.get<ApiResponse<Array<any>>>('/payroll/merchants/getvendors');
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  createVendorPayout: async (payload: { vendorName: string; amount: number; paymentDate?: string; notes?: string }) => {
    // backend validator expects { vendorName, amount, paymentDate }
    const body = { vendorName: payload.vendorName, amount: payload.amount, paymentDate: payload.paymentDate || new Date().toISOString().slice(0, 10), notes: payload.notes };
    const response = await api.post<ApiResponse<any>>('/payroll/merchants/createvendors', body);
    return response.data.data!;
  },

  listThirdPartyPayouts: async () => {
    try {
      const response = await api.get<ApiResponse<Array<any>>>('/payroll/merchants/getthird-party');
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  createThirdPartyPayout: async (payload: { providerName: string; amount: number; payoutDate?: string; notes?: string }) => {
    const body = { providerName: payload.providerName, amount: payload.amount, payoutDate: payload.payoutDate || new Date().toISOString().slice(0, 10), notes: payload.notes };
    const response = await api.post<ApiResponse<any>>('/payroll/merchants/createthird-party', body);
    return response.data.data!;
  },

  updateSalaryStructure: async (payload: { basic: number; hra_percent: number; other_allowances: number; monthly_deductions: number; employer_contrib?: number }) => {
    const response = await api.post<ApiResponse<any>>('/payroll/salary-structure', payload);
    return response.data.data!;
  },

  listMerchantTransactions: async () => {
    // Try merchants router transaction endpoint first, then fallback to legacy path
    try {
      const primary = await api.get<ApiResponse<Array<any>>>('/payroll/merchants/transactions');
      return primary.data.data || [];
    } catch (err) {
      try {
        const fallback = await api.get<ApiResponse<Array<any>>>('/payroll/merchant-transactions');
        return fallback.data.data || [];
      } catch (err2) {
        return [];
      }
    }
  },

  markVendorPaymentPaid: async (paymentId: string) => {
    const response = await api.post<ApiResponse<any>>(`/payroll/vendor-payments/${paymentId}/paid`);
    return response.data.data!;
  },

  markThirdPartyPayoutPaid: async (payoutId: string) => {
    const response = await api.post<ApiResponse<any>>(`/payroll/third-party-payouts/${payoutId}/paid`);
    return response.data.data!;
  },

  // ==========================================================================
  // Tax Declarations
  // ==========================================================================
  getTaxDeclaration: async (fy: string) => {
    try {
      const response = await api.get<ApiResponse<any>>(`/payroll/tax-declarations/${fy}`);
      return response.data.data;
    } catch (err) { return null; }
  },

  submitTaxDeclaration: async (payload: any) => {
    const response = await api.post<ApiResponse<any>>('/payroll/tax-declarations', payload);
    return response.data.data!;
  },


  // ==========================================================================
  // Pay Runs
  // ==========================================================================
  getPayRuns: async () => {
    try {
      const response = await api.get<ApiResponse<any>>('/payroll/runs');
      return response.data.data || [];
    } catch { return []; }
  },

  createPayRun: async (payload: { periodMonth: number; periodYear: number }) => {
    const response = await api.post<ApiResponse<any>>('/payroll/runs', payload);
    return response.data.data!;
  },

  calculatePayRun: async (id: string) => {
    const response = await api.post<ApiResponse<any>>(`/payroll/runs/${id}/calculate`);
    return response.data.data!;
  },

  approvePayRun: async (id: string) => {
    const response = await api.put<ApiResponse<any>>(`/payroll/runs/${id}/approve`);
    return response.data.data!;
  },

  lockPayRun: async (id: string) => {
    const response = await api.put<ApiResponse<any>>(`/payroll/runs/${id}/lock`);
    return response.data.data!;
  },

  // ==========================================================================
  // FnF Settlements
  // ==========================================================================

  getFnFSettlements: async () => {
    // try {
    //   const response = await api.get<ApiResponse<Array<FnFSettlement>>>('/payroll/fnf');
    //   return response.data.data || [];
    // } catch (err) {
    //   console.warn('Backend FnF endpoint missing, returning mock', err);
    //   return [];
    // }
    try {
      const response = await api.get<ApiResponse<Array<FnFSettlement>>>('/payroll/fnf');
      return response.data.data || [];
    } catch (err) { return []; }
  },

  createFnFSettlement: async (payload: { employeeId: string; lastWorkingDay: string; resignationDate?: string }) => {
    const response = await api.post<ApiResponse<FnFSettlement>>('/payroll/fnf', payload);
    return response.data.data!;
  },

  approveFnF: async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const response = await api.put<ApiResponse<FnFSettlement>>(`/payroll/fnf/${id}/status`, { status });
    return response.data.data!;
  },

  payFnF: async (id: string) => {
    const response = await api.post<ApiResponse<FnFSettlement>>(`/payroll/fnf/${id}/pay`);
    return response.data.data!;
  },

  // ============================================================================
  // MISSING METHODS (Added for build fix)
  // ============================================================================

  getSalaryTemplates: async () => {
    // Mock data for now to satisfy build and types validation
    // In real app, this should fetch from /payroll/salary-templates
    return [
      {
        id: 't1',
        name: 'Standard Structure',
        description: 'Default structure',
        basic_percentage: 50,
        hra_percentage: 20,
        da_percentage: 0,
        special_allowance_percentage: 30,
        other_allowance_percentage: 0,
        is_default: true,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];
  },

  createSalaryTemplate: async (payload: any) => {
    return payrollService.createSalaryComponent(payload);
  },

  updateSalaryTemplate: async (id: string, payload: any) => {
    // Stub or implement real endpoint
    const response = await api.put<ApiResponse<any>>(`/payroll/salary-components/${id}`, payload);
    return response.data.data!;
  },

  deleteSalaryTemplate: async (id: string) => {
    const response = await api.delete<ApiResponse<any>>(`/payroll/salary-components/${id}`);
    return response.data.data!;
  },

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
    const response = await api.delete<ApiResponse<any>>(`/payroll/statutory/pt-slabs/${id}`);
    return response.data.data!;
  },

  getCostCenters: async () => {
    return payrollService.listCostCenters();
  }
};

export interface FnFSettlement {
  id: string;
  employee_id: string;
  first_name?: string;
  last_name?: string;
  emp_code?: string;
  resignation_date?: string;
  last_working_day: string;
  net_payable?: number;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PAID';
  created_at: string;
}

export default payrollService;
