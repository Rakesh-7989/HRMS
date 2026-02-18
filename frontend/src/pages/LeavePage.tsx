import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { MyLeaveContent } from '@/components/leave/MyLeaveContent';
import { TeamLeaveContent } from '@/components/leave/TeamLeaveContent';
import { LeaveSettingsContent } from '@/components/leave/LeaveSettingsContent';
import { LeaveBalancesContent } from '@/components/leave/LeaveBalancesContent';
import { LeaveAllocationContent } from '@/components/leave/LeaveAllocationContent';

const LEAVE_TABS = [
  { id: 'my-leave', label: 'My Leave', permission: 'leave.view_own' },
  { id: 'team-requests', label: 'Team Requests', permission: 'leave.approve' },
  { id: 'allocation', label: 'Allocation', permission: 'leave.manage_settings' },
  { id: 'balances', label: 'Balances', permission: 'leave.manage_settings' },
  { id: 'settings', label: 'Settings', permission: 'leave.manage_settings' },
] as const;

type TabId = typeof LEAVE_TABS[number]['id'];

export const LeavePage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabId | null;

  // Initialize from URL param if valid, otherwise default to 'my-leave'
  const getInitialTab = (): TabId => {
    if (tabParam && LEAVE_TABS.some(t => t.id === tabParam)) {
      // Check if user has access to this tab
      const tab = LEAVE_TABS.find(t => t.id === tabParam);
      if (tab && hasPermission(tab.permission)) {
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
      if (tab && hasPermission(tab.permission)) {
        setActiveTab(tabParam);
      }
    }
  }, [tabParam, hasPermission]);

  return (
    <DashboardLayout
      title="Leave Management"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard/personal' },
        { label: 'Leave' },
      ]}
    >
      {/* ===== TAB NAVIGATION ===== */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-3 px-1 custom-scrollbar flex-nowrap w-full snap-x">
        {LEAVE_TABS.map((tab) => {
          if (!hasPermission(tab.permission)) return null;

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
        {activeTab === 'settings' && <LeaveSettingsContent />}
      </div>
    </DashboardLayout>
  );
};
export default LeavePage;
