import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { DailyAttendanceContent } from '@/components/attendance/DailyAttendanceContent';
import { AttendanceReportsContent } from '@/components/attendance/AttendanceReportsContent';
import { RegularizationRequestsContent } from '@/components/attendance/RegularizationRequestsContent';
import { MyAttendanceContent } from '@/components/attendance/MyAttendanceContent';
import { GeoFencingSettingsContent } from '@/components/attendance/GeoFencingSettingsContent';
import { UnifiedBreaksContent } from '@/components/attendance/UnifiedBreaksContent';
import { UnifiedApprovalsContent } from '@/components/attendance/UnifiedApprovalsContent';

const ATTENDANCE_TABS = [
  { id: 'reports', label: 'Reports & Analytics', permission: 'attendance.view_all' },
  { id: 'daily', label: 'Daily Log', permission: 'attendance.view_own' },
  { id: 'history', label: 'My History', permission: 'attendance.view_own' },
  { id: 'breaks', label: 'Breaks', permission: 'attendance.view_own' },
  { id: 'regularization', label: 'Regularization', permission: 'attendance.view_own' },
  { id: 'approvals', label: 'Approvals & Requests', permission: 'attendance.approve' },
  { id: 'geofence', label: 'Geo-Fencing', permission: 'attendance.manage_settings' },
] as const;

export const AttendancePage: React.FC = () => {
  const { hasPermission } = useAuth();
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
              if (!hasPermission(tab.permission)) return null;

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
          {activeTab === 'breaks' && <UnifiedBreaksContent />}
          {activeTab === 'regularization' && <RegularizationRequestsContent />}
          {activeTab === 'approvals' && <UnifiedApprovalsContent />}
          {activeTab === 'reports' && <AttendanceReportsContent />}
          {activeTab === 'geofence' && <GeoFencingSettingsContent />}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AttendancePage;