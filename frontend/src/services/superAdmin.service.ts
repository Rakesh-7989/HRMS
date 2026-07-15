import api from './api';

export interface Tenant {
  id: string;
  name: string;
  email: string;
  domain?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip_code?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  employee_count?: number;
  plan_name?: string;
  subscription_status?: string;
  is_trial?: boolean;
}

export interface TenantUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export const superAdminService = {
  getTenants: async (): Promise<Tenant[]> => {
    const response = await api.get<{ status: string; tenants: Tenant[] }>('/super-admin/tenants');
    return response.data.tenants || [];
  },

  getTenant: async (id: string): Promise<Tenant> => {
    const response = await api.get<{ status: string; tenant: Tenant }>(`/super-admin/tenants/${id}`);
    return response.data.tenant!;
  },

  activateTenant: async (id: string): Promise<Tenant> => {
    const response = await api.patch<{ status: string; data: Tenant }>(`/super-admin/tenants/${id}/activate`);
    return response.data.data!;
  },

  deactivateTenant: async (id: string): Promise<Tenant> => {
    const response = await api.patch<{ status: string; data: Tenant }>(`/super-admin/tenants/${id}/deactivate`);
    return response.data.data!;
  },

  getTenantUsers: async (id: string): Promise<TenantUser[]> => {
    const response = await api.get<{ status: string; users: TenantUser[] }>(`/super-admin/tenants/${id}/users`);
    return response.data.users || [];
  },

  getTenantEmployeeCount: async (id: string): Promise<number> => {
    const response = await api.get<{ status: string; count: number }>(`/super-admin/tenants/${id}/employees`);
    return response.data.count || 0;
  },

  cancelTenantSubscription: async (id: string): Promise<Record<string, unknown>> => {
    const response = await api.post(`/subscriptions/admin/cancel/${id}`);
    return response.data;
  },

  extendTenantSubscription: async (id: string, days: number): Promise<Record<string, unknown>> => {
    const response = await api.post(`/subscriptions/admin/extend/${id}`, { days });
    return response.data;
  },

  enableTenantSubscription: async (id: string, planId?: string, days?: number): Promise<Record<string, unknown>> => {
    const response = await api.post(`/subscriptions/admin/enable/${id}`, { planId, days });
    return response.data;
  },

  upgradeTenantSubscription: async (id: string, planId: string, billingCycle?: string): Promise<Record<string, unknown>> => {
    const response = await api.post(`/subscriptions/admin/upgrade/${id}`, { planId, billingCycle });
    return response.data;
  },

  suspendTenantSubscription: async (id: string): Promise<Record<string, unknown>> => {
    const response = await api.post(`/subscriptions/admin/suspend/${id}`);
    return response.data;
  },

  getTenantBillingHistory: async (id: string): Promise<Record<string, unknown>[]> => {
    const response = await api.get(`/subscriptions/admin/billing/${id}`);
    return response.data.data || [];
  },

  getPlans: async (): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/subscriptions/plans');
    return response.data.data || [];
  },
};


