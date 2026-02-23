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
import { useTranslation } from 'react-i18next';

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>('daily');

  const ATTENDANCE_TABS = [
    { id: 'reports', label: t('attendance.tabs.reports'), roles: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] },
    { id: 'daily', label: t('attendance.tabs.daily'), roles: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] },
    { id: 'history', label: t('attendance.tabs.history'), roles: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] },
    { id: 'breaks', label: t('attendance.tabs.breaks'), roles: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] },
    { id: 'regularization', label: t('attendance.tabs.regularization'), roles: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] },
    { id: 'approvals', label: t('attendance.tabs.approvals'), roles: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] },
    { id: 'geofence', label: t('attendance.tabs.geofence'), roles: ['HR', 'ADMIN'] },
  ] as const;

  return (
    <DashboardLayout
      title={t('attendance.title')}
      breadcrumbs={[
        { label: t('common.breadcrumbs.dashboard'), href: '/dashboard' },
        { label: t('common.breadcrumbs.attendance') },
      ]}
    >
      <div className="space-y-6">
        <div>
          <p className="text-gray-500 dark:text-gray-400">{t('attendance.manageDescription')}</p>
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