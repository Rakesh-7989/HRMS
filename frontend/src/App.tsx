import { createBrowserRouter, createRoutesFromElements, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SubscriptionGuard } from '@/components/SubscriptionGuard';
import { RootLayout } from '@/layouts/RootLayout';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { ChangePasswordPage } from '@/pages/ChangePasswordPage';
import { PricingPage } from '@/pages/PricingPage';
import { PaymentSuccessPage } from '@/pages/PaymentSuccessPage';
import { PaymentFailurePage } from '@/pages/PaymentFailurePage';
import { BillingPortalPage } from '@/pages/BillingPortalPage';
import { SuperAdminDashboard } from '@/pages/dashboards/SuperAdminDashboard';
import { DBADashboard } from '@/pages/dashboards/DBADashboard';
import { AdminDashboard } from '@/pages/dashboards/AdminDashboard';
import { HRDashboard } from '@/pages/dashboards/HRDashboard';
import { ManagerDashboard } from '@/pages/dashboards/ManagerDashboard';
import { EmployeeDashboard } from '@/pages/dashboards/EmployeeDashboard';
import { SystemReportsPage } from '@/pages/dashboards/SystemReportsPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { AddEmployeePage } from '@/pages/AddEmployeePage';
import { AttendancePage } from '@/pages/AttendancePage';

import { LeavePage } from '@/pages/LeavePage';
import { DepartmentsPage } from '@/pages/DepartmentsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ActivityPage } from '@/pages/ActivityPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { TenantsPage } from '@/pages/TenantsPage';
import { DesignationsPage } from '@/pages/DesignationsPage';
import Payroll from '@/pages/Payroll';
import { PayrollDashboard } from '@/pages/payroll/PayrollDashboard';
import { RiverProcess } from '@/pages/payroll/RiverProcess';
import FnFSettlementsPage from '@/pages/payroll/FnFSettlementsPage';
import FnFSettlementDetailsPage from '@/pages/payroll/FnFSettlementDetailsPage';
import { ArrearsPage } from '@/pages/payroll/ArrearsPage';
import { AssetsPage } from '@/pages/AssetsPage';
import { AddAssetPage } from '@/pages/AddAssetPage';
import { AssetDetailsPage } from '@/pages/AssetDetailsPage';
import { ProjectsPage } from '@/pages/projects/ProjectsPage';
import { ClientsPage } from '@/pages/projects/ClientsPage';
import { TasksPage } from '@/pages/projects/TasksPage';

import { ProjectReportsPage } from '@/pages/projects/ProjectReportsPage';
import InboxPage from './pages/InboxPage';
import { ChatPage } from '@/pages/ChatPage';
import OrganisationPage from '@/pages/OrganisationPage';
import { LeaveSettingsPage } from '@/pages/LeaveSettingsPage';
import { HolidaysPage } from '@/pages/HolidaysPage';
import { EmployeeDetailsPage } from '@/pages/EmployeeDetailsPage';
import { EditEmployeePage } from '@/pages/EditEmployeePage';
import { EmployeeDocumentsPage } from '@/pages/EmployeeDocumentsPage';
import { SearchPage } from '@/pages/SearchPage';
import { LeaveBalancesPage } from '@/pages/LeaveBalancesPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { ShiftsPage } from '@/pages/organization/ShiftsPage';
import { PlansPage } from '@/pages/PlansPage';
import { CouponsPage } from '@/pages/CouponsPage';
import { RolesPermissionsPage } from '@/pages/RolesPermissionsPage';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_DASHBOARDS } from '@/utils/constants';

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
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />

      {/* Protected Dashboard Routes */}
      <Route
        path="/dashboard/system"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/dba"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <DBADashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/system/reports"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <SystemReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenants"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <TenantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/plans"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <PlansPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coupons"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <CouponsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/organization"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/hr"
        element={
          <ProtectedRoute allowedRoles={['HR', 'ADMIN']}>
            <HRDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/team"
        element={
          <ProtectedRoute allowedRoles={['MANAGER']}>
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/personal"
        element={
          <ProtectedRoute>
            <EmployeeDashboard />
          </ProtectedRoute>
        }
      />

      {/* Pricing Route */}
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/payment-success" element={<PaymentSuccessPage />} />
      <Route path="/payment-failure" element={<PaymentFailurePage />} />
      <Route path="/billing" element={<BillingPortalPage />} />

      {/* Super Admin Protected Routes */}
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />

      {/* DBA Dashboard (Separate from standard layouts) */}
      <Route
        path="/dba-control-panel-access"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <DBADashboard />
          </ProtectedRoute>
        }
      />


      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />

      {/* Feature Pages */}
      <Route
        path="/dashboard/employees"
        element={
          <ProtectedRoute requiredPermission="employees:view">
            <EmployeesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/employees/new"
        element={
          <ProtectedRoute requiredPermission="employees:create">
            <AddEmployeePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/employees/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}>
            <EmployeeDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/employees/:id/edit"
        element={
          <ProtectedRoute requiredPermission="employees:update">
            <EditEmployeePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/employees/:id/documents"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}>
            <EmployeeDocumentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute requiredPermission="attendance:view">
            <AttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inbox"
        element={
          <ProtectedRoute requiredPermission="chat:view">
            <InboxPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <SubscriptionGuard minPlan={3}>
              <ChatPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'SUPER_ADMIN']}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />



      <Route
        path="/organisation"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
            <OrganisationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organization/shifts"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
            <SubscriptionGuard minPlan={2}>
              <ShiftsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/leave"
        element={
          <ProtectedRoute requiredPermission="leave:view">
            <LeavePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leave/settings"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
            <LeaveSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leave/balances"
        element={
          <ProtectedRoute requiredPermission="leave:view">
            <LeaveBalancesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/holidays"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
            <HolidaysPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
            <DepartmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/designations"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
            <DesignationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <ProtectedRoute requiredPermission="assets:view">
            <SubscriptionGuard minPlan={3}>
              <AssetsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/new"
        element={
          <ProtectedRoute requiredPermission="assets:create">
            <AddAssetPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
            <SubscriptionGuard minPlan={3}>
              <AssetDetailsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/:id/edit"
        element={
          <ProtectedRoute requiredPermission="assets:update">
            <AddAssetPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />


      {/* Project Management Routes */}
      <Route
        path="/projects/reports"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}>
            <ProjectReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute requiredPermission="projects:view">
            <SubscriptionGuard minPlan={2}>
              <ProjectsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/clients"
        element={
          <ProtectedRoute requiredPermission="projects:manage">
            <SubscriptionGuard minPlan={3}>
              <ClientsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id/tasks"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
            <TasksPage />
          </ProtectedRoute>
        }
      />



      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN', 'MANAGER', 'EMPLOYEE']}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity"
        element={
          <ProtectedRoute requiredPermission="audit_logs:view">
            <ActivityPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/roles-permissions"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']} requiredPermission="roles:manage">
            <DashboardLayout title="Roles & Permissions">
              <RolesPermissionsPage />
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
              <Payroll />
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
                <PayrollDashboard />
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
              <RiverProcess />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/fnf"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN']}>
            <SubscriptionGuard minPlan={2}>
              <FnFSettlementsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/fnf/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN']}>
            <SubscriptionGuard minPlan={2}>
              <FnFSettlementDetailsPage />
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
                <ArrearsPage />
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


