import api from '@/services/common/api';

export interface TenantRegistrationPayload {
  name: string;
  domain?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  email: string;
  plan_id?: string;
  billing_cycle?: string;
  employee_count?: number;
  coupon_code?: string;
}

export const tenantRegistrationService = {
  sendOtp: async (email: string, domain?: string, phone?: string): Promise<{ status: string; message: string }> => {
    const response = await api.post('/tenants/send-otp', { email, domain, phone });
    return response.data;
  },

  verifyOtp: async (email: string, code: string): Promise<{ status: string; verified: boolean }> => {
    const response = await api.post('/tenants/verify-otp', { email, code });
    return response.data;
  },

  registerTenant: async (payload: TenantRegistrationPayload): Promise<void> => {
    await api.post('/tenants/register', payload);
  },
};
