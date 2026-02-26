import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePermission } from '@/contexts/PermissionContext';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';

import { departmentService } from '@/services/organization/department.service';
import { usersService } from '@/services/employee/users.service';

import type { Tenant } from '@/services/management/superAdmin.service';
import { Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import { superAdminService } from '@/services/management/superAdmin.service';
import { DepartmentsContent } from '@/components/organization/DepartmentsContent';
import { DesignationsContent } from '@/components/organization/DesignationsContent';
import { OrgTreeContent } from '@/components/organization/OrgTreeContent';
import { OrgHierarchyTree } from '@/components/organization/OrgHierarchyTree';
import { UnifiedShiftsContent as ShiftsPage } from '@/components/organization/UnifiedShiftsContent';
import { RolesContent } from '@/components/organization/RolesContent';
import { EmploymentTypesContent } from '@/components/organization/EmploymentTypesContent';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { adminService } from '@/services/organization/admin.service';


export const OrganisationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as any) || 'directory';
  const [tab, setTab] = useState<'directory' | 'tree' | 'hierarchy' | 'departments' | 'designations' | 'shifts' | 'roster' | 'roles' | 'employment_types'>(initialTab);

  // Sync tab state with URL
  const handleTabChange = (newTab: typeof tab) => {
    setTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const { hasPermission, hasAnyPermission } = usePermission();

  // If user is platform admin, ensure tree tab is not active
  useEffect(() => {
    if (hasPermission('platform.manage_tenants') && (tab === 'tree' || tab === 'hierarchy')) handleTabChange('directory');
    if (!hasAnyPermission(['view_all_employees']) && tab === 'directory') handleTabChange('hierarchy');
  }, [hasPermission, hasAnyPermission, tab]);

  // Sync state if URL changes externally
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && urlTab !== tab) {
      setTab(urlTab as any);
    }
  }, [searchParams]);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<string>('all');

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: departmentService.getDepartments });

  // Ensure these commonly used departments are available in the dropdown even if backend doesn't return them

  type Dept = { id?: string; name?: string };
  const displayDepartments = useMemo(() => departments, [departments]);



  // Fetch all employees once (used for both counts and filtered views)
  const { data: allEmployees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['allEmployees'],
    queryFn: () => usersService.getUsers({ limit: 1000 }),
    // Enable for anyone with view permissions
    enabled: hasAnyPermission(['view_all_employees']) || hasPermission('platform.manage_tenants')
  });

  // Client-side filtering: apply selected department or fallback on department name
  const filteredEmployees = useMemo(() => {
    return allEmployees.filter((emp: any) => {
      // Department filtering
      let isDeptMatch = selectedDept === 'all';
      if (!isDeptMatch) {
        if (emp.department_id === selectedDept) isDeptMatch = true;
        else {
          const dep = departments.find((d: Dept) => d.id === emp.department_id);
          const empDeptName = (dep && dep.name) ? dep.name.toLowerCase() : '';
          const selectedLower = String(selectedDept).toLowerCase();
          if (empDeptName && empDeptName.includes(selectedLower)) isDeptMatch = true;
          if (String(emp.department_id || '').toLowerCase().includes(selectedLower)) isDeptMatch = true;
        }
      }

      if (!isDeptMatch) return false;

      // Employment type filtering
      if (selectedEmploymentType !== 'all') {
        if (emp.employment_type !== selectedEmploymentType) return false;
      }

      return true;
    });
  }, [allEmployees, selectedDept, selectedEmploymentType, departments]);

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
    enabled: hasPermission('platform.manage_tenants'),
  });

  // Activate/deactivate actions removed from UI; mutations can be reintroduced if needed.

  const tenantFiltered = useMemo(
    () => tenants.filter((t) => (t.name + (t.email || '') + (t.domain || '') + (t.city || '') + (t.country || '')).toLowerCase().includes(searchTenants.toLowerCase())),
    [searchTenants, tenants]
  );

  const selectedUsersQuery = useQuery({
    queryKey: ['super-admin', 'tenant-users', selectedTenant?.id],
    queryFn: () => superAdminService.getTenantUsers(selectedTenant!.id),
    enabled: !!selectedTenant && hasPermission('platform.manage_tenants'),
  });

  const tenantEmployeeCountQuery = useQuery({
    queryKey: ['super-admin', 'tenant-employees', selectedTenant?.id],
    queryFn: () => superAdminService.getTenantEmployeeCount(selectedTenant!.id),
    enabled: !!selectedTenant && hasPermission('platform.manage_tenants'),
  });

  const { data: profile } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: () => adminService.getTenantProfile(),
  });

  const employmentTypes = profile?.settings?.employment_types || ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMP'];


  return (
    <DashboardLayout title="Organisation" breadcrumbs={[{ label: 'Dashboard', href: hasAnyPermission(['view_hr_reports', 'view_all_employees']) ? '/dashboard/organization' : '/dashboard/personal' }, { label: 'Organisation' }]}>
      <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
        {/* Helper/Background div - keeping if needed for spacing or visual, else could be removed */}
        {/* <div className="bg-white/5 p-3 rounded-md shadow-sm"></div> */}

        <Card className="flex-1 flex flex-col p-6 min-h-0 shadow-md border dark:border-gray-800">
          {/* Subtabs */}
          <div className="mb-4 border-b border-light-border shrink-0 overflow-x-auto pb-1">
            <div className="flex items-center gap-6 min-w-max px-2">
              {hasAnyPermission(['view_all_employees', 'platform.manage_tenants']) && (
                <button onClick={() => handleTabChange('directory')} className={`py-2 px-3 text-sm whitespace-nowrap ${tab === 'directory' ? 'font-semibold border-b-2 border-primary-gradient' : 'text-muted'}`}>
                  {hasPermission('platform.manage_tenants') ? 'Tenant Directory' : hasPermission('view_all_employees') ? 'Employee Directory' : 'My Team'}
                </button>
              )}


              {!hasPermission('platform.manage_tenants') && (
                <>
                  <button onClick={() => handleTabChange('hierarchy')} className={`py-2 px-3 text-sm whitespace-nowrap ${tab === 'hierarchy' ? 'font-semibold border-b-2 border-primary-gradient' : 'text-muted'}`}>Hierarchy Structure</button>
                  <button onClick={() => handleTabChange('tree')} className={`py-2 px-3 text-sm whitespace-nowrap ${tab === 'tree' ? 'font-semibold border-b-2 border-primary-gradient' : 'text-muted'}`}>Reporting Lines</button>
                  {hasAnyPermission(['manage_roles', 'view_hr_reports']) && (
                    <>
                      <button onClick={() => handleTabChange('departments')} className={`py-2 px-3 text-sm whitespace-nowrap ${tab === 'departments' ? 'font-semibold border-b-2 border-primary-gradient' : 'text-muted'}`}>Departments</button>
                      <button onClick={() => handleTabChange('designations')} className={`py-2 px-3 text-sm whitespace-nowrap ${tab === 'designations' ? 'font-semibold border-b-2 border-primary-gradient' : 'text-muted'}`}>Designations</button>
                      <button onClick={() => handleTabChange('employment_types')} className={`py-2 px-3 text-sm whitespace-nowrap ${tab === 'employment_types' ? 'font-semibold border-b-2 border-primary-gradient' : 'text-muted'}`}>Employment Types</button>
                      <button onClick={() => handleTabChange('shifts')} className={`py-2 px-3 text-sm whitespace-nowrap ${tab === 'shifts' ? 'font-semibold border-b-2 border-primary-gradient' : 'text-muted'}`}>Shifts</button>
                    </>
                  )}
                  {hasPermission('manage_shifts') && (
                    <button onClick={() => setTab('shifts')} className={`py-2 px-3 text-sm whitespace-nowrap ${tab === 'shifts' ? 'font-semibold border-b-2 border-primary-gradient' : 'text-muted'}`}>Shifts</button>
                  )}
                  {hasAnyPermission(['view_roles', 'manage_roles']) && (
                    <button onClick={() => handleTabChange('roles')} className={`py-2 px-3 text-sm whitespace-nowrap ${tab === 'roles' ? 'font-semibold border-b-2 border-primary-gradient' : 'text-muted'}`}>Roles & Permissions</button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 relative overflow-hidden">
            {tab === 'departments' && <div className="h-full overflow-y-auto pr-2 custom-scrollbar"><DepartmentsContent /></div>}
            {tab === 'designations' && <div className="h-full overflow-y-auto pr-2 custom-scrollbar"><DesignationsContent /></div>}
            {tab === 'shifts' && <div className="h-full overflow-y-auto"><ShiftsPage /></div>}
            {tab === 'hierarchy' && <OrgHierarchyTree />}
            {tab === 'tree' && <OrgTreeContent />}
            {tab === 'roles' && <div className="h-full overflow-y-auto pr-2 custom-scrollbar"><RolesContent /></div>}
            {tab === 'employment_types' && <div className="h-full overflow-y-auto pr-2 custom-scrollbar"><EmploymentTypesContent /></div>}

            {tab === 'directory' && (
              <div className="h-full overflow-y-auto pr-2">
                {hasPermission('platform.manage_tenants') ? (
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
                    <div className="mb-4 flex flex-col md:flex-row md:items-center justify-start gap-6">
                      <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
                        <label className="text-sm text-muted shrink-0">Filter by Department:</label>
                        <SearchableSelect
                          className="w-full md:w-64"
                          options={[
                            { value: 'all', label: 'All Departments' },
                            ...displayDepartments.map((d: Dept) => ({
                              value: d.id || '',
                              label: `${d.name} (${deptCounts.byId.get(d.id || '') || deptCounts.byName.get((d.name || '').toLowerCase()) || 0})`
                            }))
                          ]}
                          value={selectedDept}
                          onChange={setSelectedDept}
                        />
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
                        <label className="text-sm text-muted shrink-0">Filter by Employment Type:</label>
                        <SearchableSelect
                          className="w-full md:w-64"
                          options={[
                            { value: 'all', label: 'All Types' },
                            ...employmentTypes.map((type: string) => ({
                              value: type,
                              label: type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('-')
                            }))
                          ]}
                          value={selectedEmploymentType}
                          onChange={setSelectedEmploymentType}
                        />
                      </div>
                    </div>

                    <div>
                      {employeesLoading ? (
                        <div className="h-40 flex items-center justify-center">Loading...</div>
                      ) : filteredEmployees.length === 0 ? (
                        <div className="text-center text-muted">No employees found</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {filteredEmployees.map((emp) => (
                            <div key={emp.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex items-center gap-3 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm uppercase shrink-0 h-10 w-10">{(emp.first_name || emp.email || 'U').charAt(0)}</div>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 dark:text-white truncate">{emp.first_name} {emp.last_name}</div>
                                <div className="text-xs text-muted truncate">{emp.role?.replace('_', ' ')}</div>
                                <div className="text-xs text-muted truncate">{emp.email}</div>
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
