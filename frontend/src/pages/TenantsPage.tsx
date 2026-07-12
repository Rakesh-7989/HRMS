import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { superAdminService, Tenant } from '@/services/superAdmin.service';
import { format } from 'date-fns';
import { Eye, BadgeCheck, Ban, Calendar, XCircle, ArrowUp, ShieldAlert, Receipt, MoreVertical } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { UpgradePlanModal } from '@/components/super_admin/UpgradePlanModal';
import { BillingHistoryModal } from '@/components/super_admin/BillingHistoryModal';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/contexts/ConfirmContext';

export const TenantsPage: React.FC = () => {
  const { t } = useTranslation();
  const { confirm, prompt } = useConfirm();

  const [selected, setSelected] = useState<Tenant | null>(null);
  const queryClient = useQueryClient();
  const detailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected && detailsRef.current) {
      detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selected]);

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

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const showError = (message: string) => {
    setSuccessConfig({
      isOpen: true,
      title: t('tenants.actionFailed'),
      message,
      type: 'error',
    });
  };

  const showSuccess = (title: string, message: string) => {
    setSuccessConfig({ isOpen: true, title, message, type: 'success' });
  };

  const activateMutation = useMutation({
    mutationFn: (id: string) => superAdminService.activateTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
      showSuccess(t('tenants.activatedTitle'), t('tenants.activatedMessage'));
    },
    onError: (error: any) => {
      showError(error.message || t('tenants.activateFailMessage'));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => superAdminService.deactivateTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
      showSuccess(t('tenants.deactivatedTitle'), t('tenants.deactivatedMessage'));
    },
    onError: (error: any) => {
      showError(error.message || t('tenants.deactivateFailMessage'));
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: (id: string) => superAdminService.cancelTenantSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
      showSuccess(t('tenants.subCancelledTitle'), t('tenants.subCancelledMessage'));
    },
    onError: (error: any) => {
      showError(error.message || t('tenants.cancelFailMessage'));
    },
  });

  const extendSubscriptionMutation = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => superAdminService.extendTenantSubscription(id, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
      showSuccess(t('tenants.subExtendedTitle'), t('tenants.subExtendedMessage'));
    },
    onError: (error: any) => {
      showError(error.message || t('tenants.extendFailMessage'));
    },
  });

  const enableSubscriptionMutation = useMutation({
    mutationFn: (id: string) => superAdminService.enableTenantSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
      showSuccess(t('tenants.subEnabledTitle'), t('tenants.subEnabledMessage'));
    },
    onError: (error: any) => {
      showError(error.message || t('tenants.enableFailMessage'));
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => superAdminService.suspendTenantSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
      showSuccess(t('tenants.subSuspendedTitle'), t('tenants.subSuspendedMessage'));
    },
    onError: (error: any) => {
      showError(error.message || t('tenants.suspendFailMessage'));
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: ({ id, planId }: { id: string; planId: string }) => superAdminService.upgradeTenantSubscription(id, planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
      setUpgradeConfig({ ...upgradeConfig, isOpen: false });
      showSuccess(t('tenants.planUpgradedTitle'), t('tenants.planUpgradedMessage'));
    },
    onError: (error: any) => {
      showError(error.message || t('tenants.upgradeFailMessage'));
    },
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

  const handleEnableSub = (tenant: Tenant) => {
    confirm({
      title: t('tenants.enableSubscription'),
      message: t('tenants.enableSubMessage'),
      type: 'confirm',
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
    }).then((result) => {
      if (result) enableSubscriptionMutation.mutate(tenant.id);
    });
  };

  const handleExtendSub = (tenant: Tenant) => {
    prompt({
      title: t('tenants.extendSubscription'),
      message: t('tenants.extendSubMessage'),
      placeholder: t('tenants.extendDaysPlaceholder'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
    }).then((value) => {
      if (value && !isNaN(parseInt(value as string))) {
        extendSubscriptionMutation.mutate({ id: tenant.id, days: parseInt(value as string) });
      }
    });
  };

  const handleCancelSub = (tenant: Tenant) => {
    confirm({
      title: t('tenants.cancelSubscription'),
      message: t('tenants.cancelSubMessage'),
      type: 'destructive',
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
    }).then((result) => {
      if (result) cancelSubscriptionMutation.mutate(tenant.id);
    });
  };

  const handleSuspend = (tenant: Tenant) => {
    confirm({
      title: t('tenants.suspendOrg'),
      message: t('tenants.suspendOrgMessage'),
      type: 'destructive',
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
    }).then((result) => {
      if (result) suspendMutation.mutate(tenant.id);
    });
  };

  const columns = useMemo(() => [
    {
      header: t('tenants.name'),
      accessorKey: 'name' as keyof Tenant,
    },
    {
      header: t('tenants.email'),
      accessorKey: 'email' as keyof Tenant,
    },
    {
      header: t('tenants.employees'),
      cell: (tenant: Tenant) => (
        <span className="font-medium">{tenant.employee_count ?? 0}</span>
      ),
    },
    {
      header: t('tenants.plan'),
      cell: (tenant: Tenant) => (
        <div className="flex flex-col gap-1">
          <span className={`px-2 py-1 rounded text-xs font-medium inline-block w-fit ${
            tenant.subscription_status === 'TRIAL'
              ? 'bg-coral-100 text-coral-700 dark:bg-coral-500/20 dark:text-coral-400'
              : tenant.subscription_status === 'PENDING_PAYMENT'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                : tenant.subscription_status === 'ACTIVE'
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {tenant.subscription_status === 'PENDING_PAYMENT' ? t('tenants.pendingPayment') : tenant.subscription_status || 'N/A'}
          </span>
          <span className="text-xs text-muted">{tenant.plan_name || t('tenants.noPlan')}</span>
        </div>
      ),
    },
    {
      header: t('tenants.status'),
      cell: (tenant: Tenant) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          tenant.is_active
            ? 'bg-brand-500 text-white'
            : 'bg-brand-500-light text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        }`}>
          {tenant.is_active ? t('common.active') : t('common.inactive')}
        </span>
      ),
    },
    {
      header: t('tenants.created'),
      cell: (tenant: Tenant) => (
        <span className="text-gray-600 dark:text-gray-400">
          {format(new Date(tenant.created_at), 'MMM dd, yyyy')}
        </span>
      ),
    },
    {
      header: t('tenants.actions'),
      cell: (tenant: Tenant) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelected(tenant); }}
            className="text-brand-500 h-8 w-8 p-0"
            title={t('tenants.viewDetails')}
          >
            <Eye size={16} />
          </Button>

          {tenant.plan_name === 'No Plan' ? (
            <Button
              size="sm"
              className="bg-brand-500 hover:bg-brand-600 text-white h-8 text-xs"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleEnableSub(tenant); }}
              isLoading={enableSubscriptionMutation.isPending && enableSubscriptionMutation.variables === tenant.id}
            >
              <BadgeCheck size={14} className="mr-1" />
              {t('tenants.enableSub')}
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="border-coral-500 text-coral-600 hover:bg-coral-50 hover:text-coral-600 h-8 text-xs"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleExtendSub(tenant); }}
                isLoading={extendSubscriptionMutation.isPending && extendSubscriptionMutation.variables?.id === tenant.id}
              >
                <Calendar size={14} className="mr-1" />
                {t('tenants.extend')}
              </Button>

              <div className="relative" onMouseLeave={() => setOpenDropdownId(null)}>
                <button
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === tenant.id ? null : tenant.id); }}
                >
                  <MoreVertical size={16} className="text-gray-500" />
                </button>
                <div className={`absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-elev-5 transition-all z-[100] overflow-hidden ${openDropdownId === tenant.id ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                  <div className="flex flex-col py-1">
                    <button
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); setOpenDropdownId(null); setUpgradeConfig({ isOpen: true, tenantId: tenant.id, currentPlanName: tenant.plan_name || 'No Plan' }); }}
                      className="text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                    >
                      <ArrowUp size={14} /> {t('tenants.upgradePlan')}
                    </button>

                    <button
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); setOpenDropdownId(null); setBillingConfig({ isOpen: true, tenantId: tenant.id, tenantName: tenant.name }); }}
                      className="text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                    >
                      <Receipt size={14} /> {t('tenants.billingHistory')}
                    </button>

                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1"></div>

                    {tenant.is_active ? (
                      <button
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setOpenDropdownId(null); deactivateMutation.mutate(tenant.id); }}
                        className="text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 text-orange-600 flex items-center gap-2"
                      >
                        <Ban size={14} /> {t('tenants.deactivateAccount')}
                      </button>
                    ) : (
                      <button
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); setOpenDropdownId(null); activateMutation.mutate(tenant.id); }}
                        className="text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 text-green-600 flex items-center gap-2"
                      >
                        <BadgeCheck size={14} /> {t('tenants.activateAccount')}
                      </button>
                    )}

                    <button
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); setOpenDropdownId(null); handleCancelSub(tenant); }}
                      className="text-left px-4 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 flex items-center gap-2"
                    >
                      <XCircle size={14} /> {t('tenants.cancelSubscription')}
                    </button>

                    <button
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); setOpenDropdownId(null); handleSuspend(tenant); }}
                      className="text-left px-4 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/10 text-red-700 flex items-center gap-2"
                    >
                      <ShieldAlert size={14} /> {t('tenants.suspendOrg')}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ),
    },
  ], [t, tenants, openDropdownId, enableSubscriptionMutation.isPending, enableSubscriptionMutation.variables, extendSubscriptionMutation.isPending, extendSubscriptionMutation.variables]);

  return (
    <DashboardLayout
      title={t('sidebar.tenants')}
      breadcrumbs={[
        { label: t('common.breadcrumbs.dashboard'), href: '/dashboard/system' },
        { label: 'Tenants' },
      ]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted">{t('tenants.totalTenants')}</p>
            <p className="text-2xl font-bold text-brand-500">{tenants.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">{t('tenants.active')}</p>
            <p className="text-2xl font-bold text-brand-500">{activeCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">{t('tenants.inactive')}</p>
            <p className="text-2xl font-bold text-brand-500">{tenants.length - activeCount}</p>
          </Card>
        </div>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('tenants.title')}</h3>
              <p className="text-sm text-muted">{t('tenants.subtitle')}</p>
            </div>
          </div>

          <DataTable
            data={tenants}
            columns={columns}
            loading={isLoading}
            emptyMessage={t('tenants.noTenants')}
          />
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
                  {t('tenants.close')}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <Card className="p-3">
                  <p className="text-xs text-muted">{t('tenants.status')}</p>
                  <p className="font-semibold">{selected!.is_active ? t('common.active') : t('common.inactive')}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted">{t('tenants.created')}</p>
                  <p className="font-semibold">{format(new Date(selected!.created_at), 'MMM dd, yyyy')}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted">{t('tenants.employees')}</p>
                  <p className="font-semibold">
                    {employeeCountQuery.isLoading ? '...' : employeeCountQuery.data ?? 0}
                  </p>
                </Card>
              </div>
              <div>
                <h4 className="text-md font-semibold mb-2 text-gray-900 dark:text-white">{t('tenants.users')}</h4>
                {selectedUsersQuery.isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-brand-500-light rounded animate-pulse" />
                    ))}
                  </div>
                ) : selectedUsersQuery.data && (selectedUsersQuery.data as any[]).length > 0 ? (
                  <div className="space-y-2">
                    {(selectedUsersQuery.data as any[]).map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-md bg-background border-border"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{user.email}</p>
                          <p className="text-xs text-muted">
                            {user.role} • {t('tenants.created')} {format(new Date(user.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded inline-flex items-center ${user.is_active ? 'bg-brand-500 text-white' : 'bg-neutral-500 text-white'}`}>
                          {user.is_active ? t('common.active') : t('common.inactive')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-sm">{t('tenants.noUsers')}</p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

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
