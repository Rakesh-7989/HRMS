import api from '@/services/common/api';
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

  // Loan payments and closure
  createLoanPayment: async (loanId: string, payload: { amount: number; tx_date?: string; note?: string }) => {
    const response = await api.post<ApiResponse<any>>(`/payroll/loans/${loanId}/payments`, payload);
    return response.data.data!;
  },

  closeLoan: async (loanId: string) => {
    const response = await api.post<ApiResponse<any>>(`/payroll/loans/${loanId}/close`);
    return response.data.data!;
  },

  createSalaryComponent: async (payload: { name: string; amount: number }) => {
    const response = await api.post<ApiResponse<{ id: string; name: string; amount: number }>>('/payroll/salary-components', payload);
    return response.data.data!;
  },

  listExpenses: async () => {
    const response = await api.get<ApiResponse<Array<{ id: string; category: string; amount: number; expense_date: string }>>>('/payroll/expenses');
    return response.data.data || [];
  },

  createExpense: async (payload: { category: string; amount: number; expense_date?: string }) => {
    const response = await api.post<ApiResponse<{ id: string; category: string; amount: number; expense_date: string }>>('/payroll/expenses', payload);
    return response.data.data!;
  },

  listLoans: async () => {
    const response = await api.get<ApiResponse<Array<{ id: string; employee_id?: string; employee_name?: string; amount: number; outstanding: number }>>>('/payroll/loans');
    return response.data.data || [];
  },

  createLoan: async (payload: {
  employee_id?: string;
  employee_name?: string;
  amount: number;
  outstanding?: number;
  type?: 'standard' | 'salary_advance';
}) => {
  const response = await api.post<ApiResponse<any>>(
    '/payroll/loans',
    {
      employee_id: payload.employee_id,
      employee_name: payload.employee_name,
      amount: payload.amount,
      outstanding: payload.outstanding ?? payload.amount,
      type: payload.type ?? 'standard',
    }
  );

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

  listDeductions: async (params?: { from_date?: string; to_date?: string }) => {
    try {
      const response = await api.get<ApiResponse<Array<any>>>('/payroll/deductions', { params });
      return response.data.data || [];
    } catch (err) {
      return [];
    }
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
};

export default payrollService;