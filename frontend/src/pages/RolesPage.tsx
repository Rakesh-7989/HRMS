import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RolesContent } from '@/components/organization/RolesContent';

export const RolesPage: React.FC = () => {
    return (
        <DashboardLayout
            title="Roles & Permissions"
            breadcrumbs={[
                { label: 'Dashboard', href: '/dashboard/system' },
                { label: 'Roles' }
            ]}
        >
            <RolesContent />
        </DashboardLayout>
    );
};
