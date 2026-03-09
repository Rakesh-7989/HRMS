import React, { Suspense } from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SubscriptionGuard } from '@/components/SubscriptionGuard';
import { RootLayout } from '@/layouts/RootLayout';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_DASHBOARDS } from '@/utils/constants';

// Lazy-load all pages for code splitting — only the visited page's JS is downloaded
const LandingPage = React.lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = React.lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = React.lazy(() => import('@/pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = React.lazy(() => import('@/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = React.lazy(() => import('@/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const ChangePasswordPage = React.lazy(() => import('@/pages/ChangePasswordPage').then(m => ({ default: m.ChangePasswordPage })));
const PricingPage = React.lazy(() => import('@/pages/PricingPage').then(m => ({ default: m.PricingPage })));
const PaymentSuccessPage = React.lazy(() => import('@/pages/PaymentSuccessPage').then(m => ({ default: m.PaymentSuccessPage })));
const PaymentFailurePage = React.lazy(() => import('@/pages/PaymentFailurePage').then(m => ({ default: m.PaymentFailurePage })));
const BillingPortalPage = React.lazy(() => import('@/pages/BillingPortalPage').then(m => ({ default: m.BillingPortalPage })));

// Dashboards
const SuperAdminDashboard = React.lazy(() => import('@/pages/dashboards/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const DBADashboard = React.lazy(() => import('@/pages/dashboards/DBADashboard').then(m => ({ default: m.DBADashboard })));
const AdminDashboard = React.lazy(() => import('@/pages/dashboards/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const HRDashboard = React.lazy(() => import('@/pages/dashboards/HRDashboard').then(m => ({ default: m.HRDashboard })));
const ManagerDashboard = React.lazy(() => import('@/pages/dashboards/ManagerDashboard').then(m => ({ default: m.ManagerDashboard })));
const EmployeeDashboard = React.lazy(() => import('@/pages/dashboards/EmployeeDashboard').then(m => ({ default: m.EmployeeDashboard })));
const SystemReportsPage = React.lazy(() => import('@/pages/dashboards/SystemReportsPage').then(m => ({ default: m.SystemReportsPage })));

// Employee pages
const EmployeesPage = React.lazy(() => import('@/pages/EmployeesPage').then(m => ({ default: m.EmployeesPage })));
const AddEmployeePage = React.lazy(() => import('@/pages/AddEmployeePage').then(m => ({ default: m.AddEmployeePage })));
const EmployeeDetailsPage = React.lazy(() => import('@/pages/EmployeeDetailsPage').then(m => ({ default: m.EmployeeDetailsPage })));
const EditEmployeePage = React.lazy(() => import('@/pages/EditEmployeePage').then(m => ({ default: m.EditEmployeePage })));
const EmployeeDocumentsPage = React.lazy(() => import('@/pages/EmployeeDocumentsPage').then(m => ({ default: m.EmployeeDocumentsPage })));

// Core feature pages
const AttendancePage = React.lazy(() => import('@/pages/AttendancePage').then(m => ({ default: m.AttendancePage })));
const LeavePage = React.lazy(() => import('@/pages/LeavePage').then(m => ({ default: m.LeavePage })));
const LeaveSettingsPage = React.lazy(() => import('@/pages/LeaveSettingsPage').then(m => ({ default: m.LeaveSettingsPage })));
const LeaveBalancesPage = React.lazy(() => import('@/pages/LeaveBalancesPage').then(m => ({ default: m.LeaveBalancesPage })));
const HolidaysPage = React.lazy(() => import('@/pages/HolidaysPage').then(m => ({ default: m.HolidaysPage })));
const CalendarPage = React.lazy(() => import('@/pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
const DepartmentsPage = React.lazy(() => import('@/pages/DepartmentsPage').then(m => ({ default: m.DepartmentsPage })));
const DesignationsPage = React.lazy(() => import('@/pages/DesignationsPage').then(m => ({ default: m.DesignationsPage })));
const ProfilePage = React.lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const ReportsPage = React.lazy(() => import('@/pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ActivityPage = React.lazy(() => import('@/pages/ActivityPage').then(m => ({ default: m.ActivityPage })));
const SearchPage = React.lazy(() => import('@/pages/SearchPage').then(m => ({ default: m.SearchPage })));
const NotificationsPage = React.lazy(() => import('@/pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const TenantsPage = React.lazy(() => import('@/pages/TenantsPage').then(m => ({ default: m.TenantsPage })));
const PlansPage = React.lazy(() => import('@/pages/PlansPage').then(m => ({ default: m.PlansPage })));
const CouponsPage = React.lazy(() => import('@/pages/CouponsPage').then(m => ({ default: m.CouponsPage })));
const RolesPermissionsPage = React.lazy(() => import('@/pages/RolesPermissionsPage').then(m => ({ default: m.RolesPermissionsPage })));
const OrganisationPage = React.lazy(() => import('@/pages/OrganisationPage'));
const ShiftsPage = React.lazy(() => import('@/pages/organization/ShiftsPage').then(m => ({ default: m.ShiftsPage })));
const InboxPage = React.lazy(() => import('./pages/InboxPage'));
const ChatPage = React.lazy(() => import('@/pages/ChatPage').then(m => ({ default: m.ChatPage })));

// Payroll
const Payroll = React.lazy(() => import('@/pages/Payroll'));
const PayrollDashboard = React.lazy(() => import('@/pages/payroll/PayrollDashboard').then(m => ({ default: m.PayrollDashboard })));
const RiverProcess = React.lazy(() => import('@/pages/payroll/RiverProcess').then(m => ({ default: m.RiverProcess })));
const FnFSettlementsPage = React.lazy(() => import('@/pages/payroll/FnFSettlementsPage'));
const FnFSettlementDetailsPage = React.lazy(() => import('@/pages/payroll/FnFSettlementDetailsPage'));
const ArrearsPage = React.lazy(() => import('@/pages/payroll/ArrearsPage').then(m => ({ default: m.ArrearsPage })));

// Assets
const AssetsPage = React.lazy(() => import('@/pages/AssetsPage').then(m => ({ default: m.AssetsPage })));
const AddAssetPage = React.lazy(() => import('@/pages/AddAssetPage').then(m => ({ default: m.AddAssetPage })));
const AssetDetailsPage = React.lazy(() => import('@/pages/AssetDetailsPage').then(m => ({ default: m.AssetDetailsPage })));

// Projects
const ProjectsPage = React.lazy(() => import('@/pages/projects/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const ClientsPage = React.lazy(() => import('@/pages/projects/ClientsPage').then(m => ({ default: m.ClientsPage })));
const TasksPage = React.lazy(() => import('@/pages/projects/TasksPage').then(m => ({ default: m.TasksPage })));
const ProjectReportsPage = React.lazy(() => import('@/pages/projects/ProjectReportsPage').then(m => ({ default: m.ProjectReportsPage })));

// DashboardLayout (eagerly loaded since it wraps most pages)
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Loading fallback for lazy-loaded pages
const PageLoader = () => (
  <div className="h-screen flex items-center justify-center bg-[var(--background)]">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-800 rounded-full animate-spin border-t-indigo-600" />
    </div>
  </div>
);

// Smart redirect component
const DashboardRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Use the role mapping to find the correct dashboard, default to personal if not found
  const targetDashboard = ROLE_DASHBOARDS[user.role] || '/dashboard/personal';
  return <Navigate to={targetDashboard} replace />;
};



// Router Configuration
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      {/* Public Routes */}
      <Route path="/" element={<Suspense fallback={<PageLoader />}><LandingPage /></Suspense>} />
      <Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
      <Route path="/register" element={<Suspense fallback={<PageLoader />}><RegisterPage /></Suspense>} />
      <Route path="/forgot-password" element={<Suspense fallback={<PageLoader />}><ForgotPasswordPage /></Suspense>} />
      <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense>} />
      <Route path="/change-password" element={<Suspense fallback={<PageLoader />}><ChangePasswordPage /></Suspense>} />

      {/* Protected Dashboard Routes */}
      <Route
        path="/dashboard/system"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <Suspense fallback={<PageLoader />}><SuperAdminDashboard /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/dba"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <Suspense fallback={<PageLoader />}><DBADashboard /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/system/reports"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <Suspense fallback={<PageLoader />}><SystemReportsPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenants"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <Suspense fallback={<PageLoader />}><TenantsPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/plans"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <Suspense fallback={<PageLoader />}><PlansPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/coupons"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <Suspense fallback={<PageLoader />}><CouponsPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/organization"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
            <Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/hr"
        element={
          <ProtectedRoute allowedRoles={['HR', 'ADMIN']}>
            <Suspense fallback={<PageLoader />}><HRDashboard /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/team"
        element={
          <ProtectedRoute allowedRoles={['MANAGER']}>
            <Suspense fallback={<PageLoader />}><ManagerDashboard /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/personal"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}><EmployeeDashboard /></Suspense>
          </ProtectedRoute>
        }
      />

      {/* Pricing Route */}
      <Route path="/pricing" element={<Suspense fallback={<PageLoader />}><PricingPage /></Suspense>} />
      <Route path="/payment-success" element={<Suspense fallback={<PageLoader />}><PaymentSuccessPage /></Suspense>} />
      <Route path="/payment-failure" element={<Suspense fallback={<PageLoader />}><PaymentFailurePage /></Suspense>} />
      <Route path="/billing" element={<Suspense fallback={<PageLoader />}><BillingPortalPage /></Suspense>} />

      {/* Super Admin Protected Routes */}
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}><SearchPage /></Suspense>
          </ProtectedRoute>
        }
      />

      {/* DBA Dashboard (Separate from standard layouts) */}
      <Route
        path="/dba-control-panel-access"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <Suspense fallback={<PageLoader />}><DBADashboard /></Suspense>
          </ProtectedRoute>
        }
      />


      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>
          </ProtectedRoute>
        }
      />

      {/* Feature Pages */}
      <Route
        path="/dashboard/employees"
        element={
          <ProtectedRoute requiredPermission="employees:view">
            <Suspense fallback={<PageLoader />}><EmployeesPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/employees/new"
        element={
          <ProtectedRoute requiredPermission="employees:create">
            <Suspense fallback={<PageLoader />}><AddEmployeePage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/employees/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}>
            <Suspense fallback={<PageLoader />}><EmployeeDetailsPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/employees/:id/edit"
        element={
          <ProtectedRoute requiredPermission="employees:update">
            <Suspense fallback={<PageLoader />}><EditEmployeePage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/employees/:id/documents"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}>
            <Suspense fallback={<PageLoader />}><EmployeeDocumentsPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute requiredPermission="attendance:view">
            <Suspense fallback={<PageLoader />}><AttendancePage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
            <Suspense fallback={<PageLoader />}><CalendarPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inbox"
        element={
          <ProtectedRoute requiredPermission="chat:view">
            <Suspense fallback={<PageLoader />}><InboxPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <SubscriptionGuard minPlan={3}>
              <Suspense fallback={<PageLoader />}><ChatPage /></Suspense>
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'SUPER_ADMIN']}>
            <Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>
          </ProtectedRoute>
        }
      />



      <Route
        path="/organisation"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
            <Suspense fallback={<PageLoader />}><OrganisationPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/organization/shifts"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
            <SubscriptionGuard minPlan={2}>
              <Suspense fallback={<PageLoader />}><ShiftsPage /></Suspense>
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/leave"
        element={
          <ProtectedRoute requiredPermission="leave:view">
            <Suspense fallback={<PageLoader />}><LeavePage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leave/settings"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
            <Suspense fallback={<PageLoader />}><LeaveSettingsPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leave/balances"
        element={
          <ProtectedRoute requiredPermission="leave:view">
            <Suspense fallback={<PageLoader />}><LeaveBalancesPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/holidays"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
            <Suspense fallback={<PageLoader />}><HolidaysPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
            <Suspense fallback={<PageLoader />}><DepartmentsPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/designations"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
            <Suspense fallback={<PageLoader />}><DesignationsPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <ProtectedRoute requiredPermission="assets:view">
            <SubscriptionGuard minPlan={3}>
              <Suspense fallback={<PageLoader />}><AssetsPage /></Suspense>
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/new"
        element={
          <ProtectedRoute requiredPermission="assets:create">
            <Suspense fallback={<PageLoader />}><AddAssetPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
            <SubscriptionGuard minPlan={3}>
              <Suspense fallback={<PageLoader />}><AssetDetailsPage /></Suspense>
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/:id/edit"
        element={
          <ProtectedRoute requiredPermission="assets:update">
            <Suspense fallback={<PageLoader />}><AddAssetPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>
          </ProtectedRoute>
        }
      />


      {/* Project Management Routes */}
      <Route
        path="/projects/reports"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}>
            <Suspense fallback={<PageLoader />}><ProjectReportsPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute requiredPermission="projects:view">
            <SubscriptionGuard minPlan={2}>
              <Suspense fallback={<PageLoader />}><ProjectsPage /></Suspense>
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/clients"
        element={
          <ProtectedRoute requiredPermission="projects:manage">
            <SubscriptionGuard minPlan={3}>
              <Suspense fallback={<PageLoader />}><ClientsPage /></Suspense>
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id/tasks"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
            <Suspense fallback={<PageLoader />}><TasksPage /></Suspense>
          </ProtectedRoute>
        }
      />



      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN', 'MANAGER', 'EMPLOYEE']}>
            <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity"
        element={
          <ProtectedRoute requiredPermission="audit_logs:view">
            <Suspense fallback={<PageLoader />}><ActivityPage /></Suspense>
          </ProtectedRoute>
        }
      />

      <Route
        path="/roles-permissions"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']} requiredPermission="roles:manage">
            <DashboardLayout title="Roles & Permissions">
              <Suspense fallback={<PageLoader />}><RolesPermissionsPage /></Suspense>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Payroll Route */}
      <Route
        path="/payroll"
        element={
          <ProtectedRoute requiredPermission="payroll:view">
            <SubscriptionGuard minPlan={2}>
              <Suspense fallback={<PageLoader />}><Payroll /></Suspense>
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/dashboard"
        element={
          <ProtectedRoute requiredPermission="payroll:manage">
            <SubscriptionGuard minPlan={2}>
              <DashboardLayout title="Payroll Command Center">
                <Suspense fallback={<PageLoader />}><PayrollDashboard /></Suspense>
              </DashboardLayout>
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/process/:runId"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN']}>
            <SubscriptionGuard minPlan={2}>
              <Suspense fallback={<PageLoader />}><RiverProcess /></Suspense>
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/fnf"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN']}>
            <SubscriptionGuard minPlan={2}>
              <Suspense fallback={<PageLoader />}><FnFSettlementsPage /></Suspense>
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/fnf/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN']}>
            <SubscriptionGuard minPlan={2}>
              <Suspense fallback={<PageLoader />}><FnFSettlementDetailsPage /></Suspense>
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/arrears"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN']}>
            <SubscriptionGuard minPlan={2}>
              <DashboardLayout title="Arrears Management">
                <Suspense fallback={<PageLoader />}><ArrearsPage /></Suspense>
              </DashboardLayout>
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      {/* Redirect /dashboard to appropriate role dashboard */}
      <Route path="/dashboard" element={<DashboardRedirect />} />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  )
);

export default router;
