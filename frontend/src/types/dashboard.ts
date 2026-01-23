// Dashboard types matching backend response structure

export interface SystemDashboard {
  metrics: {
    active_tenants: number;
    total_tenants: number;
    total_users: number;
    total_employees: number;
    active_tenants_24h: number;
    active_users_24h: number;
  };
  tenantGrowth: Array<{ date: string; new_tenants: number }>;
  userGrowth: Array<{ date: string; new_users: number }>;
  topActiveTenants: Array<{
    id: string;
    name: string;
    user_count: number;
    session_count: number;
    last_activity: string;
  }>;
  systemHealth: {
    active_orgs: number;
    active_users: number;
    pending_pwd_change: number;
    inactive_users: number;
  };
  generatedAt: string;
}

export interface OrganizationDashboard {
  orgMetrics: {
    total_users: number;
    total_employees: number;
    total_departments: number;
    total_designations: number;
    active_users: number;
    inactive_users: number;
  };
  roleDistribution: Array<{ role: string; count: number }>;
  departmentAnalytics: Array<{
    id: string;
    name: string;
    employee_count: number;
    manager_count: number;
  }>;
  attendanceMetrics: Array<{
    date: string;
    total_checkins: number;
    late_arrivals: number;
    unique_employees: number;
  }>;
  leaveStatistics: Array<{
    leave_type: string;
    total_requests: number;
    approved: number;
    rejected: number;
    pending: number;
  }>;
  employeeStatus: {
    active: number;
    inactive: number;
    new_employees: number;
  };
  topDepartments: Array<{
    id: string;
    name: string;
    headcount: number;
  }>;
  generatedAt: string;
}

export interface HRDashboard {
  leaveMetrics: {
    total_requests: number;
    pending: number;
    approved: number;
    rejected: number;
    employees_with_requests: number;
  };
  pendingRequests: Array<{
    id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    created_at: string;
    reason: string;
    employee_id: string;
    first_name: string;
    last_name: string;
    department: string;
  }>;
  leaveTypeDistribution: Array<{
    leave_type: string;
    count: number;
    approved_count: number;
    avg_duration_days: number;
  }>;
  attendanceOverview: {
    date: string;
    total_checkins: number;
    unique_employees: number;
    late_count: number;
    late_percentage: number;
  };
  employeesOnLeaveToday: Array<{
    id: string;
    first_name: string;
    last_name: string;
    department: string;
    leave_type: string;
    is_half_day: boolean;
    half_day_session: string | null;
  }>;
  leaveBalanceTopTakers: Array<{
    id: string;
    first_name: string;
    last_name: string;
    total_leave_days: number;
    approved_days: number;
  }>;
  recentActions: Array<{
    id: string;
    status: string;
    first_name: string;
    last_name: string;
    updated_at: string;
    approved_by_email: string | null;
  }>;
  generatedAt: string;
}

export interface ManagerDashboard {
  teamMetrics: {
    direct_reports: number;
    active_employees: number;
    inactive_employees: number;
  };
  directReports: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    is_active: boolean;
    department: string;
    designation: string;
    on_leave_today: number;
  }>;
  teamAttendanceToday: Array<{
    employee_id: string;
    first_name: string;
    last_name: string;
    check_in_time: string;
    is_late: boolean;
    status: string;
  }>;
  teamLeaveRequests: Array<{
    id: string;
    employee_id: string;
    first_name: string;
    last_name: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    status: string;
  }>;
  pendingLeaveRequests: Array<{
    id: string;
    employee_id: string;
    first_name: string;
    last_name: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
  }>;
  teamPerformanceMetrics: {
    days_tracked: number;
    total_checkins: number;
    late_arrivals: number;
    late_percentage: number;
  };
  generatedAt: string;
}

export interface EmployeeDashboard {
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    department: string | null;
    designation: string | null;
    manager_first_name: string | null;
    manager_last_name: string | null;
    joined_date: string;
    is_active: boolean;
  };
  leaveMetrics: {
    total_applications: number;
    pending: number;
    approved: number;
    rejected: number;
    upcoming_leaves: number;
  };
  leaveHistory: Array<{
    id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    is_half_day: boolean;
    half_day_session: string | null;
    status: string;
    reason: string;
    created_at: string;
    updated_at: string;
  }>;
  attendanceSummary: {
    total_days: number;
    late_days: number;
    days_present: number;
    avg_hours_worked: number;
  };
  todayStatus: {
    check_in_time: string | null;
    check_out_time: string | null;
    is_late: boolean | null;
    status: string;
  };
  monthlyAttendance: Array<{
    date: string;
    type: string;
    count: number;
  }>;
  upcomingLeaves: Array<{
    id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    is_half_day: boolean;
    status: string;
  }>;
  generatedAt: string;
}

export type DashboardResponse =
  | SystemDashboard
  | OrganizationDashboard
  | HRDashboard
  | ManagerDashboard
  | EmployeeDashboard;

