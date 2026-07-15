import api from './api';
import type { LoginCredentials, AuthResponse, User } from '@/types';

interface LoginResponse {
  status: 'success' | '2FA_REQUIRED';
  accessToken?: string;
  refreshToken?: string;
  role?: string;
  tenantId?: string;
  mustChangePassword?: boolean;
  preAuthToken?: string;
  planType?: number;
  message?: string;
}

interface RefreshResponse {
  status: 'success';
  accessToken: string;
  refreshToken: string;
}

interface ForgotPasswordResponse {
  status: string;
  message?: string;
}

// Decode JWT token to extract user info
const decodeJWT = (token: string): { id: string; employeeId?: string; tenantId?: string; role: string } | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // Backend returns data at top level, not nested
    const response = await api.post<LoginResponse>('/auth/login', credentials);

    if (response.data.status === '2FA_REQUIRED') {
      return {
        status: '2FA_REQUIRED',
        preAuthToken: response.data.preAuthToken,
      } as unknown as AuthResponse;
    }

    if (response.data.status !== 'success') {
      throw new Error('Login failed');
    }

    const { accessToken, refreshToken, role, tenantId, planType } = response.data as Required<LoginResponse>;

    // Decode JWT to get user ID and other info
    const decoded = decodeJWT(accessToken);
    if (!decoded) {
      throw new Error('Failed to decode authentication token');
    }

    const user: User = {
      id: decoded.id,
      email: credentials.email,
      first_name: '',
      role: role as User['role'],
      tenant_id: tenantId || decoded.tenantId,
      employee_id: decoded.employeeId,
      plan_type: planType,
      is_active: true,
    };

    // Store tokens based on rememberMe preference
    const storage = credentials.rememberMe ? localStorage : sessionStorage;

    // Clear previous session from both to avoid conflicts
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');

    storage.setItem('accessToken', accessToken);
    storage.setItem('refreshToken', refreshToken);
    storage.setItem('user', JSON.stringify(user));

    // Store mustChangePassword flag for redirect handling
    if (response.data.mustChangePassword) {
      storage.setItem('mustChangePassword', 'true');
    }

    return {
      accessToken,
      refreshToken,
      user,
      mustChangePassword: response.data.mustChangePassword,
    };
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await api.post<RefreshResponse>(
      '/auth/refresh',
      { refresh_token: refreshToken }
    );

    if (response.data.status !== 'success') {
      throw new Error('Token refresh failed');
    }

    return {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    };
  },

  logout: async (): Promise<void> => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch (error) {
      console.error('Logout API call failed, but clearing local session anyway', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');
      // Force reload to ensure all app state is reset
      window.location.href = '/login';
    }
  },

  logoutAll: async (): Promise<void> => {
    await api.post('/auth/logout-all');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string): Promise<void> => {
    await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  forgotPassword: async (email: string): Promise<void> => {
    const response = await api.post<ForgotPasswordResponse>('/auth/forgot-password', { email });
    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to initiate password reset');
    }
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    const response = await api.post<{ status: string; message: string }>('/auth/reset-password', {
      token,
      newPassword: password,
      confirmPassword: password,
    });
    if (response.data.status !== 'success') {
      throw new Error(response.data.message || 'Failed to reset password');
    }
  },

  listActiveSessions: async (): Promise<Array<{ id: string; device?: string; last_active?: string; ip_address?: string }>> => {
    const response = await api.get<{ status: 'success'; sessions: Array<{ id: string; device?: string; last_active?: string; ip_address?: string }> }>('/auth/sessions');
    if (response.data.status !== 'success') {
      throw new Error('Failed to fetch active sessions');
    }
    return response.data.sessions;
  },

  // Get user profile from personal dashboard (available to all roles)
  async getProfileFromDashboard(): Promise<User> {
    const response = await api.get<{ status: 'success'; data?: { profile?: Record<string, unknown> } }>('/dashboards/personal');
    const dashboardData = response.data.data;
    if (!dashboardData?.profile) {
      throw new Error('Failed to fetch profile from dashboard');
    }

    const profile = dashboardData.profile;
    const currentUser = authService.getCurrentUser();

    if (!currentUser) {
      throw new Error('No current user found');
    }

    // Merge dashboard profile with current user data
    return {
      id: currentUser.id,
      email: (profile.email as string) || currentUser.email,
      first_name: (profile.first_name as string) || '',
      last_name: (profile.last_name as string) || '',
      role: currentUser.role,
      tenant_id: currentUser.tenant_id,
      is_active: (profile.is_active as boolean) ?? true,
    };
  },

  setup2FA: async (): Promise<{ qrCodeDataURL: string; secret: string }> => {
    const response = await api.post<{ status: string; qrCodeDataURL: string; secret: string }>('/auth/2fa/setup');
    return response.data;
  },

  enable2FA: async (token: string): Promise<{ recoveryCodes: string[] }> => {
    const response = await api.post<{ status: string; recoveryCodes: string[] }>('/auth/2fa/enable', { token });
    return response.data;
  },

  disable2FA: async (password: string): Promise<void> => {
    const response = await api.post('/auth/verify-password', { password });
    if (response.data.status !== 'success') {
      throw new Error('Password verification failed');
    }
    // Also disable 2FA
    await api.post('/auth/2fa/disable', { password });
  },

  verifyPassword: async (password: string): Promise<boolean> => {
    try {
      const response = await api.post('/auth/verify-password', { password });
      return response.data.status === 'success';
    } catch {
      return false;
    }
  },

  verifyDBAPassword: async (password: string): Promise<boolean> => {
    try {
      const response = await api.post('/dba/verify-password', { password });
      return response.data.status === 'success';
    } catch {
      return false;
    }
  },

  verify2FALogin: async (token: string, preAuthToken: string, rememberMe: boolean = false): Promise<AuthResponse> => {
    const response = await api.post<LoginResponse>('/auth/2fa/verify', { token, preAuthToken, rememberMe });

    if (response.data.status !== 'success') {
      throw new Error('2FA verification failed');
    }

    const { accessToken, refreshToken, role, tenantId, mustChangePassword, planType } = response.data as Required<LoginResponse>;
    const decoded = decodeJWT(accessToken);
    if (!decoded) throw new Error('Failed to decode authentication token');

    const user: User = {
      id: decoded.id,
      email: '', // will be filled by profile fetch or from preAuthToken if we decoded it
      first_name: '',
      role: role as User['role'],
      tenant_id: tenantId || decoded.tenantId,
      employee_id: decoded.employeeId,
      plan_type: planType,
      is_active: true,
    };

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('accessToken', accessToken);
    storage.setItem('refreshToken', refreshToken);
    storage.setItem('user', JSON.stringify(user));

    return {
      accessToken,
      refreshToken,
      user,
      mustChangePassword: !!mustChangePassword,
    };
  },
};

