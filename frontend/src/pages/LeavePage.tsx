import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { MyLeaveContent } from '@/components/leave/MyLeaveContent';
import { TeamLeaveContent } from '@/components/leave/TeamLeaveContent';
import { LeaveSettingsContent } from '@/components/leave/LeaveSettingsContent';
import { LeaveBalancesContent } from '@/components/leave/LeaveBalancesContent';
import { LeaveAllocationContent } from '@/components/leave/LeaveAllocationContent';

const LEAVE_TABS = [
  { id: 'my-leave', label: 'My Leave', roles: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] },
  { id: 'team-requests', label: 'Team Requests', roles: ['MANAGER', 'HR', 'ADMIN'] },
  { id: 'allocation', label: 'Allocation', roles: ['HR', 'ADMIN'] },
  { id: 'balances', label: 'Balances', roles: ['HR', 'ADMIN'] },
  { id: 'settings', label: 'Settings', roles: ['HR', 'ADMIN'] },
] as const;

export const LeavePage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<typeof LEAVE_TABS[number]['id']>('my-leave');

  return (
    <DashboardLayout
      title="Leave Management"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard/personal' },
        { label: 'Leave' },
      ]}
    >
      {/* ===== TAB NAVIGATION ===== */}
      <div className="flex flex-wrap items-center gap-2 mb-6 overflow-x-auto pb-2">
        {LEAVE_TABS.map((tab) => {
          if (!(tab.roles as readonly string[]).includes(user?.role || '')) return null;

          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${isActive
                ? 'bg-primary text-white border-primary'
                : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
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
