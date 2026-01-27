export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  SUPER_ADMIN_DASHBOARD: '/dashboard/system',
  ADMIN_DASHBOARD: '/dashboard/organization',
  HR_DASHBOARD: '/dashboard/hr',
  MANAGER_DASHBOARD: '/dashboard/team',
  EMPLOYEE_DASHBOARD: '/dashboard/personal',
} as const;

export const ROLE_DASHBOARDS: Record<string, string> = {
  SUPER_ADMIN: ROUTES.SUPER_ADMIN_DASHBOARD,
  ADMIN: ROUTES.ADMIN_DASHBOARD,
  HR: ROUTES.HR_DASHBOARD,
  MANAGER: ROUTES.MANAGER_DASHBOARD,
  EMPLOYEE: ROUTES.EMPLOYEE_DASHBOARD,
};

