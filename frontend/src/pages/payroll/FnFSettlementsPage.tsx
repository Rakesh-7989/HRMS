import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { FnFSettlementsContent } from './FnFSettlementsContent';


const FnFSettlementsPage: React.FC = () => {
    return (
        <DashboardLayout
            title="F&F Settlements"
            breadcrumbs={[{ label: 'Payroll', href: '/payroll' }, { label: 'F&F' }]}
            actions={
                <Button size="sm" variant="outline" onClick={() => window.history.back()}>Back</Button>
            }
        >
            <FnFSettlementsContent />
        </DashboardLayout>
    );
};

export default FnFSettlementsPage;
