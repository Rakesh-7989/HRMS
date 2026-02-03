import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { DailyAttendanceContent } from '@/components/attendance/DailyAttendanceContent';
import { TeamAttendanceContent } from '@/components/attendance/TeamAttendanceContent';
import { AttendanceReportsContent } from '@/components/attendance/AttendanceReportsContent';
import { RegularizationRequestsContent } from '@/components/attendance/RegularizationRequestsContent';
import { MyAttendanceContent } from '@/components/attendance/MyAttendanceContent';
import { GeoFencingSettingsContent } from '@/components/attendance/GeoFencingSettingsContent';
import { WFHApprovalsContent } from '@/components/wfh/WFHApprovalsContent';
import { MyWFHRequestsContent } from '@/components/wfh/MyWFHRequestsContent';
import { BreakHistoryContent } from '@/components/attendance/BreakHistoryContent';
import { CurrentBreaksContent } from '@/components/attendance/CurrentBreaksContent';

const ATTENDANCE_TABS = [
  { id: 'daily', label: 'Daily Log', roles: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] },
  { id: 'history', label: 'My History', roles: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] },
  { id: 'break-history', label: 'Break History', roles: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] },
  { id: 'current-breaks', label: 'On Break', roles: ['MANAGER', 'HR', 'ADMIN'] },
  { id: 'regularization', label: 'Regularization', roles: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] },
  { id: 'my-wfh', label: 'My WFH Requests', roles: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] },
  { id: 'team', label: 'Team & Approvals', roles: ['MANAGER', 'HR', 'ADMIN'] },
  { id: 'wfh-approvals', label: 'WFH Approvals', roles: ['MANAGER', 'HR', 'ADMIN'] },
  { id: 'reports', label: 'Reports & Analytics', roles: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] },
  { id: 'geofence', label: 'Geo-Fencing', roles: ['HR', 'ADMIN'] },
] as const;

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('daily');

  return (
    <DashboardLayout
      title="Attendance"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Attendance' },
      ]}
    >
      <div className="space-y-6">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Manage your daily attendance and view reports.</p>
        </div>

        {/* ===== CATEGORY CONTROLS ===== */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-nowrap -mb-px gap-6 overflow-x-auto pb-1 scrollbar-hide">
            {ATTENDANCE_TABS.map((tab) => {
              if (!user?.role || !tab.roles.includes(user.role as any)) return null;

              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== CONTENT FOR TABS ===== */}
        <div className="min-h-[500px]">
          {activeTab === 'daily' && <DailyAttendanceContent />}
          {activeTab === 'history' && <MyAttendanceContent />}
          {activeTab === 'break-history' && <BreakHistoryContent />}
          {activeTab === 'current-breaks' && <CurrentBreaksContent />}
          {activeTab === 'regularization' && <RegularizationRequestsContent />}
          {activeTab === 'my-wfh' && <MyWFHRequestsContent />}
          {activeTab === 'team' && <TeamAttendanceContent />}
          {activeTab === 'wfh-approvals' && <WFHApprovalsContent />}
          {activeTab === 'reports' && <AttendanceReportsContent />}
          {activeTab === 'geofence' && <GeoFencingSettingsContent />}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AttendancePage;