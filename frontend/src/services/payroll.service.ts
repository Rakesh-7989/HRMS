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

  getMyPayslips: async () => {
    try {
      const response = await api.get<ApiResponse<Array<any>>>('/payroll/payslips/my');
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

  // Deduction types and creation
  listDeductionTypes: async () => {
    try {
      const response = await api.get<ApiResponse<Array<{ id: string; name: string }>>>('/payroll/deduction-types');
      return response.data.data || [];
    } catch (err) {
      // Fallback to common types
      return [
        { id: 'pf', name: 'Provident Fund' },
        { id: 'pt', name: 'Professional Tax' },
        { id: 'esi', name: 'ESI' },
        { id: 'tds', name: 'Tax (TDS)' },
        { id: 'loan_emi', name: 'Loan EMI' },
        { id: 'other', name: 'Other' },
      ];
    }
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

  getCostCentreAllocations: async (params?: { costCentreId?: string; employeeId?: string }) => {
    try {
      const response = await api.get<ApiResponse<Array<any>>>('/payroll/statutory/cost-centre-allocations', { params });
      return response.data.data || [];
    } catch (err) {
      return [];
    }
  },

  upsertCostCentreAllocation: async (payload: { costCentreId: string; employeeId: string; allocationPercentage: number }) => {
    const response = await api.post<ApiResponse<any>>('/payroll/statutory/cost-centre-allocations', payload);
    return response.data.data!;
  },

  deleteCostCentreAllocation: async (id: string) => {
    const response = await api.delete<ApiResponse<any>>(`/payroll/statutory/cost-centre-allocations/${id}`);
    return response.data.data;
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

  // ==========================================================================
  // Reimbursements
  // ==========================================================================
  listReimbursements: async (scope: 'my' | 'all' = 'my') => {
    try {
      const endpoint = scope === 'all' ? '/payroll/settlement/reimbursements' : '/payroll/settlement/reimbursements/my';
      const response = await api.get<ApiResponse<Array<any>>>(endpoint);
      return response.data.data || [];
    } catch { return []; }
  },

  createReimbursement: async (payload: { category: string; amount: number; claimDate: string; description?: string; receiptUrl?: string }) => {
    const response = await api.post<ApiResponse<any>>('/payroll/settlement/reimbursements', payload);
    return response.data.data!;
  },

  approveReimbursement: async (id: string, payload: { status: 'APPROVED' | 'REJECTED'; includeInPayroll?: boolean }) => {
    const response = await api.patch<ApiResponse<any>>(`/payroll/settlement/reimbursements/${id}/approve`, payload);
    return response.data.data!;
  },

  // ==========================================================================
  // Salary Revisions
  // ==========================================================================
  getSalaryRevisions: async () => {
    try {
      const response = await api.get<ApiResponse<Array<any>>>('/payroll/salary/revisions');
      return response.data.data || [];
    } catch { return []; }
  },

  createSalaryRevision: async (payload: { employeeId: string; newCtc: number; revisionType: string; effectiveFrom: string; remarks?: string }) => {
    const response = await api.post<ApiResponse<any>>('/payroll/salary/revisions', payload);
    return response.data.data!;
  },

  approveSalaryRevision: async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const response = await api.patch<ApiResponse<any>>(`/payroll/salary/revisions/${id}/approve`, { status });
    return response.data.data!;
  },

  // ==========================================================================
  // Consultants
  // ==========================================================================
  listConsultants: async () => {
    try {
      const response = await api.get<ApiResponse<Array<any>>>('/payroll/consultants');
      return response.data.data || [];
    } catch { return []; }
  },

  createConsultant: async (payload: { name: string; email: string; phone?: string; companyName?: string; monthlyRate?: number }) => {
    const response = await api.post<ApiResponse<any>>('/payroll/consultants', payload);
    return response.data.data!;
  },

  listConsultantInvoices: async () => {
    try {
      const response = await api.get<ApiResponse<Array<any>>>('/payroll/consultants/invoices');
      return response.data.data || [];
    } catch { return []; }
  },

  createConsultantInvoice: async (payload: { consultantId: string; amount: number; invoiceDate: string }) => {
    const response = await api.post<ApiResponse<any>>('/payroll/consultants/invoices', payload);
    return response.data.data!;
  },

  approveConsultantInvoice: async (id: string) => {
    const response = await api.patch<ApiResponse<any>>(`/payroll/consultants/invoices/${id}/approve`);
    return response.data.data!;
  },

  markConsultantInvoicePaid: async (id: string, paymentReference?: string) => {
    const response = await api.patch<ApiResponse<any>>(`/payroll/consultants/invoices/${id}/paid`, { paymentReference });
    return response.data.data!;
  },

  // ==========================================================================
  // Statutory Settings
  // ==========================================================================
  getStatutoryConfig: async () => {
    try {
      const response = await api.get<ApiResponse<any>>('/payroll/statutory/config');
      return response.data.data;
    } catch { return null; }
  },

  updateStatutoryConfig: async (payload: any) => {
    const response = await api.post<ApiResponse<any>>('/payroll/statutory/config', payload);
    return response.data.data!;
  },

  getPtSlabs: async () => {
    try {
      const response = await api.get<ApiResponse<Array<any>>>('/payroll/statutory/pt-slabs');
      return response.data.data || [];
    } catch { return []; }
  },

  createPtSlab: async (payload: { state: string; minSalary: number; maxSalary?: number; monthlyTax: number }) => {
    const response = await api.post<ApiResponse<any>>('/payroll/statutory/pt-slabs', payload);
    return response.data.data!;
  },

  deletePtSlab: async (id: string) => {
    const response = await api.delete<ApiResponse<any>>(`/payroll/statutory/pt-slabs/${id}`);
    return response.data.data;
  },

  getDeductionTypes: async () => {
    try {
      const response = await api.get<ApiResponse<Array<any>>>('/payroll/statutory/deduction-types');
      return response.data.data || [];
    } catch { return []; }
  },

  createDeductionType: async (payload: { name: string; code: string; category: string; calculationType: string; isRecurring: boolean }) => {
    const response = await api.post<ApiResponse<any>>('/payroll/statutory/deduction-types', payload);
    return response.data.data!;
  },

  // ==========================================================================
  // Pay Run Enhanced
  // ==========================================================================
  deletePayRun: async (id: string) => {
    const response = await api.delete<ApiResponse<any>>(`/payroll/runs/${id}`);
    return response.data.data;
  },

  rejectPayRun: async (id: string, reason: string) => {
    const response = await api.patch<ApiResponse<any>>(`/payroll/runs/${id}/reject`, { reason });
    return response.data.data!;
  },

  revokePayRun: async (id: string) => {
    const response = await api.patch<ApiResponse<any>>(`/payroll/runs/${id}/revoke`);
    return response.data.data!;
  },

  // Expose api for components that need direct access
  _api: api,
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
