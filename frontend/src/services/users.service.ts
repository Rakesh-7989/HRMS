import api from './api';
import { AxiosError } from 'axios';

// ============================================================================
// INTERFACES
// ============================================================================

export interface User {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  nationality?: string;
  employee_id?: string;        // Employee code like "EMP001"
  employee_uuid?: string;      // Actual employee table UUID
  department_id?: string;
  designation_id?: string;
  reports_to?: string;
  manager_id?: string;
  join_date?: string;
  employment_type?: string;
  shift?: string;
  shift_id?: string;
  address?: string;
  // Financial
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  ifsc_code?: string;
  tax_id?: string;
  uan?: string;
  pf_account?: string;
  esi_number?: string;
  // Emergency Contact
  emergency_name?: string;
  emergency_phone?: string;
  emergency_relation?: string;
  // Termination
  termination_date?: string;
  termination_reason?: string;
  is_terminated?: boolean;
  ctc?: number;
  // Metadata
  created_at?: string;
  updated_at?: string;
  subscription_status?: string;
  subscription_plan_name?: string;
  two_factor_enabled?: boolean;
  profile_photo_url?: string;
  // Joined data
  department?: { id: string; name: string };
  designation?: { id: string; name: string };
  manager?: { id: string; first_name: string; last_name: string };
  tenant_settings?: {
    logo_url?: string;
    [key: string]: any;
  };
}

export interface CreateUserData {
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  nationality?: string;
  emergency_name?: string;
  emergency_phone?: string;
  emergency_relation?: string;
  employee_id?: string;
  department_id?: string;
  designation_id?: string;
  reports_to?: string;
  join_date?: string;
  employment_type?: string;
  shift?: string;
  shift_id?: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  ifsc_code?: string;
  tax_id?: string;
  address?: string;
  uan?: string;
  pf_account?: string;
  esi_number?: string;
  ctc?: number;
}

export interface UpdateUserData {
  email?: string;
  is_active?: boolean;
}

export interface UpdateEmployeeData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  nationality?: string;
  emergency_name?: string;
  emergency_phone?: string;
  emergency_relation?: string;
  employee_id?: string;
  department_id?: string;
  designation_id?: string;
  reports_to?: string;
  join_date?: string;
  employment_type?: string;
  shift?: string;
  shift_id?: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  ifsc_code?: string;
  tax_id?: string;
  address?: string;
  uan?: string;
  pf_account?: string;
  esi_number?: string;
  ctc?: number;
  profile_photo_url?: string;
}

export interface TerminateEmployeeData {
  termination_date?: string;
  termination_reason?: string;
}

export interface EmployeeFilters {
  role?: string;
  department_id?: string;
  is_active?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

// Handle API errors and extract user-friendly message
const handleApiError = (error: unknown): never => {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.error ||
      error.response?.data?.message ||
      error.message;
    throw new Error(message);
  }
  throw error;
};

// Extract data from different response formats (handles nested and non-nested)
const extractData = <T>(response: any, key?: string): T => {
  const data = response.data;

  // Try specific key first
  if (key && data[key] !== undefined) {
    return data[key];
  }

  // Try common keys
  if (data.user !== undefined) return data.user;
  if (data.users !== undefined) return data.users;
  if (data.updated !== undefined) return data.updated;
  if (data.data !== undefined) return data.data;
  if (data.result !== undefined) return data.result;
  if (data.profile !== undefined) return data.profile;

  // Return the whole data object
  return data;
};

// ============================================================================
// SERVICE
// ============================================================================

export const usersService = {
  // ==========================================================================
  // LIST & GET USERS
  // ==========================================================================

  getUsers: async (params?: EmployeeFilters): Promise<User[]> => {
    try {
      const response = await api.get('/users', { params });
      return extractData<User[]>(response, 'users') || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  getUserById: async (id: string): Promise<User | null> => {
    try {
      const response = await api.get(`/users/${id}`);
      return extractData<User>(response, 'user');
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  },

  // ==========================================================================
  // CREATE USER
  // ==========================================================================

  createUser: async (data: CreateUserData): Promise<User> => {
    try {
      const response = await api.post('/users', data);
      return extractData<User>(response, 'data');
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ==========================================================================
  // UPDATE USER
  // ==========================================================================

  updateUser: async (id: string, data: UpdateUserData): Promise<User> => {
    try {
      const response = await api.put(`/users/${id}`, data);
      return extractData<User>(response, 'updated');
    } catch (error) {
      return handleApiError(error);
    }
  },

  updateEmployee: async (id: string, data: UpdateEmployeeData): Promise<User> => {
    try {
      const response = await api.put(`/users/${id}/employee`, data);
      return extractData<User>(response, 'updated');
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ==========================================================================
  // ROLE & ASSIGNMENT
  // ==========================================================================

  changeRole: async (id: string, role: string): Promise<User> => {
    try {
      const response = await api.put(`/users/${id}/role`, { role });
      return extractData<User>(response, 'result');
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Backend expects 'manager_employee_id' not 'manager_id'
  changeManager: async (id: string, managerEmployeeId: string): Promise<User> => {
    try {
      const response = await api.put(`/users/${id}/manager`, { manager_employee_id: managerEmployeeId });
      return extractData<User>(response, 'result');
    } catch (error) {
      return handleApiError(error);
    }
  },

  assignDepartment: async (id: string, departmentId: string): Promise<User> => {
    try {
      const response = await api.put(`/users/${id}/department`, { department_id: departmentId });
      return extractData<User>(response, 'result');
    } catch (error) {
      return handleApiError(error);
    }
  },

  assignDesignation: async (id: string, designationId: string): Promise<User> => {
    try {
      const response = await api.put(`/users/${id}/designation`, { designation_id: designationId });
      return extractData<User>(response, 'result');
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ==========================================================================
  // STATUS MANAGEMENT
  // ==========================================================================

  updateStatus: async (id: string, isActive: boolean): Promise<User> => {
    try {
      const response = await api.put(`/users/${id}/status`, { is_active: isActive });
      return extractData<User>(response, 'result');
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ==========================================================================
  // TERMINATE & REHIRE
  // ==========================================================================

  terminateEmployee: async (id: string, data?: TerminateEmployeeData): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.post(`/users/${id}/terminate`, data || {});
      return { success: true, message: response.data.message || 'Employee terminated successfully' };
    } catch (error) {
      return handleApiError(error);
    }
  },

  rehireEmployee: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.post(`/users/${id}/rehire`, {});
      return { success: true, message: response.data.message || 'Employee rehired successfully' };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ==========================================================================
  // DELETE
  // ==========================================================================

  softDeleteUser: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.delete(`/users/${id}`);
      return { success: true, message: response.data.message || 'User deleted successfully' };
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ==========================================================================
  // SELF-SERVICE (PROFILE)
  // ==========================================================================

  getMyProfile: async (): Promise<User | null> => {
    try {
      const response = await api.get('/users/me/profile');
      return extractData<User>(response, 'profile');
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  },

  updateMyProfile: async (data: UpdateEmployeeData): Promise<User> => {
    try {
      const response = await api.put('/users/me/profile', data);
      return extractData<User>(response, 'updated');
    } catch (error) {
      return handleApiError(error);
    }
  },

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  // Get managers (users with MANAGER role or higher)
  getManagers: async (): Promise<User[]> => {
    try {
      const response = await api.get('/users', {
        params: { role: 'MANAGER' }
      });
      const managers = extractData<User[]>(response, 'users') || [];

      // Also get HR and ADMIN as they can be managers
      const hrResponse = await api.get('/users', { params: { role: 'HR' } });
      const hrUsers = extractData<User[]>(hrResponse, 'users') || [];

      const adminResponse = await api.get('/users', { params: { role: 'ADMIN' } });
      const adminUsers = extractData<User[]>(adminResponse, 'users') || [];

      // Combine and dedupe by ID
      const allManagers = [...managers, ...hrUsers, ...adminUsers];
      const uniqueManagers = allManagers.filter((user, index, self) =>
        index === self.findIndex(u => u.id === user.id)
      );

      return uniqueManagers;
    } catch (error) {
      console.error('Error fetching managers:', error);
      return [];
    }
  },

  getOrgTree: async (): Promise<any> => {
    try {
      const response = await api.get('/users/tree');
      return extractData<any>(response, 'tree');
    } catch (error) {
      console.error('Error fetching org tree:', error);
      return null;
    }
  },
};

export default usersService;
