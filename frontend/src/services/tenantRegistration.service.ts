import api from './api';
import { API_BASE_URL } from '@/utils/constants';

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

  checkAvailability: async (params: { subdomain?: string; email?: string }): Promise<{ available: boolean; message?: string }> => {
    const response = await api.get('/tenants/check-availability', { 
      params,
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    });
    return response.data;
  },

  verifyOtp: async (email: string, code: string): Promise<{ status: string; verified: boolean }> => {
    const response = await api.post('/tenants/verify-otp', { email, code });
    return response.data;
  },

  registerTenant: async (payload: TenantRegistrationPayload): Promise<Record<string, unknown>> => {
    const response = await api.post('/tenants/register', payload);
    return response.data;
  },

  /**
   * Verify payment - uses raw axios (no auth header) since user isn't logged in during registration
   */
  verifyPaymentPublic: async (orderId: string): Promise<Record<string, unknown>> => {
    const response = await fetch(`${API_BASE_URL}/subscriptions/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    });
    if (!response.ok) throw new Error('Payment verification failed');
    return response.json();
  },

  initiatePaymentForTenant: async (tenantId: string, email: string): Promise<Record<string, unknown>> => {
    const response = await fetch(`${API_BASE_URL}/subscriptions/initiate-tenant-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, email }),
    });
    if (!response.ok) throw new Error('Payment initiation failed');
    return response.json();
  },

  getUpiQr: async (orderId: string): Promise<{ success: boolean; data?: { upi_qr_code: string; order_id: string }; message?: string }> => {
    const response = await fetch(`${API_BASE_URL}/subscriptions/upi-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    });
    if (!response.ok) throw new Error('Failed to generate UPI QR');
    return response.json();
  },
};
