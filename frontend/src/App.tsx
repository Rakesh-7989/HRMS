import React, { Suspense } from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
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
const AboutPage = React.lazy(() => import('@/pages/AboutPage').then(m => ({ default: m.AboutPage })));
const FeaturesPage = React.lazy(() => import('@/pages/FeaturesPage').then(m => ({ default: m.FeaturesPage })));
const BlogListPage = React.lazy(() => import('@/pages/BlogPage').then(m => ({ default: m.BlogListPage })));
const BlogPostPage = React.lazy(() => import('@/pages/BlogPage').then(m => ({ default: m.BlogPostPage })));
const CareersPage = React.lazy(() => import('@/pages/CareersPage').then(m => ({ default: m.CareersPage })));
const PaymentSuccessPage = React.lazy(() => import('@/pages/PaymentSuccessPage').then(m => ({ default: m.PaymentSuccessPage })));
const PaymentFailurePage = React.lazy(() => import('@/pages/PaymentFailurePage').then(m => ({ default: m.PaymentFailurePage })));
const CompletePaymentPage = React.lazy(() => import('@/pages/CompletePaymentPage').then(m => ({ default: m.CompletePaymentPage })));
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
const ShiftRosterPage = React.lazy(() => import('@/pages/organization/ShiftRosterPage').then(m => ({ default: m.ShiftRosterPage })));
const InboxPage = React.lazy(() => import('./pages/InboxPage'));
const ChatPage = React.lazy(() => import('@/pages/ChatPage').then(m => ({ default: m.ChatPage })));
const PerformancePage = React.lazy(() => import('@/pages/performance/PerformancePage').then(m => ({ default: m.PerformancePage })));
const RecruitmentPage = React.lazy(() => import('@/pages/recruitment/RecruitmentPage').then(m => ({ default: m.RecruitmentPage })));
const BonusPage = React.lazy(() => import('@/pages/bonus/BonusPage').then(m => ({ default: m.BonusPage })));
const EngagementPage = React.lazy(() => import('@/pages/engagement/EngagementPage').then(m => ({ default: m.EngagementPage })));
const ComplianceReportsPage = React.lazy(() => import('@/pages/compliance/ComplianceReportsPage').then(m => ({ default: m.ComplianceReportsPage })));
const AIInsightsPage = React.lazy(() => import('@/pages/ai/AIInsightsPage').then(m => ({ default: m.AIInsightsPage })));

// Payroll
const Payroll = React.lazy(() => import('@/pages/Payroll'));
const PayrollDashboard = React.lazy(() => import('@/pages/payroll/PayrollDashboard').then(m => ({ default: m.PayrollDashboard })));
const RiverProcess = React.lazy(() => import('@/pages/payroll/RiverProcess').then(m => ({ default: m.RiverProcess })));
const FnFSettlementsPage = React.lazy(() => import('@/pages/payroll/FnFSettlementsPage'));
const FnFSettlementDetailsPage = React.lazy(() => import('@/pages/payroll/FnFSettlementDetailsPage'));
const ArrearsPage = React.lazy(() => import('@/pages/payroll/ArrearsPage').then(m => ({ default: m.ArrearsPage })));
const PayRunPage = React.lazy(() => import('@/pages/payroll/PayRunPage'));
const SalaryTemplatesPage = React.lazy(() => import('@/pages/payroll/SalaryTemplatesPage'));
const StatutoryPage = React.lazy(() => import('@/pages/payroll/StatutoryPage'));
const TaxDeclarationsPage = React.lazy(() => import('@/pages/payroll/TaxDeclarationsPage'));

// Payroll standalone pages
const PayslipsPage = React.lazy(() => import('@/pages/PayslipsPage').then(m => ({ default: m.PayslipsPage })));
const SalaryDetailsPage = React.lazy(() => import('@/pages/SalaryDetailsPage'));
const ExpensesPage = React.lazy(() => import('@/pages/ExpensesPage'));
const LoansPage = React.lazy(() => import('@/pages/LoansPage'));
const LoanTypesPage = React.lazy(() => import('@/pages/LoanTypesPage'));
const MerchantsPage = React.lazy(() => import('@/pages/MerchantsPage'));
const CostCentersPage = React.lazy(() => import('@/pages/CostCentersPage'));
const SubscriptionPage = React.lazy(() => import('@/pages/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })));

// Asset sub-pages
const AssetRequestsPage = React.lazy(() => import('@/pages/AssetRequestsPage').then(m => ({ default: m.AssetRequestsPage })));
const AssetReturnPage = React.lazy(() => import('@/pages/AssetReturnPage').then(m => ({ default: m.AssetReturnPage })));

// Assets
const AssetsPage = React.lazy(() => import('@/pages/AssetsPage').then(m => ({ default: m.AssetsPage })));
const AddAssetPage = React.lazy(() => import('@/pages/AddAssetPage').then(m => ({ default: m.AddAssetPage })));
const AssetDetailsPage = React.lazy(() => import('@/pages/AssetDetailsPage').then(m => ({ default: m.AssetDetailsPage })));

// Projects
const ProjectsPage = React.lazy(() => import('@/pages/projects/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const ClientsPage = React.lazy(() => import('@/pages/projects/ClientsPage').then(m => ({ default: m.ClientsPage })));
const TasksPage = React.lazy(() => import('@/pages/projects/TasksPage').then(m => ({ default: m.TasksPage })));
const ProjectReportsPage = React.lazy(() => import('@/pages/projects/ProjectReportsPage').then(m => ({ default: m.ProjectReportsPage })));
const TimesheetPage = React.lazy(() => import('@/pages/projects/TimesheetPage').then(m => ({ default: m.TimesheetPage })));

// DashboardLayout (eagerly loaded since it wraps most pages)
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SubscriptionGuard } from './components/SubscriptionGuard';

import {
  DashboardSkeleton,
  TableSkeleton,
  TabbedSkeleton,
  FormSkeleton,
  AuthSkeleton,
  MinimalSkeleton
} from '@/components/ui/PageSkeleton';

// Loading fallback for lazy-loaded pages




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
      <Route
        path="/"
        element={
          <Suspense fallback={
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center animate-pulse">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-gray-800" />
                <div className="w-32 h-4 rounded-lg bg-gray-200 dark:bg-gray-800" />
              </div>
            </div>
          }>
            <LandingPage />
          </Suspense>
        }
      />
      <Route path="/login" element={<Suspense fallback={<AuthSkeleton />}><LoginPage /></Suspense>} />
      <Route path="/register" element={<Suspense fallback={<AuthSkeleton />}><RegisterPage /></Suspense>} />
      <Route path="/forgot-password" element={<Suspense fallback={<AuthSkeleton />}><ForgotPasswordPage /></Suspense>} />
      <Route path="/reset-password" element={<Suspense fallback={<AuthSkeleton />}><ResetPasswordPage /></Suspense>} />
      <Route path="/change-password" element={<Suspense fallback={<AuthSkeleton />}><ChangePasswordPage /></Suspense>} />

      {/* Protected Dashboard Routes */}
      <Route
        path="/dashboard/system"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']} fallback={<DashboardSkeleton />}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/dba"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']} fallback={<DashboardSkeleton />}>
            <DBADashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/system/reports"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']} fallback={<DashboardSkeleton />}>
            <SystemReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenants"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']} fallback={<TableSkeleton />}>
            <TenantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/plans"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']} fallback={<TableSkeleton />}>
            <PlansPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coupons"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']} fallback={<TableSkeleton />}>
            <CouponsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/organization"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']} fallback={<DashboardSkeleton />}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/hr"
        element={
          <ProtectedRoute allowedRoles={['HR', 'ADMIN']} fallback={<DashboardSkeleton />}>
            <HRDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/team"
        element={
          <ProtectedRoute allowedRoles={['MANAGER']} fallback={<DashboardSkeleton />}>
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/personal"
        element={
          <ProtectedRoute fallback={<DashboardSkeleton />}>
            <EmployeeDashboard />
          </ProtectedRoute>
        }
      />

      {/* Public Marketing Routes */}
      <Route path="/pricing" element={<Suspense fallback={<AuthSkeleton />}><PricingPage /></Suspense>} />
      <Route path="/features" element={<Suspense fallback={<AuthSkeleton />}><FeaturesPage /></Suspense>} />
      <Route path="/blog" element={<Suspense fallback={<AuthSkeleton />}><BlogListPage /></Suspense>} />
      <Route path="/blog/:slug" element={<Suspense fallback={<AuthSkeleton />}><BlogPostPage /></Suspense>} />
      <Route path="/careers" element={<Suspense fallback={<AuthSkeleton />}><CareersPage /></Suspense>} />
      <Route path="/about" element={<Suspense fallback={<AuthSkeleton />}><AboutPage /></Suspense>} />
      <Route path="/payment-success" element={<Suspense fallback={<AuthSkeleton />}><PaymentSuccessPage /></Suspense>} />
      <Route path="/payment-failure" element={<Suspense fallback={<AuthSkeleton />}><PaymentFailurePage /></Suspense>} />
      <Route path="/complete-payment" element={<Suspense fallback={<AuthSkeleton />}><CompletePaymentPage /></Suspense>} />
      <Route path="/billing" element={<Suspense fallback={<AuthSkeleton />}><BillingPortalPage /></Suspense>} />

      {/* Super Admin Protected Routes */}
      <Route
        path="/search"
        element={
          <ProtectedRoute fallback={<MinimalSkeleton />}>
            <SearchPage />
          </ProtectedRoute>
        }
      />

      {/* DBA Dashboard (Separate from standard layouts) */}
      <Route
        path="/dba-control-panel-access"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']} fallback={<DashboardSkeleton />}>
            <DBADashboard />
          </ProtectedRoute>
        }
      />


      <Route
        path="/notifications"
        element={
          <ProtectedRoute fallback={<MinimalSkeleton />}>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />

      {/* Feature Pages */}
      <Route
        path="/dashboard/employees"
        element={
          <ProtectedRoute requiredPermission="employees:view" fallback={<TableSkeleton />}>
            <EmployeesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/employees/new"
        element={
          <ProtectedRoute requiredPermission="employees:create" fallback={<FormSkeleton />}>
            <AddEmployeePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/employees/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']} fallback={<FormSkeleton />}>
            <EmployeeDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/employees/:id/edit"
        element={
          <ProtectedRoute requiredPermission="employees:update" fallback={<FormSkeleton />}>
            <EditEmployeePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/employees/:id/documents"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']} fallback={<FormSkeleton />}>
            <EmployeeDocumentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute requiredPermission="attendance:view" fallback={<TabbedSkeleton />}>
            <AttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']} fallback={<TabbedSkeleton />}>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inbox"
        element={
          <ProtectedRoute requiredPermission="chat:view" fallback={<MinimalSkeleton />}>
            <InboxPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute fallback={<MinimalSkeleton />}>
            <SubscriptionGuard minPlan={3}>
              <ChatPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'SUPER_ADMIN']} fallback={<TabbedSkeleton />}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />



      <Route
        path="/organisation"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']} fallback={<TabbedSkeleton />}>
            <OrganisationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organization/shifts"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']} fallback={<TabbedSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <ShiftsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/organization/shift-roster"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']} fallback={<TableSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <DashboardLayout title="Shift Roster">
                <ShiftRosterPage />
              </DashboardLayout>
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/leave"
        element={
          <ProtectedRoute requiredPermission="leave:view" fallback={<TabbedSkeleton />}>
            <LeavePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leave/settings"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']} fallback={<TabbedSkeleton />}>
            <LeaveSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leave/balances"
        element={
          <ProtectedRoute requiredPermission="leave:view" fallback={<TabbedSkeleton />}>
            <LeaveBalancesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/holidays"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']} fallback={<TableSkeleton />}>
            <HolidaysPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']} fallback={<TableSkeleton />}>
            <DepartmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/designations"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']} fallback={<TableSkeleton />}>
            <DesignationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <ProtectedRoute requiredPermission="assets:view" fallback={<TableSkeleton />}>
            <SubscriptionGuard minPlan={3}>
              <AssetsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/new"
        element={
          <ProtectedRoute requiredPermission="assets:create" fallback={<FormSkeleton />}>
            <AddAssetPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']} fallback={<FormSkeleton />}>
            <SubscriptionGuard minPlan={3}>
              <AssetDetailsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/:id/edit"
        element={
          <ProtectedRoute requiredPermission="assets:update" fallback={<FormSkeleton />}>
            <AddAssetPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/requests"
        element={
          <ProtectedRoute requiredPermission="assets:view" fallback={<TableSkeleton />}>
            <SubscriptionGuard minPlan={3}>
              <AssetRequestsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/return"
        element={
          <ProtectedRoute requiredPermission="assets:view" fallback={<FormSkeleton />}>
            <SubscriptionGuard minPlan={3}>
              <AssetReturnPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute fallback={<FormSkeleton />}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscription"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']} fallback={<FormSkeleton />}>
            <SubscriptionPage />
          </ProtectedRoute>
        }
      />

      {/* Project Management Routes */}
      <Route
        path="/projects/reports"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']} fallback={<TabbedSkeleton />}>
            <ProjectReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute requiredPermission="projects:view" fallback={<TableSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <ProjectsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/clients"
        element={
          <ProtectedRoute requiredPermission="projects:manage" fallback={<TableSkeleton />}>
            <SubscriptionGuard minPlan={3}>
              <ClientsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id/tasks"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']} fallback={<TableSkeleton />}>
            <TasksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/timesheets"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']} fallback={<TabbedSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <TimesheetPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />



      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN', 'MANAGER', 'EMPLOYEE']} fallback={<TabbedSkeleton />}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity"
        element={
          <ProtectedRoute requiredPermission="audit_logs:view" fallback={<TableSkeleton />}>
            <ActivityPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/roles-permissions"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']} requiredPermission="roles:manage" fallback={<FormSkeleton />}>
            <DashboardLayout title="Roles & Permissions">
              <RolesPermissionsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/performance"
        element={
          <ProtectedRoute requiredPermission="performance:view" fallback={<TabbedSkeleton />}>
            <SubscriptionGuard minPlan={3}>
              <PerformancePage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruitment"
        element={
          <ProtectedRoute requiredPermission="recruitment:view" fallback={<TabbedSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <RecruitmentPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bonus"
        element={
          <ProtectedRoute requiredPermission="bonus:view" fallback={<TabbedSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <BonusPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/engagement"
        element={
          <ProtectedRoute requiredPermission="engagement:view" fallback={<TabbedSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <EngagementPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/compliance"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN']} fallback={<TabbedSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <ComplianceReportsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-insights"
        element={
          <ProtectedRoute requiredPermission="ai:view" fallback={<DashboardSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <AIInsightsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />

      {/* Payroll Route */}
      <Route
        path="/payroll"
        element={
          <ProtectedRoute requiredPermission="payroll:view" fallback={<TabbedSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <Payroll />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/dashboard"
        element={
          <ProtectedRoute requiredPermission="payroll:manage" fallback={<DashboardSkeleton />}>
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
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN']} fallback={<FormSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <RiverProcess />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/payrun/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN']} fallback={<FormSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <PayRunPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/payruns"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN']} fallback={<TableSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <PayRunPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/templates"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']} fallback={<TableSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <SalaryTemplatesPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/statutory"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']} fallback={<TabbedSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <StatutoryPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/tax-declarations"
        element={
          <ProtectedRoute fallback={<FormSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <TaxDeclarationsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/payslips"
        element={
          <ProtectedRoute requiredPermission="payroll:view" fallback={<TableSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <PayslipsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/salary-details"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']} fallback={<FormSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <SalaryDetailsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/expenses"
        element={
          <ProtectedRoute fallback={<TableSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <ExpensesPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/loans"
        element={
          <ProtectedRoute fallback={<TableSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <LoansPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/loan-types"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']} fallback={<TableSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <LoanTypesPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/merchants"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']} fallback={<TableSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <MerchantsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/cost-centers"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR']} fallback={<TableSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <CostCentersPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/fnf"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN']} fallback={<TableSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <FnFSettlementsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/fnf/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN']} fallback={<FormSkeleton />}>
            <SubscriptionGuard minPlan={2}>
              <FnFSettlementDetailsPage />
            </SubscriptionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/arrears"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN']} fallback={<TabbedSkeleton />}>
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

      {/* Catch all - 404 Not Found */}
      <Route path="*" element={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-6xl font-black text-gray-300 dark:text-gray-700">404</h1>
            <p className="text-lg text-gray-500 dark:text-gray-400">Page not found</p>
            <a href="/" className="inline-block px-6 py-2 bg-brand-500 text-white rounded-lg hover:opacity-90 transition-opacity">Go Home</a>
          </div>
        </div>
      } />
    </Route>
  )
);

export default router;
