import api from '@/services/common/api';
import { AxiosError } from 'axios';

// ============================================================================
// INTERFACES
// ============================================================================

// Leave Application
export interface LeaveApplication {
  id: string;
  employee_id: string;
  leave_type: string;
  leave_type_id?: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approved_by?: string;
  rejected_by?: string;
  approval_comment?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
  days_count?: number;
  attachment_url?: string;
  employee?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface LeaveSummary {
  total_applications: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled?: number;
  by_type?: Array<{
    leave_type_name: string;
    requests: number;
    total_days: number;
  }>;
}

export interface ApplyLeaveData {
  leave_type_id: string;
  leave_type?: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  half_day_session?: 'MORNING' | 'AFTERNOON' | null;
  reason: string;
  attachment_url?: string;
}

// Leave Types
export interface LeaveType {
  id: string;
  tenant_id?: string;
  name: string;
  code: string;
  description?: string;
  is_paid: boolean;
  requires_approval?: boolean;
  requires_attachment?: boolean;
  min_days_notice?: number;
  max_consecutive_days?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateLeaveTypeData {
  name: string;
  code: string;
  description?: string;
  is_paid?: boolean;
  requires_approval?: boolean;
  requires_attachment?: boolean;
  min_days_notice?: number;
  max_consecutive_days?: number;
}

export interface UpdateLeaveTypeData extends Partial<CreateLeaveTypeData> {
  is_active?: boolean;
}

// Leave Policies
export interface LeavePolicy {
  id: string;
  tenant_id?: string;
  name: string;
  description?: string;
  leave_type_id: string;
  leave_type?: LeaveType;

  // Eligibility
  applicable_roles?: string[];
  employment_types?: string[];
  is_probation_eligible: boolean;
  min_tenure_months: number;

  // Accrual Logic
  accrual_type: 'MONTHLY' | 'YEARLY' | 'FIXED';
  accrual_rate: number;
  max_balance?: number;
  year_start_month: number;

  priority: number;
  carry_forward_enabled: boolean;
  max_carry_forward: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePolicyData {
  leave_type_id: string;
  name: string;
  description?: string;
  applicable_roles?: string[] | null;
  employment_types?: string[] | null;
  is_probation_eligible?: boolean;
  min_tenure_months?: number;
  accrual_type?: 'MONTHLY' | 'YEARLY' | 'FIXED';
  accrual_rate?: number;
  max_balance?: number | null;
  year_start_month?: number;
  priority?: number;
  carry_forward_enabled?: boolean;
  max_carry_forward?: number;
}

export interface UpdatePolicyData extends Partial<CreatePolicyData> {
  is_active?: boolean;
}

// Leave Balances
export interface LeaveBalance {
  id?: string;
  employee_id: string;
  leave_type_id: string;
  leave_type?: LeaveType;
  year: number;
  entitled: number;
  used: number;
  pending: number;
  available: number;
  carried_forward?: number;
}

export interface BalanceAdjustmentData {
  employee_id: string;
  leave_type_id: string;
  adjustment: number;
  reason: string;
  year?: number;
}

// Holidays
export interface Holiday {
  id: string;
  tenant_id?: string;
  name: string;
  date: string;
  description?: string;
  is_optional: boolean;
  is_paid?: boolean;
  is_active?: boolean;
  created_at?: string;
}

export interface CreateHolidayData {
  name: string;
  date: string;
  description?: string;
  is_optional?: boolean;
  is_paid?: boolean;
}

export interface RestrictedHoliday {
  id: string;
  name: string;
  date: string;
  description?: string;
  max_claims?: number;
  claims_used?: number;
}

export interface RestrictedHolidayUsage {
  id: string;
  employee_id: string;
  holiday_id: string;
  claimed_at: string;
}

// Delegations
export interface Delegation {
  id: string;
  delegator_id: string;
  delegate_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  is_active: boolean;
  delegator?: { first_name: string; last_name: string; email: string };
  delegate?: { first_name: string; last_name: string; email: string };
  created_at?: string;
}

export interface CreateDelegationData {
  delegate_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
}

// Reports
export interface LeaveTrendReport {
  period: string;
  total_leaves: number;
  approved: number;
  rejected: number;
  cancelled: number;
  by_type?: Record<string, number>;
}

export interface AbsenteeismReport {
  employee_id: string;
  employee_name: string;
  department?: string;
  total_leave_days: number;
  absenteeism_rate: number;
}

export interface DepartmentLeaveReport {
  department_id: string;
  department_name: string;
  total_employees: number;
  total_leaves: number;
  avg_leaves_per_employee: number;
}

export interface EmployeeLeaveReport {
  employee_id: string;
  employee_name: string;
  leave_type: string;
  total_days: number;
  used: number;
  remaining: number;
}

// Query params
export interface DateRangeParams {
  from_date?: string;
  to_date?: string;
}

export interface YearParams {
  year?: number;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  status?: string;
}

// Helper function to handle API errors
const handleApiError = (error: unknown): never => {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.error || error.response?.data?.message || error.message;
    throw new Error(message);
  }
  throw error;
};

// Helper to extract data from response (handles both nested and non-nested formats)
const extractData = <T>(response: { data: T | { data: T; status?: string } }): T => {
  const responseData = response.data as any;
  // If response has a 'data' property that's the actual data, use that
  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    return responseData.data;
  }
  // Otherwise, the response IS the data
  return responseData;
};

// ============================================================================
// SERVICE
// ============================================================================

export const leaveService = {
  // ==========================================================================
  // LEAVE REQUESTS
  // ==========================================================================

  applyLeave: async (data: ApplyLeaveData): Promise<LeaveApplication> => {
    try {
      const response = await api.post('/leave/apply', data);
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  uploadAttachment: async (file: File): Promise<{ url: string; filename: string }> => {
    try {
      const formData = new FormData();
      formData.append('attachment', file);
      const response = await api.post('/leave/upload-attachment', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Backend route: GET /leave/my-leaves (not /leave/my)
  getMyLeaves: async (params?: DateRangeParams & PaginationParams & { status?: string }): Promise<LeaveApplication[]> => {
    try {
      const response = await api.get('/leave/my-leaves', { params });
      return extractData(response) || [];
    } catch (error) {
      console.error('Error fetching leaves:', error);
      return [];
    }
  },

  cancelMyLeave: async (id: string): Promise<LeaveApplication> => {
    try {
      const response = await api.post(`/leave/${id}/cancel`, {});
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Backend route: GET /leave/approvals (not /leave/approvals/pending)
  getPendingApprovals: async (params?: DateRangeParams & PaginationParams): Promise<LeaveApplication[]> => {
    try {
      const response = await api.get('/leave/approvals', { params });
      return extractData(response) || [];
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return [];
    }
  },

  // Backend uses PUT not POST
  approveLeave: async (id: string, comment?: string): Promise<LeaveApplication> => {
    try {
      const response = await api.put(`/leave/${id}/approve`, { comment });
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Backend uses PUT not POST
  rejectLeave: async (id: string, reason: string): Promise<LeaveApplication> => {
    try {
      const response = await api.put(`/leave/${id}/reject`, { reason });
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  getLeaveSummary: async (params?: DateRangeParams): Promise<LeaveSummary | null> => {
    try {
      const response = await api.get('/leave/summary', { params });
      return extractData(response);
    } catch (error) {
      console.error('Error fetching leave summary:', error);
      return null;
    }
  },

  // ==========================================================================
  // LEAVE TYPES
  // ==========================================================================

  getLeaveTypes: async (includeInactive = false): Promise<LeaveType[]> => {
    try {
      const response = await api.get('/leave/types', {
        params: includeInactive ? { include_inactive: 'true' } : undefined
      });
      return extractData(response) || [];
    } catch (error) {
      console.error('Error fetching leave types:', error);
      return [];
    }
  },

  getLeaveTypeById: async (id: string): Promise<LeaveType | null> => {
    try {
      const response = await api.get(`/leave/types/${id}`);
      return extractData(response);
    } catch (error) {
      console.error('Error fetching leave type:', error);
      return null;
    }
  },

  createLeaveType: async (data: CreateLeaveTypeData): Promise<LeaveType> => {
    try {
      const response = await api.post('/leave/types', data);
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateLeaveType: async (id: string, data: UpdateLeaveTypeData): Promise<LeaveType> => {
    try {
      const response = await api.put(`/leave/types/${id}`, data);
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  deleteLeaveType: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.delete(`/leave/types/${id}`);
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ==========================================================================
  // LEAVE POLICIES
  // ==========================================================================

  getPolicies: async (): Promise<LeavePolicy[]> => {
    try {
      const response = await api.get('/leave/policies');
      return extractData(response) || [];
    } catch (error) {
      console.error('Error fetching policies:', error);
      return [];
    }
  },

  getPolicyById: async (id: string): Promise<LeavePolicy | null> => {
    try {
      const response = await api.get(`/leave/policies/${id}`);
      return extractData(response);
    } catch (error) {
      console.error('Error fetching policy:', error);
      return null;
    }
  },

  createPolicy: async (data: CreatePolicyData): Promise<LeavePolicy> => {
    try {
      const response = await api.post('/leave/policies', data);
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  updatePolicy: async (id: string, data: UpdatePolicyData): Promise<LeavePolicy> => {
    try {
      const response = await api.put(`/leave/policies/${id}`, data);
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  deletePolicy: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.delete(`/leave/policies/${id}`);
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  assignPolicyToEmployee: async (policyId: string, employeeId: string): Promise<void> => {
    try {
      await api.post(`/leave/policies/${policyId}/assign`, { employee_id: employeeId });
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ==========================================================================
  // LEAVE BALANCES
  // ==========================================================================

  getMyBalances: async (year?: number): Promise<LeaveBalance[]> => {
    try {
      const response = await api.get('/leave/balances/me', {
        params: year ? { year } : undefined
      });
      const rawData = extractData(response) || [];
      // Transform backend format to frontend format
      return rawData.map((item: any) => ({
        id: item.id,
        employee_id: item.employee_id,
        leave_type_id: item.leave_type_id,
        leave_type: {
          id: item.leave_type_id,
          name: item.leave_type_name || 'Unknown',
          code: item.leave_type_code || '',
        },
        year: item.year,
        entitled: parseFloat(item.current_balance || 0) + parseFloat(item.used || 0) + parseFloat(item.pending || 0),
        used: parseFloat(item.used || 0),
        pending: parseFloat(item.pending || 0),
        available: parseFloat(item.current_balance || 0),
        carried_forward: parseFloat(item.carried_forward || 0),
      }));
    } catch (error) {
      console.error('Error fetching balances:', error);
      return [];
    }
  },

  getEmployeeBalances: async (employeeId: string, year?: number): Promise<LeaveBalance[]> => {
    try {
      const response = await api.get(`/leave/balances/employee/${employeeId}`, {
        params: year ? { year } : undefined
      });
      const rawData = extractData(response) || [];
      // Transform backend format to frontend format
      return rawData.map((item: any) => ({
        id: item.id,
        employee_id: item.employee_id,
        leave_type_id: item.leave_type_id,
        leave_type: {
          id: item.leave_type_id,
          name: item.leave_type_name || 'Unknown',
          code: item.leave_type_code || '',
        },
        year: item.year,
        entitled: parseFloat(item.current_balance || 0) + parseFloat(item.used || 0) + parseFloat(item.pending || 0),
        used: parseFloat(item.used || 0),
        pending: parseFloat(item.pending || 0),
        available: parseFloat(item.current_balance || 0),
        carried_forward: parseFloat(item.carried_forward || 0),
      }));
    } catch (error) {
      console.error('Error fetching employee balances:', error);
      return [];
    }
  },

  adjustBalance: async (data: BalanceAdjustmentData): Promise<LeaveBalance> => {
    try {
      const response = await api.post('/leave/balances/adjust', data);
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  getAdjustmentHistory: async (employeeId: string, params?: YearParams): Promise<any[]> => {
    try {
      const response = await api.get(`/leave/balances/employee/${employeeId}/history`, { params });
      return extractData(response) || [];
    } catch (error) {
      console.error('Error fetching adjustment history:', error);
      return [];
    }
  },

  // ==========================================================================
  // HOLIDAYS (PUBLIC)
  // ==========================================================================

  getPublicHolidays: async (params?: YearParams): Promise<Holiday[]> => {
    try {
      const response = await api.get('/leave/holidays', { params });
      return extractData(response) || [];
    } catch (error) {
      console.error('Error fetching holidays:', error);
      return [];
    }
  },

  createPublicHoliday: async (data: CreateHolidayData): Promise<Holiday> => {
    try {
      const response = await api.post('/leave/holidays', data);
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  deletePublicHoliday: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.delete(`/leave/holidays/${id}`);
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ==========================================================================
  // HOLIDAYS (RESTRICTED/FLOATING)
  // ==========================================================================

  getRestrictedHolidays: async (params?: YearParams): Promise<RestrictedHoliday[]> => {
    try {
      const response = await api.get('/leave/holidays/restricted', { params });
      return extractData(response) || [];
    } catch (error) {
      console.error('Error fetching restricted holidays:', error);
      return [];
    }
  },

  createRestrictedHoliday: async (data: CreateHolidayData & { max_claims?: number }): Promise<RestrictedHoliday> => {
    try {
      const response = await api.post('/leave/holidays/restricted', data);
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  deleteRestrictedHoliday: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.delete(`/leave/holidays/restricted/${id}`);
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  claimRestrictedHoliday: async (id: string): Promise<RestrictedHolidayUsage> => {
    try {
      const response = await api.post(`/leave/holidays/restricted/${id}/claim`, {});
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  getMyRestrictedHolidayUsage: async (): Promise<RestrictedHolidayUsage[]> => {
    try {
      const response = await api.get('/leave/holidays/restricted/my-usage');
      return extractData(response) || [];
    } catch (error) {
      console.error('Error fetching restricted holiday usage:', error);
      return [];
    }
  },

  // ==========================================================================
  // DELEGATIONS
  // ==========================================================================

  createDelegation: async (data: CreateDelegationData): Promise<Delegation> => {
    try {
      const response = await api.post('/leave/delegations', data);
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  getMyDelegations: async (): Promise<Delegation[]> => {
    try {
      const response = await api.get('/leave/delegations/my');
      return extractData(response) || [];
    } catch (error) {
      console.error('Error fetching delegations:', error);
      return [];
    }
  },

  getDelegationsToMe: async (): Promise<Delegation[]> => {
    try {
      const response = await api.get('/leave/delegations/to-me');
      return extractData(response) || [];
    } catch (error) {
      console.error('Error fetching delegations to me:', error);
      return [];
    }
  },

  revokeDelegation: async (id: string): Promise<Delegation> => {
    try {
      const response = await api.post(`/leave/delegations/${id}/revoke`, {});
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  getAllDelegations: async (params?: { active_only?: boolean }): Promise<Delegation[]> => {
    try {
      const response = await api.get('/leave/delegations', { params });
      return extractData(response) || [];
    } catch (error) {
      console.error('Error fetching all delegations:', error);
      return [];
    }
  },

  // ==========================================================================
  // LEAVE REPORTS
  // ==========================================================================

  getLeaveTrendReport: async (params?: DateRangeParams): Promise<LeaveTrendReport[]> => {
    try {
      const response = await api.get('/leave/reports/trends', { params });
      return extractData(response) || [];
    } catch (error) {
      console.error('Error fetching leave trends:', error);
      return [];
    }
  },

  getAbsenteeismReport: async (params?: DateRangeParams): Promise<AbsenteeismReport[]> => {
    try {
      const response = await api.get('/leave/reports/absenteeism', { params });
      return extractData(response) || [];
    } catch (error) {
      console.error('Error fetching absenteeism report:', error);
      return [];
    }
  },

  getDepartmentWiseReport: async (params?: DateRangeParams): Promise<DepartmentLeaveReport[]> => {
    try {
      const response = await api.get('/leave/reports/by-department', { params });
      return extractData(response) || [];
    } catch (error) {
      console.error('Error fetching department report:', error);
      return [];
    }
  },

  getEmployeeLeaveReport: async (employeeId: string, params?: YearParams): Promise<EmployeeLeaveReport[]> => {
    try {
      const response = await api.get(`/leave/reports/employee/${employeeId}`, { params });
      return extractData(response) || [];
    } catch (error) {
      console.error('Error fetching employee report:', error);
      return [];
    }
  },

  getPendingAgeingReport: async (): Promise<any[]> => {
    try {
      const response = await api.get('/leave/reports/pending-ageing');
      return extractData(response) || [];
    } catch (error) {
      console.error('Error fetching pending ageing report:', error);
      return [];
    }
  },

  getUpcomingLeavesReport: async (days?: number): Promise<any[]> => {
    try {
      const response = await api.get('/leave/reports/upcoming', {
        params: days ? { days } : undefined
      });
      return extractData(response) || [];
    } catch (error) {
      console.error('Error fetching upcoming leaves:', error);
      return [];
    }
  },
  runAccrual: async (): Promise<{ success: boolean; accruals_processed: number }> => {
    try {
      const response = await api.post('/leave/policies/run-accrual');
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  bulkAllocate: async (data: {
    leave_type_id: string;
    days: number;
    employee_ids?: string[];
    reason: string;
    year?: number;
  }): Promise<{ success: boolean; processed: number; failed: number; year?: number }> => {
    try {
      const response = await api.post('/leave/balances/bulk-allocate', data);
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },

  bulkReset: async (data: {
    leave_type_id?: string;
    employee_ids?: string[];
    reset_to_zero?: boolean;
    reason?: string;
    year?: number;
  }): Promise<{ success: boolean; processed: number; failed: number; year?: number }> => {
    try {
      const response = await api.post('/leave/balances/bulk-reset', data);
      return extractData(response);
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default leaveService;
