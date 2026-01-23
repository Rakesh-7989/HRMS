import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { PricingPage } from '@/pages/PricingPage';
import { SuperAdminDashboard } from '@/pages/dashboards/SuperAdminDashboard';
import { AdminDashboard } from '@/pages/dashboards/AdminDashboard';
import { HRDashboard } from '@/pages/dashboards/HRDashboard';
import { ManagerDashboard } from '@/pages/dashboards/ManagerDashboard';
import { EmployeeDashboard } from '@/pages/dashboards/EmployeeDashboard';
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
import { AssetsPage } from '@/pages/AssetsPage';
import { AddAssetPage } from '@/pages/AddAssetPage';
import { AssetDetailsPage } from '@/pages/AssetDetailsPage';
import { AssetReturnPage } from '@/pages/AssetReturnPage';
import { ProjectsPage } from '@/pages/projects/ProjectsPage';
import { ClientsPage } from '@/pages/projects/ClientsPage';
import { TasksPage } from '@/pages/projects/TasksPage';

import { ProjectReportsPage } from '@/pages/projects/ProjectReportsPage';
import InboxPage from './pages/InboxPage';
import OrganisationPage from '@/pages/OrganisationPage';
import { LeaveSettingsPage } from '@/pages/LeaveSettingsPage';
import { HolidaysPage } from '@/pages/HolidaysPage';
import { EmployeeDetailsPage } from '@/pages/EmployeeDetailsPage';
import { EditEmployeePage } from '@/pages/EditEmployeePage';
import { EmployeeDocumentsPage } from '@/pages/EmployeeDocumentsPage';
import { AssetRequestsPage } from '@/pages/AssetRequestsPage';
import { SearchPage } from '@/pages/SearchPage';
import { LeaveBalancesPage } from '@/pages/LeaveBalancesPage';



function App() {
  return (
    <>
      <Toaster
        position="top-right"
        containerStyle={{
          zIndex: 100000,
        }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: '#10B981',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#EF4444',
            },
          },
        }}
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

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
          path="/tenants"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <TenantsPage />
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

        {/* Search Route */}
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
        />


        {/* Feature Pages */}
        <Route
          path="/employees"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/new"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}>
              <AddEmployeePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}>
              <EmployeeDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
              <EditEmployeePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:id/documents"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}>
              <EmployeeDocumentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
              <AttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inbox"
          element={
            <ProtectedRoute allowedRoles={['HR', 'MANAGER', 'EMPLOYEE']}>
              <InboxPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inbox"
          element={
            <ProtectedRoute allowedRoles={['HR', 'MANAGER', 'EMPLOYEE']}>
              <InboxPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/leave"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
              <LeavePage />
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
            <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
              <AssetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assets/new"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
              <AddAssetPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assets/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
              <AssetDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assets/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
              <AddAssetPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assets/:id/return"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
              <AssetReturnPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assets/requests"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
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
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />


        <Route
          path="/organisation"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "HR", "MANAGER", "EMPLOYEE", "SUPER_ADMIN"]}>
              <OrganisationPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/leave"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
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
            <ProtectedRoute allowedRoles={['ADMIN', 'HR']}>
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
            <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
              <AssetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assets/new"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AddAssetPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assets/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
              <AssetDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assets/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
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
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER']}>
              <ReportsPage />
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
            <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']}>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/clients"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <ClientsPage />
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
            <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'SUPER_ADMIN']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/activity"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER']}>
              <ActivityPage />
            </ProtectedRoute>
          }
        />
        {/* Payroll Route */}
        <Route
          path="/Payroll"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HR', 'EMPLOYEE', 'MANAGER', 'SUPER_ADMIN']}>
              <Payroll />
            </ProtectedRoute>
          }
        />
        {/* Redirect /dashboard to appropriate role dashboard */}
        <Route path="/dashboard" element={<Navigate to="/dashboard/personal" replace />} />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;


