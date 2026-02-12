import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth.service';
import { usersService } from '@/services/users.service';
import { ROLE_DASHBOARDS } from '@/utils/constants';
import type { User, LoginCredentials } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<any>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAuthenticated: boolean;
  hasActivePlan: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = () => {
      const storedUser = authService.getCurrentUser();
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');

      if (storedUser && token) {
        // Try to fetch full profile and merge it into stored user
        usersService
          .getMyProfile()
          .then((profile) => {
            if (!profile) {
              // Profile fetch returned null (e.g. 404 or other non-auth error handled by service)
              // Just use stored user
              console.warn('Profile fetch returned null, using stored user data');
              setUser(storedUser);
              return;
            }

            const merged: User = {
              ...storedUser,
              first_name: profile.first_name || storedUser.first_name || '',
              last_name: profile.last_name || storedUser.last_name || '',
              phone: profile.phone || storedUser.phone,
              employee_id: profile.employee_id || storedUser.employee_id,
              department_id: profile.department_id || storedUser.department_id,
              designation_id: profile.designation_id || storedUser.designation_id,
              email: profile.email || storedUser.email,
              is_active: profile.is_active ?? storedUser.is_active,
              subscription_status: profile.subscription_status,
              subscription_plan_name: profile.subscription_plan_name,
              two_factor_enabled: profile.two_factor_enabled ?? storedUser.two_factor_enabled,
              profile_photo_url: profile.profile_photo_url,
              tenant_settings: profile.tenant_settings,
            } as User;
            localStorage.setItem('user', JSON.stringify(merged));
            setUser(merged);
          })
          .catch((error) => {
            console.warn('Failed to fetch user profile:', error);
            // If profile fetch fails (e.g., token expired), clear stored data and redirect to login
            if (error.response?.status === 401 || error.response?.status === 403) {
              localStorage.removeItem('user');
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              setUser(null);
              navigate('/login');
            } else {
              // For other errors, fall back to stored minimal user
              console.log('Using stored user data due to profile fetch error');
              setUser(storedUser);
            }
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    };

    initAuth();
  }, [navigate]);

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);

    // Check if 2FA is required
    if ((response as any).status === '2FA_REQUIRED') {
      return response; // Return the response so LoginPage can handle the next step
    }

    // Tokens and user are already stored by authService.login()

    // Check if user must change password first - DON'T set user yet
    if (response.mustChangePassword) {
      navigate('/change-password');
      return response;
    }

    setUser(response.user);

    // Try to fetch full profile and merge into user object
    try {
      const profile = await usersService.getMyProfile();
      if (profile) {
        const merged: User = {
          ...response.user,
          first_name: profile.first_name || response.user.first_name || '',
          last_name: profile.last_name || response.user.last_name || '',
          phone: profile.phone || response.user.phone,
          department_id: profile.department_id || response.user.department_id,
          designation_id: profile.designation_id || response.user.designation_id,
          email: profile.email || response.user.email,
          is_active: profile.is_active ?? response.user.is_active,
          subscription_status: profile.subscription_status,
          subscription_plan_name: profile.subscription_plan_name,
          two_factor_enabled: profile.two_factor_enabled ?? response.user.two_factor_enabled,
          profile_photo_url: profile.profile_photo_url,
          tenant_settings: profile.tenant_settings,
        } as User;
        localStorage.setItem('user', JSON.stringify(merged));
        setUser(merged);
      }
    } catch (err) {
      // ignore, keep minimal user
    }

    // Navigate to appropriate dashboard based on role
    const dashboard = ROLE_DASHBOARDS[response.user.role] || '/dashboard/personal';
    navigate(dashboard);
    return response;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        setUser,
        isAuthenticated: !!user,
        hasActivePlan: user?.role === 'SUPER_ADMIN' || user?.subscription_status === 'ACTIVE' || user?.subscription_status === 'TRIAL' || user?.subscription_status === 'CANCEL_AT_PERIOD_END',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

