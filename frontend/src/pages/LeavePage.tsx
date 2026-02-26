import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { MyLeaveContent } from '@/components/leave/MyLeaveContent';
import { TeamLeaveContent } from '@/components/leave/TeamLeaveContent';
import { LeaveSettingsContent } from '@/components/leave/LeaveSettingsContent';
import { LeaveBalancesContent } from '@/components/leave/LeaveBalancesContent';
import { LeaveAllocationContent } from '@/components/leave/LeaveAllocationContent';
import { DelegationContent } from '@/components/leave/DelegationContent';
import { useTranslation } from 'react-i18next';

export const LeavePage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const LEAVE_TABS = [
    { id: 'my-leave', label: t('leave.tabs.myLeave'), roles: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] },
    { id: 'team-requests', label: t('leave.tabs.teamRequests'), roles: ['MANAGER', 'HR', 'ADMIN'] },
    { id: 'allocation', label: t('leave.tabs.allocation'), roles: ['HR', 'ADMIN'] },
    { id: 'balances', label: t('leave.tabs.balances'), roles: ['HR', 'ADMIN'] },
    { id: 'delegations', label: 'Delegations', roles: ['MANAGER', 'HR', 'ADMIN'] },
    { id: 'settings', label: t('leave.tabs.settings'), roles: ['HR', 'ADMIN'] },
  ] as const;

  type TabId = typeof LEAVE_TABS[number]['id'];
  const tabParam = searchParams.get('tab') as TabId | null;

  // Initialize from URL param if valid, otherwise default to 'my-leave'
  const getInitialTab = (): TabId => {
    if (tabParam && LEAVE_TABS.some(t => t.id === tabParam)) {
      // Check if user has access to this tab
      const tab = LEAVE_TABS.find(t => t.id === tabParam);
      if (tab && (tab.roles as readonly string[]).includes(user?.role || '')) {
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
      if (tab && (tab.roles as readonly string[]).includes(user?.role || '')) {
        setActiveTab(tabParam);
      }
    }
  }, [tabParam, user?.role]);

  return (
    <DashboardLayout
      title={t('leave.title')}
      breadcrumbs={[
        { label: t('common.breadcrumbs.dashboard'), href: '/dashboard/personal' },
        { label: t('common.breadcrumbs.leave') },
      ]}
    >
      {/* ===== TAB NAVIGATION ===== */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-3 px-1 custom-scrollbar flex-nowrap w-full snap-x">
        {LEAVE_TABS.map((tab) => {
          if (!(tab.roles as readonly string[]).includes(user?.role || '')) return null;

          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors whitespace-nowrap flex-shrink-0 snap-start ${isActive
                ? 'bg-primary text-white border-primary'
                : 'bg-white border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
                }`}
            >
              {tab.label}
            </button>
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
    </DashboardLayout>
  );
};
export default LeavePage;
