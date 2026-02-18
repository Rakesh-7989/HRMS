
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
if (!import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL) {
  console.warn('[HRMS] VITE_API_BASE_URL is not set — defaulting to localhost. Set this in your .env for production.');
}
export const BACKEND_URL = import.meta.env.DEV ? '' : API_BASE_URL.replace('/api', '');

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  SUPER_ADMIN_DASHBOARD: '/dashboard/system',
  ADMIN_DASHBOARD: '/dashboard/organization',
  REPORTS_DASHBOARD: '/dashboard/hr',
  TEAM_DASHBOARD: '/dashboard/team',
  EMPLOYEE_DASHBOARD: '/dashboard/personal',
} as const;

export const CHART_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#f43f5e', // Rose
];

export const DASHBOARD_GRADIENTS = {
  purple: ['#6366f1', '#8b5cf6'],
  blue: ['#3b82f6', '#06b6d4'],
  green: ['#10b981', '#34d399'],
  orange: ['#f59e0b', '#fb923c'],
  pink: ['#ec4899', '#f472b6'],
};
