import api from './api';

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
}

export const tenantRegistrationService = {
  registerTenant: async (payload: TenantRegistrationPayload): Promise<void> => {
    await api.post('/tenants/register', payload);
  },
};


