import { createBrowserRouter, createRoutesFromElements, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
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
import { AssetsPage } from '@/pages/AssetsPage';
import { AddAssetPage } from '@/pages/AddAssetPage';
import { AssetDetailsPage } from '@/pages/AssetDetailsPage';
import { AssetReturnPage } from '@/pages/AssetReturnPage';
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
import { AssetRequestsPage } from '@/pages/AssetRequestsPage';
import { SearchPage } from '@/pages/SearchPage';
import { LeaveBalancesPage } from '@/pages/LeaveBalancesPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { ShiftsPage } from '@/pages/organization/ShiftsPage';
import { PlansPage } from '@/pages/PlansPage';
import { CouponsPage } from '@/pages/CouponsPage';
import { RolesPage } from '@/pages/RolesPage';
import { useAuth } from '@/contexts/AuthContext';

// Smart redirect component
const DashboardRedirect = () => {
  const { user, loading, hasPermission } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (hasPermission('platform.manage_tenants')) return <Navigate to="/dashboard/system" replace />;
  if (hasPermission('view_admin_dashboard')) return <Navigate to="/dashboard/organization" replace />;
  if (hasPermission('view_hr_reports')) return <Navigate to="/dashboard/hr" replace />;
  if (hasPermission('approve_attendance_regularization')) return <Navigate to="/dashboard/team" replace />;
  return <Navigate to="/dashboard/personal" replace />;
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
          <ProtectedRoute requiredPermissions={['platform.manage_tenants']}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/dba"
        element={
          <ProtectedRoute requiredRoles={['SUPER_ADMIN']} requiredPermissions={['platform.manage_tenants']}>
            <DBADashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/system/reports"
        element={
          <ProtectedRoute requiredPermissions={['platform.manage_tenants']}>
            <SystemReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenants"
        element={
          <ProtectedRoute requiredPermissions={['platform.manage_tenants']}>
            <TenantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/plans"
        element={
          <ProtectedRoute requiredPermissions={['platform.manage_tenants']}>
            <PlansPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coupons"
        element={
          <ProtectedRoute requiredPermissions={['platform.manage_tenants']}>
            <CouponsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <ProtectedRoute requiredPermissions={['manage_roles']}>
            <RolesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/organization"
        element={
          <ProtectedRoute requiredPermissions={['view_admin_dashboard']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/hr"
        element={
          <ProtectedRoute requiredPermissions={['view_hr_reports']}>
            <HRDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/team"
        element={
          <ProtectedRoute requiredPermissions={['approve_attendance_regularization']}>
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
          <ProtectedRoute requiredRoles={['SUPER_ADMIN']} requiredPermissions={['platform.manage_tenants']}>
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
          <ProtectedRoute requiredPermissions={['view_all_employees']}>
            <EmployeesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/employees/new"
        element={
          <ProtectedRoute requiredPermissions={['create_employee']}>
            <AddEmployeePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/employees/:id"
        element={
          <ProtectedRoute requiredPermissions={['view_all_employees']}>
            <EmployeeDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/employees/:id/edit"
        element={
          <ProtectedRoute requiredPermissions={['edit_employee']}>
            <EditEmployeePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/employees/:id/documents"
        element={
          <ProtectedRoute requiredPermissions={['view_all_employees']}>
            <EmployeeDocumentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute requiredPermissions={['view_own_attendance']}>
            <AttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inbox"
        element={
          <ProtectedRoute>
            <InboxPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />

      {/* Leave, Department, Designation, Assets, Profile routes defined below with full sub-routes */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute requiredPermissions={['view_hr_reports', 'view_all_payroll']}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />


      <Route
        path="/organisation"
        element={
          <ProtectedRoute requiredPermissions={['view_organization_structure']}>
            <OrganisationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organization/shifts"
        element={
          <ProtectedRoute requiredPermissions={['manage_shifts']}>
            <ShiftsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/leave"
        element={
          <ProtectedRoute requiredPermissions={['view_own_leave']}>
            <LeavePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leave/settings"
        element={
          <ProtectedRoute requiredPermissions={['manage_leave_policies']}>
            <LeaveSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leave/balances"
        element={
          <ProtectedRoute requiredPermissions={['manage_leave_balances']}>
            <LeaveBalancesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/holidays"
        element={
          <ProtectedRoute>
            <HolidaysPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments"
        element={
          <ProtectedRoute requiredPermissions={['manage_departments']}>
            <DepartmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/designations"
        element={
          <ProtectedRoute requiredPermissions={['manage_designations']}>
            <DesignationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <ProtectedRoute requiredPermissions={['view_assets']}>
            <AssetsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/new"
        element={
          <ProtectedRoute requiredPermissions={['manage_all_assets']}>
            <AddAssetPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/:id"
        element={
          <ProtectedRoute requiredPermissions={['view_assets']}>
            <AssetDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/:id/edit"
        element={
          <ProtectedRoute requiredPermissions={['manage_all_assets']}>
            <AddAssetPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/:id/return"
        element={
          <ProtectedRoute requiredPermissions={['manage_all_assets']}>
            <AssetReturnPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/requests"
        element={
          <ProtectedRoute requiredPermissions={['request_asset']}>
            <AssetRequestsPage />
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
          <ProtectedRoute requiredPermissions={['manage_all_projects', 'view_hr_reports']}>
            <ProjectReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute requiredPermissions={['view_projects']}>
            <ProjectsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/clients"
        element={
          <ProtectedRoute requiredPermissions={['manage_all_projects']}>
            <ClientsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id/tasks"
        element={
          <ProtectedRoute requiredPermissions={['view_projects']}>
            <TasksPage />
          </ProtectedRoute>
        }
      />



      <Route
        path="/settings"
        element={
          <ProtectedRoute requiredPermissions={['manage_roles']}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity"
        element={
          <ProtectedRoute requiredPermissions={['view_audit_logs', 'manage_roles', 'view_admin_dashboard', 'view_hr_reports']}>
            <ActivityPage />
          </ProtectedRoute>
        }
      />
      {/* Payroll Route */}
      <Route
        path="/Payroll"
        element={
          <ProtectedRoute requiredPermissions={['view_own_payslip', 'view_all_payroll', 'manage_payroll_components']}>
            <Payroll />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/dashboard"
        element={
          <ProtectedRoute requiredPermissions={['manage_payroll_components']}>
            <DashboardLayout title="Payroll Command Center">
              <PayrollDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/process/:runId"
        element={
          <ProtectedRoute requiredPermissions={['manage_payroll_components']}>
            <RiverProcess />
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
