import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TimesheetContent } from '@/components/payroll/TimesheetContent';
import { useAuth } from '@/contexts/AuthContext';

export const TimesheetPage: React.FC = () => {
    const { user } = useAuth();

    return (
        <DashboardLayout
            title="Timesheets"
            breadcrumbs={[
                { label: 'Dashboard', href: user?.role === 'ADMIN' || user?.role === 'HR' ? '/dashboard/organization' : '/dashboard/personal' },
                { label: 'Projects', href: '/projects' },
                { label: 'Timesheets' },
            ]}
        >
            <TimesheetContent />
        </DashboardLayout>
    );
};
