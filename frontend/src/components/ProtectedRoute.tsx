import React, { Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { ROLE_DASHBOARDS } from '@/utils/constants';
import type { UserRole } from '@/types';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  /** Optional granular permission check: 'module:action' */
  requiredPermission?: string;
  /** Optional skeleton to show while auth/permissions are loading and while lazy component loads */
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, requiredPermission, fallback }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const { hasPermission, loading: permLoading } = usePermissions();
  const location = useLocation();

  const skeleton = fallback ?? <PageSkeleton />;

  if (loading || permLoading) {
    return <>{skeleton}</>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Account Deactivated</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Your account has been deactivated. Please contact your administrator for assistance.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:text-sm"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If allowedRoles contains all 4 system tenant roles, it means "any tenant user"
    // so allow custom roles (non-system roles) through as well
    const SYSTEM_TENANT_ROLES = ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];
    const isWildcard = SYSTEM_TENANT_ROLES.every(r => allowedRoles.includes(r));
    const isSystemRole = ['SUPER_ADMIN', ...SYSTEM_TENANT_ROLES].includes(user.role);

    if (!isWildcard || isSystemRole) {
      // Either it's a restricted route (not wildcard) or user has a known system role that wasn't in the list
      const dashboard = ROLE_DASHBOARDS[user.role] || '/dashboard/personal';
      return <Navigate to={dashboard} replace />;
    }
    // Custom role + wildcard route → allow through
  }

  // Permission check (new)
  if (requiredPermission && user.role !== 'SUPER_ADMIN') {
    const [mod, action] = requiredPermission.split(':');
    if (mod && action && !hasPermission(mod, action)) {
      const dashboard = ROLE_DASHBOARDS[user.role] || '/dashboard';
      return <Navigate to={dashboard} replace />;
    }
  }

  return <Suspense fallback={skeleton}>{children}</Suspense>;
};
