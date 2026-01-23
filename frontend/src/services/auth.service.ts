import api from './api';
import type { LoginCredentials, AuthResponse, User } from '@/types';

interface LoginResponse {
  status: 'success';
  accessToken: string;
  refreshToken: string;
  role: string;
  tenantId?: string;
  mustChangePassword: boolean;
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

    if (response.data.status !== 'success') {
      throw new Error('Login failed');
    }

    const { accessToken, refreshToken, role, tenantId } = response.data;

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

    return {
      accessToken,
      refreshToken,
      user,
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

  listActiveSessions: async (): Promise<any[]> => {
    const response = await api.get<{ status: 'success'; sessions: any[] }>('/auth/sessions');
    if (response.data.status !== 'success') {
      throw new Error('Failed to fetch active sessions');
    }
    return response.data.sessions;
  },

  // Get user profile from personal dashboard (available to all roles)
  async getProfileFromDashboard(): Promise<User> {
    const response = await api.get<{ status: 'success'; data?: { profile?: any } }>('/dashboards/personal');
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
      email: profile.email || currentUser.email,
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      role: currentUser.role,
      tenant_id: currentUser.tenant_id,
      is_active: profile.is_active ?? true,
    };
  },
};

