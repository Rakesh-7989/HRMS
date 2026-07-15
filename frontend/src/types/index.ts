export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE' | string;
export interface TenantSettings {
  logo_url?: string;
  [key: string]: unknown;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  role: UserRole;
  permissions?: string[];
  tenant_id?: string;
  employee_id?: string;
  department_id?: string;
  designation_id?: string;
  is_active: boolean;
  avatar?: string;
  job_title?: string;
  profile_photo_url?: string;
  subscription_status?: string;
  subscription_plan_name?: string;
  plan_type?: number;
  two_factor_enabled?: boolean;
  tenant_settings?: TenantSettings;

  // Professional
  shift?: string;
  shift_start_time?: string; // HH:mm:ss
  shift_end_time?: string; // HH:mm:ss
  shift_week_offs?: string[]; // ["Sunday", "Saturday"]
  manager_first_name?: string;
  manager_last_name?: string;
  reports_to?: string;
  join_date?: string;
  employment_type?: string;

  // Personal
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  nationality?: string;
  address?: string;
  timezone?: string;

  // Emergency
  emergency_name?: string;
  emergency_phone?: string;
  emergency_relation?: string;

  // Financial
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  ifsc_code?: string;
  tax_id?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  planType?: number;
  mustChangePassword?: boolean;
  status?: string;
  preAuthToken?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}

export interface DashboardMetrics {
  totalEmployees?: number;
  activeEmployees?: number;
  presentToday?: number;
  onLeave?: number;
  pendingLeaves?: number;
  attendanceRate?: number;
  leaveBalance?: number;
  upcomingHolidays?: number;
  recentActivity?: Record<string, unknown>[];
}

export interface DashboardData {
  metrics: DashboardMetrics;
  charts?: {
    attendance?: Record<string, unknown>[];
    leaves?: Record<string, unknown>[];
    department?: Record<string, unknown>[];
  };
  recent?: Record<string, unknown>[];
}

export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'UNDER_REPAIR' | 'RETIRED' | 'REQUESTED' | 'DOA' | 'LOST' | 'WRITTEN_OFF' | 'DISPOSED';

export type AssetCategory = 'Laptop' | 'Desktop' | 'Mobile' | 'Monitor' | 'Printer' | 'Other';

export type AssetCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';

export interface Asset {
  id: string;
  asset_code: string;
  name: string;
  barcode?: string;
  category: AssetCategory;
  description?: string;
  status: AssetStatus;

  // Assignment
  assigned_to?: string;
  assigned_employee?: {
    first_name: string;
    last_name: string;
  };
  assigned_by?: string;
  assigned_by_employee?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  assigned_date?: string;
  return_date?: string;

  // Purchase Information
  purchase_date?: string;
  purchase_price?: number;
  manufacturer?: string;
  serial_number?: string;
  warranty_expiry?: string;

  department_id?: string;
  location?: string;

  // Depreciation & Financial
  book_value?: number;
  useful_life_years?: number;
  depreciation_method?: string;
  current_depreciated_value?: number; // computed by backend

  // Physical Condition
  condition?: AssetCondition;
  data_wipe_confirmed?: boolean;
  last_audit_date?: string;
  warranty_expired?: boolean; // computed by backend

  // Configuration
  configuration?: {
    os?: string;
    ram?: string;
    storage?: string;
    processor?: string;
    model?: string;
    display?: string;
    graphics?: string;
    battery?: string;
  };

  notes?: string;

  // Audit fields
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  tenant_id?: string;
}

export interface AssetHistory {
  id: string;
  asset_id: string;
  assigned_to: string;
  assigned_employee: {
    id: string;
    first_name: string;
    last_name: string;
  };
  from_date: string;
  to_date?: string;
  usage_reason?: string;
  condition_before: string;
  condition_after?: string;
  action_by: string; // admin id
  action_by_user: {
    first_name: string;
    last_name: string;
  };
  created_at: string;
}

