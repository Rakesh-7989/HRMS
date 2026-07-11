import api from './api';

export interface BonusPlan {
  id: string;
  name: string;
  type: 'PERFORMANCE' | 'DIWALI' | 'ANNUAL' | 'SALES_COMMISSION' | 'SPOT' | 'OTHER';
  frequency: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  eligibility_criteria?: string;
  calculation_method: 'FIXED' | 'PERCENTAGE_OF_CTC' | 'PERCENTAGE_OF_SALES' | 'PERCENTAGE_OF_SALARY';
  calculation_value: number;
  max_amount?: number;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeBonus {
  id: string;
  employee_id: string;
  bonus_plan_id: string;
  amount: number;
  payout_month: number;
  payout_year: number;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';
  remarks?: string;
  approved_by?: string;
  paid_at?: string;
  employee?: { first_name: string; last_name: string; email: string };
  plan?: { name: string; type: string };
}

export interface CommissionStructure {
  id: string;
  name: string;
  applicable_to: 'SALES' | 'COLLECTION' | 'REFERRAL' | 'OTHER';
  calculation_type: 'PERCENTAGE' | 'FIXED';
  value: number;
  threshold?: number;
  frequency: 'PER_TRANSACTION' | 'MONTHLY' | 'QUARTERLY';
  is_active: boolean;
}

export const bonusService = {
  getPlans: () => api.get<BonusPlan[]>('/bonus/plans'),
  createPlan: (data: Partial<BonusPlan>) => api.post('/bonus/plans', data),
  updatePlan: (id: string, data: Partial<BonusPlan>) => api.put(`/bonus/plans/${id}`, data),

  getEmployeeBonuses: (status?: string) =>
    api.get<EmployeeBonus[]>('/bonus/employee-bonuses', { params: { status } }),
  createEmployeeBonus: (data: Partial<EmployeeBonus>) => api.post('/bonus/employee-bonuses', data),
  approveBonus: (id: string) => api.post(`/bonus/employee-bonuses/${id}/approve`),
  markBonusPaid: (id: string) => api.post(`/bonus/employee-bonuses/${id}/pay`),

  getCommissionStructures: () => api.get<CommissionStructure[]>('/bonus/commissions'),
  createCommission: (data: Partial<CommissionStructure>) => api.post('/bonus/commissions', data),
  updateCommission: (id: string, data: Partial<CommissionStructure>) =>
    api.put(`/bonus/commissions/${id}`, data),
};
