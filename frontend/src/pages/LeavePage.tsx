import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MyLeaveContent } from '@/components/leave/MyLeaveContent';
import { TeamLeaveContent } from '@/components/leave/TeamLeaveContent';
import { LeaveSettingsContent } from '@/components/leave/LeaveSettingsContent';
import { LeaveBalancesContent } from '@/components/leave/LeaveBalancesContent';
import { LeaveAllocationContent } from '@/components/leave/LeaveAllocationContent';
import { DelegationContent } from '@/components/leave/DelegationContent';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/contexts/PermissionsContext';
import { PermissionAction } from '@/services/permissions.service';
import { PageTransition } from '@/components/common/PageTransition';

export const LeavePage: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const [searchParams] = useSearchParams();

  const LEAVE_TABS: { id: string; label: string; action: PermissionAction; minPlan?: number }[] = [
    { id: 'my-leave', label: t('leave.tabs.myLeave'), action: 'create' },
    { id: 'team-requests', label: t('leave.tabs.teamRequests'), action: 'approve' },
    { id: 'allocation', label: t('leave.tabs.allocation'), action: 'manage_policies' },
    { id: 'balances', label: t('leave.tabs.balances'), action: 'view_balances' },
    { id: 'delegations', label: 'Delegations', action: 'approve' },
    { id: 'settings', label: t('leave.tabs.settings'), action: 'manage_settings' },
  ];

  type TabId = typeof LEAVE_TABS[number]['id'];
  const tabParam = searchParams.get('tab') as TabId | null;

  // Initialize from URL param if valid, otherwise default to 'my-leave'
  const getInitialTab = (): TabId => {
    if (tabParam && LEAVE_TABS.some(t => t.id === tabParam)) {
      // Check if user has access to this tab
      const tab = LEAVE_TABS.find(t => t.id === tabParam);
      if (tab && hasPermission('leave', tab.action)) {
        return tabParam;
      }
    }
    return 'my-leave';
  };

  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);

  // Update tab when URL param changes
  useEffect(() => {
    if (tabParam && LEAVE_TABS.some(t => t.id === tabParam)) {
      const tab = LEAVE_TABS.find(t => t.id === tabParam);
      if (tab && hasPermission('leave', tab.action)) {
        setActiveTab(tabParam);
      }
    }
  }, [tabParam, hasPermission]);

  return (
    <DashboardLayout
      title={t('leave.title')}
      breadcrumbs={[
        { label: t('common.breadcrumbs.dashboard'), href: '/dashboard/personal' },
        { label: t('common.breadcrumbs.leave') },
      ]}
    >
      <PageTransition>
      {/* ===== TAB NAVIGATION ===== */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-3 px-1 custom-scrollbar flex-nowrap w-full snap-x">
        {LEAVE_TABS.map((tab) => {
          if (!hasPermission('leave', tab.action)) return null;

          const isActive = tab.id === activeTab;
          return (
             <Button variant="ghost" 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors whitespace-nowrap flex-shrink-0 snap-start ${isActive
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
                }`}
            >
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* ===== TAB CONTENT ===== */}
      <div className="min-h-[500px]">
        {activeTab === 'my-leave' && <MyLeaveContent />}
        {activeTab === 'team-requests' && <TeamLeaveContent />}
        {activeTab === 'allocation' && <LeaveAllocationContent />}
        {activeTab === 'balances' && <LeaveBalancesContent />}
        {activeTab === 'delegations' && <DelegationContent />}
        {activeTab === 'settings' && <LeaveSettingsContent />}
      </div>
      </PageTransition>
    </DashboardLayout>
  );
};
export default LeavePage;
