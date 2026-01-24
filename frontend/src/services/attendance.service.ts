import api from './api';

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  check_in_ip?: string;
  check_out_ip?: string;
  check_in_device?: string;
  check_out_device?: string;
  is_late?: boolean;
  status: 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'APPROVED' | 'REJECTED' | 'PENDING_CHECKOUT' | 'INCOMPLETE_HOURS';
  approved_by?: string;
  rejected_by?: string;
  rejection_reason?: string;
  created_at?: string;
}

export interface AttendanceSummaryRow {
  date: string;
  first_name?: string;
  last_name?: string;
  present_days?: number;
  late_days?: number;
  leave_days?: number;
  total_checkins?: number;
  present_count?: number;
  late_count?: number;
  absent_count?: number;
}
export interface AttendanceAnalytics {
  overallSummary?: {
    total_employees: number;
    active_employees: number;
    total_present_days: number;
    total_late_days: number;
    total_absent_days: number;
    avg_work_hours: number;
  };
  teamSummary?: {
    total_team_members: number;
    total_present_days: number;
    total_late_days: number;
    total_absent_days: number;
    avg_work_hours: number;
  };
  personalSummary?: {
    present_days: number;
    late_days: number;
    absent_days: number;
    total_days: number;
    attendance_rate: number;
    avg_work_hours: number;
  };
  dailyTrends: Array<{
    date: string;
    present_count: number;
    late_count: number;
    absent_count: number;
    total_checkins?: number;
    active_members?: number;
  }>;
  departmentStats?: Array<{
    department_name: string;
    total_employees: number;
    active_employees: number;
    present_days: number;
    late_days: number;
    avg_work_hours: number;
  }>;
  teamMemberStats?: Array<{
    first_name: string;
    last_name: string;
    department: string;
    present_days: number;
    late_days: number;
    total_days: number;
    attendance_rate: number;
  }>;
  topPerformers?: Array<{
    first_name: string;
    last_name: string;
    department: string;
    present_days: number;
    late_days: number;
    total_days: number;
    attendance_rate: number;
  }>;
  monthlyBreakdown?: Array<{
    month: string;
    present_days: number;
    late_days: number;
    absent_days: number;
    total_days: number;
  }>;
  dailyDetails?: Array<{
    date: string;
    check_in_time: string;
    check_out_time: string;
    is_late: boolean;
    status: string;
    work_hours: number;
  }>;
  teamMembers?: Array<{
    id: string;
    first_name: string;
    last_name: string;
    department: string;
  }>;
  period: {
    from_date: string;
    to_date: string;
  };
}

export interface AttendanceReports {
  reports: Array<{
    first_name?: string;
    last_name?: string;
    email?: string;
    department?: string;
    designation?: string;
    date: string;
    check_in_time: string;
    check_out_time: string;
    is_late: boolean;
    status: string;
    work_hours: number;
  }>;
  summary: {
    total_employees?: number;
    total_team_members?: number;
    total_records: number;
    present_count: number;
    late_count: number;
    absent_count: number;
  };
  pagination: {
    limit: number;
    offset: number;
    report_type: string;
  };
}

export const attendanceService = {
  clockIn: async (coords?: { latitude: number; longitude: number; device?: string }): Promise<Attendance> => {
    const response = await api.post<{ status: string; data: Attendance }>('/attendance/clock-in', coords || {});
    return response.data.data!;
  },

  clockOut: async (coords?: { latitude: number; longitude: number; device?: string }): Promise<Attendance> => {
    const response = await api.post<{ status: string; data: Attendance }>('/attendance/clock-out', coords || {});
    return response.data.data!;
  },

  getTodayAttendance: async (): Promise<Attendance | null> => {
    const response = await api.get<{ status: string; data: Attendance | null }>('/attendance/today');
    return response.data.data || null;
  },

  getMyAttendance: async (params?: {
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<Attendance[]> => {
    const response = await api.get<{ status: string; data: Attendance[] }>('/attendance/my-attendance', { params });
    return response.data.data || [];
  },

  getTeamAttendance: async (params?: {
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<Attendance[]> => {
    const response = await api.get<{ status: string; data: Attendance[] }>('/attendance/team/attendance', { params });
    return response.data.data || [];
  },

  getAttendanceRecords: async (params?: {
    employee_id?: string;
    from_date?: string;
    to_date?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Attendance[]> => {
    const response = await api.get<{ status: string; data: Attendance[] }>('/attendance/records', { params });
    return response.data.data || [];
  },

  approveAttendance: async (id: string, reason?: string): Promise<Attendance> => {
    const response = await api.put<{ status: string; data: Attendance }>(`/attendance/${id}/approve`, { reason });
    return response.data.data!;
  },

  rejectAttendance: async (id: string, reason: string): Promise<Attendance> => {
    const response = await api.put<{ status: string; data: Attendance }>(`/attendance/${id}/reject`, { reason });
    return response.data.data!;
  },

  getAttendanceSummary: async (params?: {
    from_date?: string;
    to_date?: string;
  }): Promise<AttendanceSummaryRow[]> => {
    const response = await api.get<{ status: string; data: AttendanceSummaryRow[] }>('/attendance/summary', { params });
    return response.data.data || [];
  },

  getPendingCheckouts: async (params?: {
    employee_id?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<Attendance[]> => {
    const response = await api.get<{ status: string; data: Attendance[] }>('/attendance/pending', { params });
    return response.data.data || [];
  },

  getMyPendingCheckouts: async (): Promise<Attendance[]> => {
    const response = await api.get<{ status: string; data: Attendance[] }>('/attendance/pending/my');
    return response.data.data || [];
  },

  confirmCheckout: async (id: string, status: string, reason?: string): Promise<Attendance> => {
    const response = await api.post<{ status: string; data: Attendance }>(`/attendance/${id}/confirm-checkout`, {
      status,
      reason,
    });
    return response.data.data!;
  },

  autoApprovePending: async (): Promise<{ count: number }> => {
    const response = await api.post<{ status: string; data: { count: number } }>('/attendance/pending/auto-approve', {});
    return response.data.data!;
  },

  getAttendanceAnalytics: async (params?: {
    from_date?: string;
    to_date?: string;
  }): Promise<AttendanceAnalytics> => {
    const response = await api.get<{ status: string; data: AttendanceAnalytics }>('/attendance/analytics', { params });
    return response.data.data!;
  },

  getAttendanceReports: async (params?: {
    from_date?: string;
    to_date?: string;
    report_type?: 'summary' | 'detailed' | 'trends' | 'compliance';
    limit?: number;
    offset?: number;
  }): Promise<AttendanceReports> => {
    const response = await api.get<{ status: string; data: AttendanceReports }>('/attendance/reports', { params });
    return response.data.data!;
  },

  // ============================================================================
  // REGULARIZATION
  // ============================================================================

  createRegularization: async (data: {
    date: string;
    check_in_time: string;
    check_out_time?: string;
    reason: string;
  }): Promise<RegularizationRequest> => {
    const response = await api.post<{ status: string; data: RegularizationRequest }>('/attendance/regularize', data);
    return response.data.data!;
  },

  getMyRegularizations: async (): Promise<RegularizationRequest[]> => {
    const response = await api.get<{ status: string; data: RegularizationRequest[] }>('/attendance/regularize/my');
    return response.data.data || [];
  },

  getPendingRegularizations: async (params?: { limit?: number; offset?: number }): Promise<RegularizationRequest[]> => {
    const response = await api.get<{ status: string; data: RegularizationRequest[] }>('/attendance/regularize/pending', { params });
    return response.data.data || [];
  },

  reviewRegularization: async (id: string, data: { status: 'APPROVED' | 'REJECTED'; rejection_reason?: string }): Promise<RegularizationRequest> => {
    const response = await api.put<{ status: string; data: RegularizationRequest }>(`/attendance/regularize/${id}/review`, data);
    return response.data.data!;
  },
};

export interface RegularizationRequest {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string;
  check_out_time?: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  department_name?: string;
  designation_name?: string;
  created_at: string;
}

