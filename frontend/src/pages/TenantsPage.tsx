import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { superAdminService, Tenant } from '@/services/superAdmin.service';
import { format } from 'date-fns';
import { Eye, BadgeCheck, Ban, Calendar, XCircle, ArrowUp, ShieldAlert, Receipt, MoreVertical } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { UpgradePlanModal } from '@/components/super_admin/UpgradePlanModal';
import { BillingHistoryModal } from '@/components/super_admin/BillingHistoryModal';

export const TenantsPage: React.FC = () => {

  const [selected, setSelected] = useState<Tenant | null>(null);
  const queryClient = useQueryClient();
  const detailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected && detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selected]);

  // Custom UI State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'destructive' | 'prompt';
    onConfirm: (value?: string) => void;
    placeholder?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    onConfirm: () => { },
  });

  const [successConfig, setSuccessConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
  });

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['super-admin', 'tenants'],
    queryFn: () => superAdminService.getTenants(),
  });

  const { data: plansData = [] } = useQuery({
    queryKey: ['super-admin', 'plans'],
    queryFn: () => superAdminService.getPlans(),
  });

  const [upgradeConfig, setUpgradeConfig] = useState<{
    isOpen: boolean;
    tenantId: string;
    currentPlanName: string;
  }>({
    isOpen: false,
    tenantId: '',
    currentPlanName: '',
  });

  const [billingConfig, setBillingConfig] = useState<{
    isOpen: boolean;
    tenantId: string;
    tenantName: string;
  }>({
    isOpen: false,
    tenantId: '',
    tenantName: '',
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => superAdminService.activateTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
      setSuccessConfig({
        isOpen: true,
        title: 'Tenant Activated',
        message: 'The tenant has been successfully activated.',
        type: 'success'
      });
    },
    onError: (error: any) => {
      setSuccessConfig({
        isOpen: true,
        title: 'Action Failed',
        message: error.message || 'Failed to activate tenant.',
        type: 'error'
      });
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => superAdminService.deactivateTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
      setSuccessConfig({
        isOpen: true,
        title: 'Tenant Deactivated',
        message: 'The tenant has been successfully deactivated.',
        type: 'success'
      });
    },
    onError: (error: any) => {
      setSuccessConfig({
        isOpen: true,
        title: 'Action Failed',
        message: error.message || 'Failed to deactivate tenant.',
        type: 'error'
      });
    }
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: (id: string) => superAdminService.cancelTenantSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
      setSuccessConfig({
        isOpen: true,
        title: 'Subscription Cancelled',
        message: 'The tenant subscription has been successfully cancelled.',
        type: 'success'
      });
    },
    onError: (error: any) => {
      setSuccessConfig({
        isOpen: true,
        title: 'Action Failed',
        message: error.message || 'Failed to cancel subscription.',
        type: 'error'
      });
    }
  });

  const extendSubscriptionMutation = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => superAdminService.extendTenantSubscription(id, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
      setSuccessConfig({
        isOpen: true,
        title: 'Subscription Extended',
        message: 'The tenant subscription has been successfully extended.',
        type: 'success'
      });
    },
    onError: (error: any) => {
      setSuccessConfig({
        isOpen: true,
        title: 'Action Failed',
        message: error.message || 'Failed to extend subscription.',
        type: 'error'
      });
    }
  });

  const enableSubscriptionMutation = useMutation({
    mutationFn: (id: string) => superAdminService.enableTenantSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
      setSuccessConfig({
        isOpen: true,
        title: 'Subscription Enabled',
        message: 'A 30-day Standard subscription has been enabled for this tenant.',
        type: 'success'
      });
    },
    onError: (error: any) => {
      setSuccessConfig({
        isOpen: true,
        title: 'Action Failed',
        message: error.message || 'Failed to enable subscription.',
        type: 'error'
      });
    }
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => superAdminService.suspendTenantSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
      setSuccessConfig({
        isOpen: true,
        title: 'Subscription Suspended',
        message: 'The tenant subscription has been suspended.',
        type: 'success'
      });
    },
    onError: (error: any) => {
      setSuccessConfig({
        isOpen: true,
        title: 'Action Failed',
        message: error.message || 'Failed to suspend subscription.',
        type: 'error'
      });
    }
  });

  const upgradeMutation = useMutation({
    mutationFn: ({ id, planId }: { id: string; planId: string }) => superAdminService.upgradeTenantSubscription(id, planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
      setUpgradeConfig({ ...upgradeConfig, isOpen: false });
      setSuccessConfig({
        isOpen: true,
        title: 'Plan Upgraded',
        message: 'The tenant plan has been successfully upgraded.',
        type: 'success'
      });
    },
    onError: (error: any) => {
      setSuccessConfig({
        isOpen: true,
        title: 'Action Failed',
        message: error.message || 'Failed to upgrade plan.',
        type: 'error'
      });
    }
  });

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
                      Employees
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Plan
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
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {tenant.employee_count ?? 0}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium inline-block w-fit ${tenant.subscription_status === 'TRIAL'
                            ? 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400'
                            : tenant.subscription_status === 'PENDING_PAYMENT'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : tenant.subscription_status === 'ACTIVE'
                                ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                            {tenant.subscription_status === 'PENDING_PAYMENT' ? 'Pending Payment' : tenant.subscription_status || 'N/A'}
                          </span>
                          <span className="text-xs text-muted">{tenant.plan_name || 'No Plan'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${tenant.is_active
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
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelected(tenant)}
                            className="text-primary h-8 w-8 p-0"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </Button>

                          {tenant.plan_name === 'No Plan' ? (
                            <Button
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs"
                              onClick={() => {
                                setConfirmConfig({
                                  isOpen: true,
                                  title: 'Enable Subscription',
                                  message: 'Enable a 30-day Standard subscription for this tenant?',
                                  type: 'confirm',
                                  onConfirm: () => enableSubscriptionMutation.mutate(tenant.id)
                                });
                              }}
                              isLoading={enableSubscriptionMutation.isPending && enableSubscriptionMutation.variables === tenant.id}
                            >
                              <BadgeCheck size={14} className="mr-1" />
                              Enable Sub
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-fuchsia-500 text-fuchsia-600 hover:bg-fuchsia-50 h-8 text-xs"
                                onClick={() => {
                                  setConfirmConfig({
                                    isOpen: true,
                                    title: 'Extend Subscription',
                                    message: 'Enter the number of days you want to extend this subscription by.',
                                    type: 'prompt',
                                    placeholder: 'Number of days (e.g. 30)',
                                    onConfirm: (value) => {
                                      if (value && !isNaN(parseInt(value!))) {
                                        extendSubscriptionMutation.mutate({ id: tenant.id, days: parseInt(value!) });
                                      }
                                    }
                                  });
                                }}
                                isLoading={extendSubscriptionMutation.isPending && extendSubscriptionMutation.variables?.id === tenant.id}
                              >
                                <Calendar size={14} className="mr-1" />
                                Extend
                              </Button>

                              {/* Action Menu */}
                              <div className="relative group">
                                <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                  <MoreVertical size={16} className="text-gray-500" />
                                </button>
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 overflow-hidden">
                                  <div className="flex flex-col py-1">
                                    <button
                                      onClick={() => {
                                        setUpgradeConfig({
                                          isOpen: true,
                                          tenantId: tenant.id,
                                          currentPlanName: tenant.plan_name || 'No Plan'
                                        });
                                      }}
                                      className="text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                                    >
                                      <ArrowUp size={14} /> Upgrade Plan
                                    </button>

                                    <button
                                      onClick={() => {
                                        setBillingConfig({
                                          isOpen: true,
                                          tenantId: tenant.id,
                                          tenantName: tenant.name
                                        });
                                      }}
                                      className="text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                                    >
                                      <Receipt size={14} /> Billing History
                                    </button>

                                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1"></div>

                                    {tenant.is_active ? (
                                      <button
                                        onClick={() => deactivateMutation.mutate(tenant.id)}
                                        className="text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 text-orange-600 flex items-center gap-2"
                                      >
                                        <Ban size={14} /> Deactivate Account
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => activateMutation.mutate(tenant.id)}
                                        className="text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 text-green-600 flex items-center gap-2"
                                      >
                                        <BadgeCheck size={14} /> Activate Account
                                      </button>
                                    )}

                                    <button
                                      onClick={() => {
                                        setConfirmConfig({
                                          isOpen: true,
                                          title: 'Cancel Subscription',
                                          message: 'Are you sure you want to CANCEL this subscription?',
                                          type: 'destructive',
                                          onConfirm: () => cancelSubscriptionMutation.mutate(tenant.id)
                                        });
                                      }}
                                      className="text-left px-4 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 flex items-center gap-2"
                                    >
                                      <XCircle size={14} /> Cancel Subscription
                                    </button>

                                    <button
                                      onClick={() => {
                                        setConfirmConfig({
                                          isOpen: true,
                                          title: 'Suspend Organization',
                                          message: 'Are you sure you want to SUSPEND this organization?',
                                          type: 'destructive',
                                          onConfirm: () => suspendMutation.mutate(tenant.id)
                                        });
                                      }}
                                      className="text-left px-4 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/10 text-red-700 flex items-center gap-2"
                                    >
                                      <ShieldAlert size={14} /> Suspend Org
                                    </button>
                                  </div>
                                </div>
                              </div>
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
        </Card>

        {selected && (
          <div ref={detailsRef}>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected!.name}</h3>
                  <p className="text-sm text-muted">{selected!.email}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <Card className="p-3">
                  <p className="text-xs text-muted">Status</p>
                  <p className="font-semibold">{selected!.is_active ? 'Active' : 'Inactive'}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted">Created</p>
                  <p className="font-semibold">{format(new Date(selected!.created_at), 'MMM dd, yyyy')}</p>
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
                ) : selectedUsersQuery.data && (selectedUsersQuery.data as any[]).length > 0 ? (
                  <div className="space-y-2">
                    {(selectedUsersQuery.data as any[]).map((user) => (
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
                        <span className={`text-xs px-2 py-1 rounded inline-flex items-center ${user.is_active ? 'bg-primary text-white' : 'bg-gray-500 text-white'}`}>
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
          </div>
        )}
      </div>

      {/* Custom Modals */}
      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        placeholder={confirmConfig.placeholder}
      />

      <SuccessModal
        isOpen={successConfig.isOpen}
        onClose={() => setSuccessConfig({ ...successConfig, isOpen: false })}
        title={successConfig.title}
        message={successConfig.message}
        type={successConfig.type}
      />
      <UpgradePlanModal
        isOpen={upgradeConfig.isOpen}
        onClose={() => setUpgradeConfig({ ...upgradeConfig, isOpen: false })}
        onUpgrade={(planId) => upgradeMutation.mutate({ id: upgradeConfig.tenantId, planId })}
        currentPlanName={upgradeConfig.currentPlanName}
        plans={plansData}
        isLoading={upgradeMutation.isPending}
      />

      <BillingHistoryModal
        isOpen={billingConfig.isOpen}
        onClose={() => setBillingConfig({ ...billingConfig, isOpen: false })}
        tenantId={billingConfig.tenantId}
        tenantName={billingConfig.tenantName}
      />
    </DashboardLayout>
  );
};


