export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'HR' | 'EMPLOYEE';
export interface TenantSettings {
  logo_url?: string;
  company_name?: string;
  timezone?: string;
  date_format?: string;
  currency?: string;
  [key: string]: string | boolean | number | undefined;
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
  cancel_at_period_end?: boolean;
  two_factor_enabled?: boolean;
  tenant_settings?: TenantSettings;
  default_path?: string;

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
  mustChangePassword?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}

export interface ActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  user?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
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
  recentActivity?: ActivityItem[];
}

export interface DashboardData {
  metrics: DashboardMetrics;
  charts?: {
    attendance?: ChartDataPoint[];
    leaves?: ChartDataPoint[];
    department?: ChartDataPoint[];
  };
  recent?: ActivityItem[];
}

export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'UNDER_REPAIR' | 'RETIRED' | 'REQUESTED';

export type AssetCategory = 'Laptop' | 'Desktop' | 'Mobile' | 'Monitor' | 'Printer' | 'Other';

export interface Asset {
  id: string;
  asset_code: string;          // Changed from asset_id
  name: string;
  barcode?: string;            // Keep this - useful for frontend, can be stored in notes or separate table
  category: AssetCategory;
  description?: string;        // NEW FIELD from DB
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
  assigned_date?: string;      // NEW FIELD from DB
  return_date?: string;        // NEW FIELD from DB

  // Purchase Information
  purchase_date?: string;
  purchase_price?: number;     // Changed from purchase_cost
  manufacturer?: string;       // NEW FIELD from DB
  serial_number?: string;      // NEW FIELD from DB
  warranty_expiry?: string;

  department_id?: string;
  location?: string;

  // Configuration (keep for frontend UX)
  configuration?: {
    os?: string;
    ram?: string;
    storage?: string;
    processor?: string;
    model?: string;
    display?: string; // e.g. "15.6-inch 4K"
    graphics?: string; // e.g. "NVIDIA RTX 3060"
    battery?: string; // e.g. "86Wh"
  };

  notes?: string;

  // Audit fields
  created_at: string;
  updated_at: string;
  created_by?: string;         // NEW FIELD from DB
  updated_by?: string;         // NEW FIELD from DB
  tenant_id?: string;          // NEW FIELD from DB
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

