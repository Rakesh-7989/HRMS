
// Use window.location.hostname dynamically so it works on localhost and LAN IPs automatically
const dynamicHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (dynamicHost !== 'localhost' && !dynamicHost.startsWith('192.') && !dynamicHost.startsWith('10.')
    ? `https://backend-e1os5l1mz-site-tracker-pro-s-projects.vercel.app/api`
    : `http://${dynamicHost}:5000/api`);
export const BACKEND_URL = import.meta.env.DEV ? '' : import.meta.env.VITE_STATIC_BASE_URL;
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

