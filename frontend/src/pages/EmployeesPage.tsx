import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usersService, EmployeeFilters } from '@/services/users.service';
import { departmentService } from '@/services/department.service';
import { designationService } from '@/services/designation.service';
import { useAuth } from '@/contexts/AuthContext';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { useConfirm } from '@/contexts/ConfirmContext';
import { showToast } from '@/utils/toast';

const ROLES = ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];
const PAGE_SIZE = 10;

export const EmployeesPage: React.FC = () => {
  const { user } = useAuth();
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

  const canManage = user?.role === 'ADMIN' || user?.role === 'HR';

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
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', filterParams],
    queryFn: () => usersService.getUsers(filterParams),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getDepartments(),
  });

  const { data: designations = [] } = useQuery({
    queryKey: ['designations'],
    queryFn: () => designationService.getDesignations(),
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

  // Implement client-side filtering and pagination since backend ignores some params
  const filteredEmployees = employees.filter((emp) => {
    // Role filter
    if (roleFilter && emp.role !== roleFilter) return false;

    // Department filter
    if (departmentFilter && String(emp.department_id) !== String(departmentFilter)) return false;

    // Status filter
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
      title="Employees"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard/organization' },
        { label: 'Employees' },
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
                placeholder="Search by name, email, or ID..."
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
              Filters
            </Button>
          </div>

          {canManage && (
            <div className="flex flex-col items-end">
              <Button
                onClick={() => navigate('/dashboard/employees/new')}
                disabled={isLimitReached}
                title={isLimitReached ? `Plan limit reached (${currentCount}/${maxEmployees}). Upgrade to add more.` : 'Add new employee'}
                className={cn(isLimitReached && "opacity-50 cursor-not-allowed")}
              >
                <Plus size={18} className="mr-2" />
                Add Employee
              </Button>
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
                  <option value="">All Departments</option>
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
                  <option value="">All Roles</option>
                  {ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
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
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X size={14} className="mr-1" />
                  Clear
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
              <p className="text-lg font-medium">No employees found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Designation
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {displayEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/dashboard/employees/${emp.id}`)}
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
                          emp.role === 'HR' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
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
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400">
                            <UserX size={14} />
                            Inactive
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
                            onClick={() => navigate(`/dashboard/employees/${emp.id}`)}
                            title="View Details"
                          >
                            <Eye size={16} />
                          </Button>
                          {canManage && (
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
                              {user?.role === 'ADMIN' && (
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
                            </>
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
                Showing {totalFiltered === 0 ? 0 : page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, totalFiltered)} of {totalFiltered} employees
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
                  Page {page + 1}
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
    </DashboardLayout>
  );
};

export default EmployeesPage;
