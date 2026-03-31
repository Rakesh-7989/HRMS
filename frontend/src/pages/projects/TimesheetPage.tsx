import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TimesheetContent } from '@/components/payroll/TimesheetContent';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export const TimesheetPage: React.FC = () => {
  const { t } = useTranslation();
    const { user } = useAuth();

    return (
        <DashboardLayout
            title="Timesheets"
            breadcrumbs={[
                { label: t('common.breadcrumbs.dashboard'), href: user?.role === 'ADMIN' || user?.role === 'HR' ? '/dashboard/organization' : '/dashboard/personal' },
                { label: t('common.breadcrumbs.projects'), href: '/projects' },
                { label: 'Timesheets' },
            ]}
        >
            <TimesheetContent />
        </DashboardLayout>
    );
};
