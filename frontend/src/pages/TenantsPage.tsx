import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { superAdminService, Tenant } from '@/services/superAdmin.service';
import { format } from 'date-fns';
import { Eye, BadgeCheck, Ban } from 'lucide-react';

export const TenantsPage: React.FC = () => {
 
  const [selected, setSelected] = useState<Tenant | null>(null);

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['super-admin', 'tenants'],
    queryFn: () => superAdminService.getTenants(),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => superAdminService.activateTenant(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => superAdminService.deactivateTenant(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] }),
  });

  const queryClient = useQueryClient();

  const selectedUsersQuery = useQuery({
    queryKey: ['super-admin', 'tenant-users', selected?.id],
    queryFn: () => superAdminService.getTenantUsers(selected!.id),
    enabled: !!selected,
  });

  const employeeCountQuery = useQuery({
    queryKey: ['super-admin', 'tenant-employees', selected?.id],
    queryFn: () => superAdminService.getTenantEmployeeCount(selected!.id),
    enabled: !!selected,
  });

  const activeCount = useMemo(() => tenants.filter((t) => t.is_active).length, [tenants]);

  return (
    <DashboardLayout
      title="Tenants"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard/system' },
        { label: 'Tenants' },
      ]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted">Total Tenants</p>
            <p className="text-2xl font-bold text-primary">{tenants.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Active</p>
            <p className="text-2xl font-bold text-primary">{activeCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Inactive</p>
            <p className="text-2xl font-bold text-primary">{tenants.length - activeCount}</p>
          </Card>
        </div>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tenant Directory</h3>
              <p className="text-sm text-muted">Activate/deactivate tenants and view details.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-primary-light rounded animate-pulse" />
              ))}
            </div>
          ) : tenants.length === 0 ? (
            <div className="py-12 text-center text-muted">No tenants available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-primary/10 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{tenant.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{tenant.email}</td>
                      <td className="py-3 px-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            tenant.is_active
                              ? 'bg-primary text-white'
                              : 'bg-primary-light text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}
                        >
                          {tenant.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(tenant.created_at), 'MMM dd, yyyy')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelected(tenant)}
                            className="text-primary"
                          >
                            <Eye size={16} />
                            View
                          </Button>
                          {tenant.is_active ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deactivateMutation.mutate(tenant.id)}
                              isLoading={deactivateMutation.isPending}
                            >
                              <Ban size={16} />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => activateMutation.mutate(tenant.id)}
                              isLoading={activateMutation.isPending}
                            >
                              <BadgeCheck size={16} />
                              Activate
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
        </Card>

        {selected && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.name}</h3>
                <p className="text-sm text-muted">{selected.email}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <Card className="p-3">
                <p className="text-xs text-muted">Status</p>
                <p className="font-semibold">{selected.is_active ? 'Active' : 'Inactive'}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted">Created</p>
                <p className="font-semibold">{format(new Date(selected.created_at), 'MMM dd, yyyy')}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted">Employees</p>
                <p className="font-semibold">
                  {employeeCountQuery.isLoading ? '...' : employeeCountQuery.data ?? 0}
                </p>
              </Card>
            </div>
            <div>
              <h4 className="text-md font-semibold mb-2 text-gray-900 dark:text-white">Users</h4>
              {selectedUsersQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-primary-light rounded animate-pulse" />
                  ))}
                </div>
              ) : selectedUsersQuery.data && selectedUsersQuery.data.length > 0 ? (
                <div className="space-y-2">
                  {selectedUsersQuery.data.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-md"
                      style={{ backgroundColor: 'var(--background)', border: `1px solid var(--border)` }}
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{user.email}</p>
                        <p className="text-xs text-muted">
                          {user.role} • Joined {format(new Date(user.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded inline-flex items-center ${user.is_active ? 'bg-primary text-white' : 'bg-primary-light text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-sm">No users found for this tenant.</p>
              )}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};


