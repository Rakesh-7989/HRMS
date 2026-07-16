import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/utils/constants';
import type { ApiResponse } from '@/types';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    // Check both storages
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Utility to extract and format a human-readable error message from Axios errors
 */
const getErrorMessage = (error: AxiosError<ApiResponse>): string => {
  if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
  if (!error.response) return 'Network error. Please check your internet connection.';

  const status = error.response.status;
  const data = error.response.data as unknown as Record<string, unknown>;
  let backendMessage: string = (data?.message as string) || (data?.error as string) || '';

  // Extract specific validation message if available
  if (data?.details && Array.isArray(data.details) && data.details.length > 0) {
    const firstDetail = data.details[0];
    if (firstDetail.message) {
      // If the message is just "Required", try to be more specific based on path
      if (firstDetail.message === 'Required' && firstDetail.path) {
        const field = firstDetail.path.join('.');
        backendMessage = `${field} is required`;
      } else {
        backendMessage = firstDetail.message;
      }
    }
  }

  switch (status) {
    case 400:
      return backendMessage || 'Invalid request. Please check your input.';
    case 401:
      return backendMessage || 'Session expired. Please log in again.';
    case 403:
      return backendMessage || 'Access denied. You do not have permission for this action.';
    case 404:
      return backendMessage || 'Resource not found.';
    case 422:
      return backendMessage || 'Validation failed. Please check the provided data.';
    case 429:
      return 'Too many requests. Please slow down and try again later.';
    case 500:
    case 502:
    case 503:
    case 504:
      return backendMessage || 'Our servers are experiencing issues. Please try again in a few minutes.';
    default:
      return backendMessage || `An unexpected error occurred (Code: ${status})`;
  }
};

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Don't retry on login/refresh endpoints to avoid infinite loops
    if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    // Check for 403 Forbidden - Account Inactive/Revoked
    if (error.response?.status === 403) {
      const errorMessage = error.response?.data?.message || '';
      if (
        errorMessage.toLowerCase().includes('inactive') ||
        errorMessage.toLowerCase().includes('revoked') ||
        errorMessage.toLowerCase().includes('portal access')
      ) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const errorMessage = error.response?.data?.message || '';
      // If the error is specific to account status, DO NOT REFRESH. Log out immediately.
      if (
        errorMessage.toLowerCase().includes('inactive') ||
        errorMessage.toLowerCase().includes('revoked') ||
        errorMessage.toLowerCase().includes('portal access')
      ) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
        if (!refreshToken) {
          // No refresh token available - clear auth and redirect
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('refreshToken');
          sessionStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        }, { timeout: 15000 });

        // Backend returns data at top level, not nested
        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Save to whichever storage we found the token in
        if (localStorage.getItem('refreshToken')) {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
        } else {
          sessionStorage.setItem('accessToken', accessToken);
          sessionStorage.setItem('refreshToken', newRefreshToken);
        }

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Transform raw error into a user-friendly message for the frontend
    error.message = getErrorMessage(error);
    return Promise.reject(error);
  }
);

export default api;
