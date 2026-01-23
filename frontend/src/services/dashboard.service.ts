import api from './api';
import type { ApiResponse } from '@/types';
import type {
  SystemDashboard,
  OrganizationDashboard,
  HRDashboard,
  ManagerDashboard,
  EmployeeDashboard,
} from '@/types/dashboard';

export const dashboardService = {
  getSystemDashboard: async (): Promise<SystemDashboard> => {
    const response = await api.get<ApiResponse<SystemDashboard>>('/dashboards/system');
    return response.data.data!;
  },

  getOrganizationDashboard: async (): Promise<OrganizationDashboard> => {
    const response = await api.get<ApiResponse<OrganizationDashboard>>('/dashboards/organization');
    return response.data.data!;
  },

  getHRDashboard: async (): Promise<HRDashboard> => {
    const response = await api.get<ApiResponse<HRDashboard>>('/dashboards/hr');
    return response.data.data!;
  },

  getTeamDashboard: async (): Promise<ManagerDashboard> => {
    const response = await api.get<ApiResponse<ManagerDashboard>>('/dashboards/team');
    return response.data.data!;
  },

  getPersonalDashboard: async (): Promise<EmployeeDashboard> => {
    const response = await api.get<ApiResponse<EmployeeDashboard>>('/dashboards/personal');
    return response.data.data!;
  },
};

