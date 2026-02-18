import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TimesheetContent } from '@/components/payroll/TimesheetContent';
import { useAuth } from '@/contexts/AuthContext';

export const TimesheetPage: React.FC = () => {
    const { hasPermission } = useAuth();

    return (
        <DashboardLayout
            title="Timesheets"
            breadcrumbs={[
                { label: 'Dashboard', href: hasPermission('view_admin_dashboard') ? '/dashboard/organization' : '/dashboard/personal' },
                { label: 'Projects', href: '/projects' },
                { label: 'Timesheets' },
            ]}
        >
            <TimesheetContent />
        </DashboardLayout>
    );
};
