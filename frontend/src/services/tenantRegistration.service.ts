import api from './api';
import axios from 'axios';
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

  registerTenant: async (payload: TenantRegistrationPayload): Promise<any> => {
    const response = await api.post('/tenants/register', payload);
    return response.data;
  },

  /**
   * Verify payment - uses raw axios (no auth header) since user isn't logged in during registration
   */
  verifyPaymentPublic: async (orderId: string): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/subscriptions/verify-payment`, {
      order_id: orderId
    });
    return response.data;
  },

  /**
   * Initiate payment for a pending-payment tenant (public, no auth needed)
   * Used when a tenant with incomplete payment tries to login or retry
   */
  initiatePaymentForTenant: async (tenantId: string, email: string): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/subscriptions/initiate-tenant-payment`, {
      tenant_id: tenantId,
      email
    });
    return response.data;
  },

  /**
   * Generate UPI QR code for an existing Cashfree order (public)
   */
  getUpiQr: async (orderId: string): Promise<{ success: boolean; data?: { upi_qr_code: string; order_id: string }; message?: string }> => {
    const response = await axios.post(`${API_BASE_URL}/subscriptions/upi-qr`, {
      order_id: orderId
    });
    return response.data;
  },
};
