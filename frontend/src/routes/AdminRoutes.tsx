import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Admin Dashboards
import { SuperAdminDashboard } from '@/pages/dashboards/SuperAdminDashboard';
import { DBADashboard } from '@/pages/dashboards/DBADashboard';
import { SystemReportsPage } from '@/pages/dashboards/SystemReportsPage';
import { AdminDashboard } from '@/pages/dashboards/AdminDashboard';
import { HRDashboard } from '@/pages/dashboards/HRDashboard';
import { ManagerDashboard } from '@/pages/dashboards/ManagerDashboard';

// Management Pages
import { TenantsPage } from '@/pages/TenantsPage';
import { PlansPage } from '@/pages/PlansPage';
import { CouponsPage } from '@/pages/CouponsPage';
import { RolesPage } from '@/pages/RolesPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { AddEmployeePage } from '@/pages/AddEmployeePage';
import { EmployeeDetailsPage } from '@/pages/EmployeeDetailsPage';
import { EditEmployeePage } from '@/pages/EditEmployeePage';
import { EmployeeDocumentsPage } from '@/pages/EmployeeDocumentsPage';
import { AttendancePage } from '@/pages/AttendancePage';
import { ReportsPage } from '@/pages/ReportsPage';
import { ShiftsPage } from '@/pages/organization/ShiftsPage';
import { LeavePage } from '@/pages/LeavePage';
import { LeaveSettingsPage } from '@/pages/LeaveSettingsPage';
import { LeaveBalancesPage } from '@/pages/LeaveBalancesPage';
import { DepartmentsPage } from '@/pages/DepartmentsPage';
import { DesignationsPage } from '@/pages/DesignationsPage';
import { AssetsPage } from '@/pages/AssetsPage';
import { AddAssetPage } from '@/pages/AddAssetPage';
import { AssetDetailsPage } from '@/pages/AssetDetailsPage';
import { AssetReturnPage } from '@/pages/AssetReturnPage';
import { AssetRequestsPage } from '@/pages/AssetRequestsPage';
import { ProjectsPage } from '@/pages/projects/ProjectsPage';
import { ClientsPage } from '@/pages/projects/ClientsPage';
import { TasksPage } from '@/pages/projects/TasksPage';
import { ProjectReportsPage } from '@/pages/projects/ProjectReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ActivityPage } from '@/pages/ActivityPage';
import Payroll from '@/pages/Payroll';
import { PayrollDashboard } from '@/pages/payroll/PayrollDashboard';
import { RiverProcess } from '@/pages/payroll/RiverProcess';

export const AdminRoutes = (
    <>
        {/* System Admin */}
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

        {/* Org Admin */}
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

        {/* Management Modules */}
        <Route
            path="/roles"
            element={
                <ProtectedRoute requiredPermissions={['manage_roles']}>
                    <RolesPage />
                </ProtectedRoute>
            }
        />
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
            path="/reports"
            element={
                <ProtectedRoute requiredPermissions={['view_hr_reports', 'view_all_payroll']}>
                    <ReportsPage />
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
            path="/projects/reports"
            element={
                <ProtectedRoute requiredPermissions={['manage_all_projects', 'view_hr_reports']}>
                    <ProjectReportsPage />
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
    </>
);
