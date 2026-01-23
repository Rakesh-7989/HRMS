import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';

import { departmentService } from '@/services/department.service';
import { usersService } from '@/services/users.service';

import type { Tenant } from '@/services/superAdmin.service';
import { Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import { superAdminService } from '@/services/superAdmin.service';
import { DepartmentsContent } from '@/components/organization/DepartmentsContent';
import { DesignationsContent } from '@/components/organization/DesignationsContent';
import { OrgTreeContent } from '@/components/organization/OrgTreeContent';



export const OrganisationPage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'directory' | 'tree' | 'departments' | 'designations'>('directory');

  // If user is SUPER_ADMIN, ensure tree tab is not active
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && tab === 'tree') setTab('directory');
    if (user?.role === 'EMPLOYEE' && tab === 'directory') setTab('tree');
  }, [user?.role, tab]);
  const [selectedDept, setSelectedDept] = useState<string>('all');


  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: departmentService.getDepartments });

  // Ensure these commonly used departments are available in the dropdown even if backend doesn't return them

  type Dept = { id?: string; name?: string };
  const displayDepartments = useMemo(() => departments, [departments]);



  // Fetch all employees once (used for both counts and filtered views)
  const { data: allEmployees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['allEmployees'],
    queryFn: () => usersService.getUsers({ limit: 1000 }),
    // Enable for MANAGER too
    enabled: ['ADMIN', 'HR', 'SUPER_ADMIN', 'MANAGER'].includes(user?.role || '')
  });

  // Client-side filtering: apply selected department or fallback on department name
  const filteredEmployees = useMemo(() => {
    if (selectedDept === 'all') return allEmployees;

    // First try to match by department_id exactly
    const byId = allEmployees.filter((emp: any) => emp.department_id === selectedDept);
    if (byId.length > 0) return byId;

    // Fallback to match by department name (handles placeholder departments or inconsistent ids)
    const selectedLower = String(selectedDept).toLowerCase();
    return allEmployees.filter((emp: any) => {
      const dep = departments.find((d: Dept) => d.id === emp.department_id);
      const empDeptName = (dep && dep.name) ? dep.name.toLowerCase() : '';
      if (empDeptName && empDeptName.includes(selectedLower)) return true;
      // Also try matching the department_id string itself (in case selectedDept is a name)
      if (String(emp.department_id || '').toLowerCase().includes(selectedLower)) return true;
      return false;
    });
  }, [allEmployees, selectedDept, departments]);

  const deptCounts = useMemo(() => {
    type Emp = { department_id?: string };
    const m = new Map<string, number>();
    allEmployees.forEach((emp: Emp) => {
      const id = emp.department_id || 'none';
      m.set(id, (m.get(id) || 0) + 1);
    });
    // also compute by department name (for placeholders mapped by name)
    const nameMap = new Map<string, number>();
    allEmployees.forEach((emp: Emp) => {
      const dep = departments.find((d: Dept) => d.id === emp.department_id);
      const name = (dep && dep.name) ? dep.name.toLowerCase() : 'none';
      nameMap.set(name, (nameMap.get(name) || 0) + 1);
    });
    return { byId: m, byName: nameMap };
  }, [allEmployees, departments]);

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
          <div className="mb-4 border-b border-light-border shrink-0">
            <div className="flex items-center gap-6">
              {['ADMIN', 'HR', 'SUPER_ADMIN', 'MANAGER'].includes(user?.role || '') && (
                <button onClick={() => setTab('directory')} className={`py-2 px-3 text-sm ${tab === 'directory' ? 'font-semibold border-b-2 border-primary-gradient' : 'text-muted'}`}>
                  {user?.role === 'SUPER_ADMIN' ? 'Tenant Directory' : user?.role === 'MANAGER' ? 'My Team' : 'Employee Directory'}
                </button>
              )}
              {user?.role !== 'SUPER_ADMIN' && (
                <>
                  <button onClick={() => setTab('tree')} className={`py-2 px-3 text-sm ${tab === 'tree' ? 'font-semibold border-b-2 border-primary-gradient' : 'text-muted'}`}>Organization Tree</button>
                  {['ADMIN', 'HR'].includes(user?.role || '') && (
                    <>
                      <button onClick={() => setTab('departments')} className={`py-2 px-3 text-sm ${tab === 'departments' ? 'font-semibold border-b-2 border-primary-gradient' : 'text-muted'}`}>Departments</button>
                      <button onClick={() => setTab('designations')} className={`py-2 px-3 text-sm ${tab === 'designations' ? 'font-semibold border-b-2 border-primary-gradient' : 'text-muted'}`}>Designations</button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 relative overflow-hidden">
            {tab === 'departments' && <DepartmentsContent />}
            {tab === 'designations' && <DesignationsContent />}

            {tab === 'tree' && <OrgTreeContent />}

            {tab === 'directory' && (
              <div className="h-full overflow-y-auto pr-2">
                {user?.role === 'SUPER_ADMIN' ? (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex-1 max-w-md">
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
                            <div className="mt-6">
                              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedTenant.name}</h3>
                                    <p className="text-sm text-muted">{selectedTenant.email}</p>
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => setSelectedTenant(null)}>Close</Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                                  <div className="p-3 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-700/50">
                                    <p className="text-xs text-muted">Status</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{selectedTenant.is_active ? 'Active' : 'Inactive'}</p>
                                  </div>
                                  <div className="p-3 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-700/50">
                                    <p className="text-xs text-muted">Created</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{format(new Date(selectedTenant.created_at), 'MMM dd, yyyy')}</p>
                                  </div>
                                  <div className="p-3 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-700/50">
                                    <p className="text-xs text-muted">Employees</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{tenantEmployeeCountQuery.isLoading ? '...' : tenantEmployeeCountQuery.data ?? 0}</p>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="text-md font-semibold mb-2 text-gray-900 dark:text-white">Users</h4>
                                  {selectedUsersQuery.isLoading ? (
                                    <div className="space-y-2">
                                      {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                                      ))}
                                    </div>
                                  ) : selectedUsersQuery.data && selectedUsersQuery.data.length > 0 ? (
                                    <div className="space-y-2">
                                      {selectedUsersQuery.data.map((user) => (
                                        <div key={user.id} className="flex items-center justify-between p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                                          <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{user.email}</p>
                                            <p className="text-xs text-muted">{user.role} • Joined {format(new Date(user.created_at), 'MMM dd, yyyy')}</p>
                                          </div>
                                          <span className={`text-xs px-2 py-1 rounded inline-flex items-center ${user.is_active ? 'bg-primary text-white' : 'bg-primary/10 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>{user.is_active ? 'Active' : 'Inactive'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-muted text-sm">No users found for this tenant.</p>
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
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-muted">Department</label>
                        <select onChange={(e) => setSelectedDept(e.target.value)} value={selectedDept} className="rounded border border-gray-200 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-primary focus:border-primary">
                          <option value="all">Select Department</option>
                          {displayDepartments.map((d: Dept) => {
                            const count = deptCounts.byId.get(d.id || '') || deptCounts.byName.get((d.name || '').toLowerCase()) || 0;
                            return (
                              <option key={d.id} value={d.id}>{d.name} ({count})</option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    <div>
                      {employeesLoading ? (
                        <div className="h-40 flex items-center justify-center">Loading...</div>
                      ) : filteredEmployees.length === 0 ? (
                        <div className="text-center text-muted">No employees found</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredEmployees.map((emp) => (
                            <div key={emp.id} className="bg-white dark:bg-gray-800 rounded-md shadow p-4 flex items-center gap-3 border border-transparent dark:border-gray-700 hover:shadow-md transition-shadow">
                              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm">{(emp.first_name || emp.email || 'U').charAt(0)}</div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">{emp.first_name} {emp.last_name}</div>
                                <div className="text-xs text-muted">{emp.role}</div>
                                <div className="text-xs text-muted">{emp.email}</div>
                              </div>
                            </div>
                          ))}
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
