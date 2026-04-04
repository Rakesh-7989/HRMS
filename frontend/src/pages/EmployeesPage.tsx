import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usersService, EmployeeFilters, User } from '@/services/users.service';
import { departmentService } from '@/services/department.service';
import { designationService } from '@/services/designation.service';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { resolveImageUrl } from '@/utils/image';
import { cn } from '@/utils/cn';
import {
  Plus,
  UserCheck,
  UserX,
  Search,
  Eye,
  Edit,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Building2,
  Briefcase,
  Trash2,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { useConfirm } from '@/contexts/ConfirmContext';
import { showToast } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { BulkImportDialog } from '@/components/employees/BulkImportDialog';
import { permissionsService } from '@/services/permissions.service';
import { Dialog } from '@/components/ui/Dialog';


const PAGE_SIZE = 10;

export const EmployeesPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const navigate = useNavigate();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const { hasPermission } = usePermissions();

  // Permission-based access (replaces old role-based canManage)
  const canCreate = hasPermission('employees', 'create');
  const canUpdate = hasPermission('employees', 'update');
  const canDelete = hasPermission('employees', 'delete');
  const canImport = hasPermission('employees', 'import');

  // Build filter params
  const filterParams: EmployeeFilters = {
    ...(roleFilter && { role: roleFilter }),
    ...(departmentFilter && { department_id: departmentFilter }),
    ...(statusFilter && { is_active: statusFilter === 'active' }),
    ...(searchTerm && { search: searchTerm }),
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };

  // Reset page when filters or search change
  React.useEffect(() => {
    setPage(0);
  }, [searchTerm, roleFilter, departmentFilter, statusFilter]);

  // Queries
  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['employees', filterParams],
    queryFn: () => usersService.getUsers(filterParams),
  });
  const employees: User[] = usersResponse?.data || [];

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getDepartments(),
  });

  const { data: designations = [] } = useQuery({
    queryKey: ['designations'],
    queryFn: () => designationService.getDesignations(),
  });

  // Fetch tenant roles (system + custom)
  const { data: tenantRoles = [] } = useQuery({
    queryKey: ['tenant-roles'],
    queryFn: () => permissionsService.getTenantRoles(),
  });

  // Mutations
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      usersService.updateStatus(id, is_active),
    onSuccess: (updatedUser: any, variables) => {
      // Update individual employee cache if available for immediate UI updates
      const userId = (updatedUser && updatedUser.id) || variables.id;
      if (updatedUser) {
        queryClient.setQueryData(['employee', userId], updatedUser);
      }
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      showToast.success('Employee status updated');
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || err.message || 'Failed to update status';
      showToast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersService.softDeleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      showToast.success('Employee deleted successfully');
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || err.message || 'Failed to delete';
      showToast.error(message);
    },
  });

  const [selectedViewEmployee, setSelectedViewEmployee] = useState<User | null>(null);

  // Implement client-side filtering and pagination since backend ignores some params
  const filteredEmployees = employees.filter((emp) => {
    // Hide self
    if (emp.id === user?.id) return false;

    // Role filter
    if (roleFilter && emp.role !== roleFilter) return false;

    // Department filter
    if (departmentFilter && String(emp.department_id) !== String(departmentFilter)) return false;

    // Status filter - Handle robustly
    if (statusFilter === 'active' && !Boolean(emp.is_active)) return false;
    if (statusFilter === 'inactive' && Boolean(emp.is_active)) return false;

    // Search filter (as fallback)
    if (searchTerm) {
      const searchStr = searchTerm.toLowerCase();
      const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
      const email = emp.email?.toLowerCase() || '';
      const code = emp.employee_id?.toLowerCase() || '';

      return fullName.includes(searchStr) || email.includes(searchStr) || code.includes(searchStr);
    }

    return true;
  });

  const handleRowClick = (emp: User) => {
    if (canUpdate || user?.role === 'ADMIN' || user?.role === 'HR') {
      navigate(`/dashboard/employees/${emp.id}`);
    } else {
      setSelectedViewEmployee(emp);
    }
  };

  const totalFiltered = filteredEmployees.length;
  const displayEmployees = filteredEmployees.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Get department/designation names
  const getDepartmentName = (deptId?: string) => {
    if (!deptId) return '-';
    const dept = departments.find((d) => d.id === deptId);
    return dept?.name || '-';
  };

  const getDesignationName = (desigId?: string) => {
    if (!desigId) return '-';
    const desig = designations.find((d) => d.id === desigId);
    return desig?.name || '-';
  };

  const clearFilters = () => {
    setRoleFilter('');
    setDepartmentFilter('');
    setStatusFilter('');
    setPage(0);
  };

  const hasActiveFilters = roleFilter || departmentFilter || statusFilter;

  // Subscription Query for Limit Check
  const { data: subscription } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => import('@/services/subscription.service').then(m => m.subscriptionService.getMySubscription()),
    retry: false
  });

  const currentCount = subscription?.current_employees || 0;
  const maxEmployees = subscription?.max_employees || 0;
  // If maxEmployees is 0 or null/undefined, it usually means unlimited or custom, but let's assume valid limits for STD/PREM/ELITE
  // If maxEmployees is null, it's unlimited.
  const isLimitReached = maxEmployees > 0 && currentCount >= maxEmployees;

  return (
    <DashboardLayout
      title={t('employees.title')}
      breadcrumbs={[
        { label: t('common.breadcrumbs.dashboard'), href: '/dashboard/organization' },
        { label: t('common.breadcrumbs.employees') },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-muted" size={18} />
              <input
                type="text"
                placeholder={t('employees.searchEmployees')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm text-gray-900 dark:text-white"
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant={showFilters ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter size={16} className="mr-2" />
              {t('common.filters')}
            </Button>
          </div>

          {(canCreate || canImport) && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                {canImport && (
                  <Button
                    variant="outline"
                    onClick={() => setIsBulkImportOpen(true)}
                    disabled={isLimitReached}
                    title="Import employees from Excel"
                  >
                    <FileText size={18} className="mr-2" />
                    {t('employees.bulkImport')}
                  </Button>
                )}
                {canCreate && (
                  <Button
                    onClick={() => navigate('/dashboard/employees/new')}
                    disabled={isLimitReached}
                    title={isLimitReached ? `Plan limit reached (${currentCount}/${maxEmployees}). Upgrade to add more.` : 'Add new employee'}
                    className={cn(isLimitReached && "opacity-50 cursor-not-allowed")}
                  >
                    <Plus size={18} className="mr-2" />
                    {t('employees.addEmployee')}
                  </Button>
                )}
              </div>
              {isLimitReached && (
                <p className="text-xs text-red-500 mt-1 font-medium">
                  Plan limit reached ({currentCount}/{maxEmployees})
                </p>
              )}
            </div>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-gray-500" />
                <select
                  value={departmentFilter}
                  onChange={(e) => { setDepartmentFilter(e.target.value); setPage(0); }}
                  className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="">{t('employees.filterByDepartment')}</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-gray-500" />
                <select
                  value={roleFilter}
                  onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
                  className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="">{t('employees.filterByRole')}</option>
                  {tenantRoles.map((r) => (
                    <option key={r.role} value={r.role}>{r.role.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <UserCheck size={16} className="text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value as any); setPage(0); }}
                  className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="">{t('employees.filterByStatus')}</option>
                  <option value="active">{t('common.active')}</option>
                  <option value="inactive">{t('common.inactive')}</option>
                </select>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X size={14} className="mr-1" />
                  {t('employees.clearFilters')}
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Employees Table */}
        <Card className="p-0">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
            </div>
          ) : displayEmployees.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <UserX className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium">{t('employees.noEmployeesFound')}</p>
              <p className="text-sm">{t('common.tryAgain')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.employee')}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.department')}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.designation')}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.role')}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.status')}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.joined')}
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {displayEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer"
                      onClick={() => handleRowClick(emp)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden',
                            emp.is_active ? 'bg-gradient-to-br from-primary to-primary-dark' : 'bg-gray-400'
                          )}>
                            {emp.profile_photo_url ? (
                              <img src={resolveImageUrl(emp.profile_photo_url)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <>{emp.first_name?.charAt(0)}{emp.last_name?.charAt(0)}</>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {emp.first_name} {emp.last_name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {emp.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {getDepartmentName(emp.department_id)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {getDesignationName(emp.designation_id)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          emp.role === 'ADMIN' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                          emp.role === 'HR' && 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
                          emp.role === 'MANAGER' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                          emp.role === 'EMPLOYEE' && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
                        )}>
                          {emp.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {emp.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                            <UserCheck size={14} />
                            {t('common.active')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400">
                            <UserX size={14} />
                            {t('common.inactive')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {emp.join_date || emp.created_at
                          ? format(new Date(emp.join_date || emp.created_at!), 'MMM dd, yyyy')
                          : '-'}
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRowClick(emp)}
                            title="View Details"
                          >
                            <Eye size={16} />
                          </Button>
                          {canUpdate && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/dashboard/employees/${emp.id}/edit`)}
                                title="Edit"
                              >
                                <Edit size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleStatusMutation.mutate({
                                  id: emp.id,
                                  is_active: !emp.is_active
                                })}
                                disabled={toggleStatusMutation.isPending || user?.id === emp.id}
                                title={
                                  user?.id === emp.id
                                    ? "You cannot deactivate your own account"
                                    : emp.is_active
                                      ? "Deactivate"
                                      : "Activate"
                                }
                                className={cn(
                                  user?.id === emp.id ? 'opacity-50 cursor-not-allowed' : '',
                                  emp.is_active ? 'text-red-500 hover:text-red-600' : 'text-green-500 hover:text-green-600'
                                )}
                              >
                                {emp.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                              </Button>
                            </>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                const result = await confirm({
                                  title: 'Delete Employee',
                                  message: 'Are you sure you want to delete this employee? This action cannot be undone and will remove their access to the system.',
                                  type: 'destructive',
                                  confirmText: 'Delete Employee',
                                  cancelText: 'Cancel'
                                });
                                if (result) {
                                  deleteMutation.mutate(emp.id);
                                }
                              }}
                              disabled={deleteMutation.isPending || user?.id === emp.id}
                              title="Delete"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && employees.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('common.showing')} {totalFiltered === 0 ? 0 : page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, totalFiltered)} {t('common.of')} {totalFiltered}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('common.page')} {page + 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= totalFiltered}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <BulkImportDialog
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['employees'] })}
      />

      <Dialog
        open={!!selectedViewEmployee}
        onOpenChange={(open) => !open && setSelectedViewEmployee(null)}
        onBack={() => setSelectedViewEmployee(null)}
        title={`${selectedViewEmployee?.first_name} ${selectedViewEmployee?.last_name}`}
        description={getDesignationName(selectedViewEmployee?.designation_id)}
        className="max-w-sm"
      >
        {selectedViewEmployee && (
          <div className="flex flex-col items-center">
            <div className="relative mb-6 group ring-4 ring-primary/10 rounded-full">
              <div className={cn(
                'w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white overflow-hidden shadow-inner',
                selectedViewEmployee.is_active ? 'bg-gradient-to-br from-primary to-primary-dark/80' : 'bg-gray-400'
              )}>
                {selectedViewEmployee.profile_photo_url ? (
                  <img src={resolveImageUrl(selectedViewEmployee.profile_photo_url)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <>{selectedViewEmployee.first_name?.charAt(0)}{selectedViewEmployee.last_name?.charAt(0)}</>
                )}
              </div>
            </div>

            <div className="w-full space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700/60">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Department</p>
                <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-medium">
                  <Building2 size={16} className="text-gray-400" />
                  {getDepartmentName(selectedViewEmployee.department_id)}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Contact</p>
                <a href={`mailto:${selectedViewEmployee.email}`} className="text-primary hover:underline font-medium text-sm">
                  {selectedViewEmployee.email}
                </a>
              </div>
              <div className="flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 p-3 rounded-xl mt-4 border border-gray-100 dark:border-gray-700/50">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold tracking-wider">STATUS</span>
                {selectedViewEmployee.is_active ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </DashboardLayout >
  );
};

export default EmployeesPage;
