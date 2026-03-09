import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';

import { departmentService } from '@/services/department.service';
import { usersService } from '@/services/users.service';

import type { Tenant } from '@/services/superAdmin.service';
import { Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import { superAdminService } from '@/services/superAdmin.service';
import { DepartmentsContent } from '@/components/organization/DepartmentsContent';
import { DesignationsContent } from '@/components/organization/DesignationsContent';
import { OrgTreeContent } from '@/components/organization/OrgTreeContent';
import { UnifiedShiftsContent as ShiftsPage } from '@/components/organization/UnifiedShiftsContent';


export const OrganisationPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as any) || 'directory';
  const [tab, setTab] = useState<'directory' | 'tree' | 'departments' | 'designations' | 'shifts' | 'roster'>(initialTab);

  // Sync tab state with URL
  const handleTabChange = (newTab: typeof tab) => {
    setTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // If user is SUPER_ADMIN, ensure tree tab is not active
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && tab === 'tree') handleTabChange('directory');
    if (user?.role === 'EMPLOYEE' && tab === 'directory') handleTabChange('tree');
  }, [user?.role, tab]);

  // Sync state if URL changes externally
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && urlTab !== tab) {
      setTab(urlTab as any);
    }
  }, [searchParams]);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 16;

  // sync tab state with URL
  useEffect(() => {
    setPage(0);
  }, [selectedDept]);

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: departmentService.getDepartments });
  type Dept = { id?: string; name?: string };
  const displayDepartments = useMemo(() => departments, [departments]);

  // Fetch paginated employees
  const { data: usersResponse, isLoading: employeesLoading } = useQuery({
    queryKey: ['allEmployees', page, selectedDept],
    queryFn: () => usersService.getUsers({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      department_id: selectedDept !== 'all' ? selectedDept : undefined
    }),
    enabled: ['ADMIN', 'HR', 'SUPER_ADMIN', 'MANAGER'].includes(user?.role || '')
  });

  const filteredEmployees = usersResponse?.data || [];
  const totalEmployees = usersResponse?.pagination?.total || filteredEmployees.length;
  const displayEmployees = filteredEmployees.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // SUPER_ADMIN tenant directory state & queries
  const [searchTenants, setSearchTenants] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);


  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['super-admin', 'tenants'],
    queryFn: () => superAdminService.getTenants(),
    enabled: user?.role === 'SUPER_ADMIN',
  });

  // Activate/deactivate actions removed from UI; mutations can be reintroduced if needed.

  const tenantFiltered = useMemo(
    () => tenants.filter((t) => (t.name + (t.email || '') + (t.domain || '') + (t.city || '') + (t.country || '')).toLowerCase().includes(searchTenants.toLowerCase())),
    [searchTenants, tenants]
  );

  const selectedUsersQuery = useQuery({
    queryKey: ['super-admin', 'tenant-users', selectedTenant?.id],
    queryFn: () => superAdminService.getTenantUsers(selectedTenant!.id),
    enabled: !!selectedTenant && user?.role === 'SUPER_ADMIN',
  });

  const tenantEmployeeCountQuery = useQuery({
    queryKey: ['super-admin', 'tenant-employees', selectedTenant?.id],
    queryFn: () => superAdminService.getTenantEmployeeCount(selectedTenant!.id),
    enabled: !!selectedTenant && user?.role === 'SUPER_ADMIN',
  });


  return (
    <DashboardLayout title="Organisation" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard/organization' }, { label: 'Organisation' }]}>
      <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
        {/* Helper/Background div - keeping if needed for spacing or visual, else could be removed */}
        {/* <div className="bg-white/5 p-3 rounded-md shadow-sm"></div> */}

        <Card className="flex-1 flex flex-col p-6 min-h-0 shadow-md border dark:border-gray-800">
          {/* Subtabs */}
          <div className="mb-4 border-b border-light-border shrink-0 overflow-x-auto pb-1">
            <div className="flex items-center gap-6 min-w-max px-2">
              {['ADMIN', 'HR', 'SUPER_ADMIN', 'MANAGER'].includes(user?.role || '') && (
                <button onClick={() => handleTabChange('directory')} className={`py-2 px-3 text-sm whitespace-nowrap ${tab === 'directory' ? 'font-semibold border-b-2 border-primary-gradient' : 'text-muted'}`}>
                  {user?.role === 'SUPER_ADMIN' ? 'Tenant Directory' : user?.role === 'MANAGER' ? 'My Team' : 'Employee Directory'}
                </button>
              )}


              {user?.role !== 'SUPER_ADMIN' && (
                <>
                  <button onClick={() => handleTabChange('tree')} className={`py-2 px-3 text-sm whitespace-nowrap ${tab === 'tree' ? 'font-semibold border-b-2 border-primary-gradient' : 'text-muted'}`}>Organization Tree</button>
                  {['ADMIN', 'HR'].includes(user?.role || '') && (
                    <>
                      <button onClick={() => handleTabChange('departments')} className={`py-2 px-3 text-sm whitespace-nowrap ${tab === 'departments' ? 'font-semibold border-b-2 border-primary-gradient' : 'text-muted'}`}>Departments</button>
                      <button onClick={() => handleTabChange('designations')} className={`py-2 px-3 text-sm whitespace-nowrap ${tab === 'designations' ? 'font-semibold border-b-2 border-primary-gradient' : 'text-muted'}`}>Designations</button>
                    </>
                  )}
                  {['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'].includes(user?.role || '') && (
                    <button onClick={() => handleTabChange('shifts')} className={`py-2 px-3 text-sm whitespace-nowrap ${tab === 'shifts' ? 'font-semibold border-b-2 border-primary-gradient' : 'text-muted'}`}>Shifts</button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 relative overflow-hidden">
            {tab === 'departments' && <div className="h-full overflow-y-auto pr-2 custom-scrollbar"><DepartmentsContent /></div>}
            {tab === 'designations' && <div className="h-full overflow-y-auto pr-2 custom-scrollbar"><DesignationsContent /></div>}
            {tab === 'shifts' && <div className="h-full overflow-y-auto"><ShiftsPage /></div>}
            {tab === 'tree' && <OrgTreeContent />}

            {tab === 'directory' && (
              <div className="h-full overflow-y-auto pr-2">
                {user?.role === 'SUPER_ADMIN' ? (
                  <>
                    <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="w-full md:flex-1 md:max-w-md">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={18} />
                          <input
                            type="text"
                            placeholder="Search tenants..."
                            value={searchTenants}
                            onChange={(e) => setSearchTenants(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-md border bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      {tenantsLoading ? (
                        <div className="h-40 flex items-center justify-center">Loading...</div>
                      ) : tenantFiltered.length === 0 ? (
                        <div className="text-center text-muted">No tenants found</div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tenantFiltered.map((t) => (
                              <div key={t.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
                                <div className="flex items-center justify-between">
                                  <div className="font-semibold text-sm text-gray-900 dark:text-white">{t.name}</div>
                                  <div className={`text-xs font-medium ${t.is_active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {t.is_active ? 'Active' : 'Inactive'}
                                  </div>
                                </div>

                                <div className="text-xs text-muted mt-2">{t.email}</div>
                                {t.domain && <div className="text-xs text-muted">{t.domain}</div>}
                                {(t.city || t.country) && (
                                  <div className="text-xs text-muted mt-2">{[t.city, t.state, t.country].filter(Boolean).join(', ')}</div>
                                )}
                                <div className="text-xs text-muted mt-2">Created: {format(new Date(t.created_at), 'MMM dd, yyyy')}</div>

                                <div className="mt-4 flex items-center gap-2">
                                  <Button size="sm" variant="ghost" onClick={() => setSelectedTenant(t)} className="text-primary hover:bg-primary/5 dark:hover:bg-primary/20">
                                    <Eye size={14} />
                                    View
                                  </Button>


                                </div>
                              </div>
                            ))}
                          </div>

                          {selectedTenant && (
                            <div className="mt-6 md:mt-8">
                              <div className="p-4 md:p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                                  <div>
                                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{selectedTenant.name}</h3>
                                    <p className="text-sm text-muted">{selectedTenant.email}</p>
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => setSelectedTenant(null)} className="self-end md:self-auto">Close</Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50">
                                    <p className="text-xs uppercase tracking-wider text-muted mb-1">Status</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{selectedTenant.is_active ? 'Active' : 'Inactive'}</p>
                                  </div>
                                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50">
                                    <p className="text-xs uppercase tracking-wider text-muted mb-1">Created</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{format(new Date(selectedTenant.created_at), 'MMM dd, yyyy')}</p>
                                  </div>
                                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50">
                                    <p className="text-xs uppercase tracking-wider text-muted mb-1">Employees</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{tenantEmployeeCountQuery.isLoading ? '...' : tenantEmployeeCountQuery.data ?? 0}</p>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="text-md font-semibold mb-3 text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700">Users</h4>
                                  {selectedUsersQuery.isLoading ? (
                                    <div className="space-y-3">
                                      {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                                      ))}
                                    </div>
                                  ) : selectedUsersQuery.data && selectedUsersQuery.data.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {selectedUsersQuery.data.map((user) => (
                                        <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                          <div className="mb-2 sm:mb-0">
                                            <p className="font-medium text-gray-900 dark:text-white text-sm">{user.email}</p>
                                            <p className="text-xs text-muted">{user.role} • Joined {format(new Date(user.created_at), 'MMM dd, yyyy')}</p>
                                          </div>
                                          <span className={`text-xs px-2 py-1 rounded inline-flex items-center w-fit ${user.is_active ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-muted text-sm italic py-2">No users found for this tenant.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
                        <label className="text-sm text-muted">Filter by Department:</label>
                        <select onChange={(e) => setSelectedDept(e.target.value)} value={selectedDept} className="w-full md:w-auto rounded border border-gray-200 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-primary focus:border-primary">
                          <option value="all">All Departments</option>
                          {displayDepartments.map((d: Dept) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      {employeesLoading ? (
                        <div className="h-40 flex items-center justify-center">Loading...</div>
                      ) : filteredEmployees.length === 0 ? (
                        <div className="text-center text-muted">No employees found</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {displayEmployees.map((emp: any) => (
                            <div key={emp.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex items-center gap-3 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm uppercase shrink-0 h-10 w-10">{(emp.first_name || emp.email || 'U').charAt(0)}</div>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 dark:text-white truncate">{emp.first_name} {emp.last_name}</div>
                                <div className="text-xs text-muted truncate">{emp.role}</div>
                                <div className="text-xs text-muted truncate">{emp.email}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Pagination Controls */}
                      {!employeesLoading && filteredEmployees.length > 0 && totalEmployees > PAGE_SIZE && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 mt-6 bg-white dark:bg-gray-800 rounded-md">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, totalEmployees)} of {totalEmployees} employees
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage((p) => Math.max(0, p - 1))}
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
                              onClick={() => setPage((p) => p + 1)}
                              disabled={(page + 1) * PAGE_SIZE >= totalEmployees}
                            >
                              <ChevronRight size={16} />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};


export default OrganisationPage;
