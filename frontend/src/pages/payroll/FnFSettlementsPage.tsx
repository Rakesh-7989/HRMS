import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { FnFSettlementsContent } from './FnFSettlementsContent';
import { useTranslation } from 'react-i18next';


const FnFSettlementsPage: React.FC = () => {
  const { t } = useTranslation();

    return (
        <DashboardLayout
            title="F&F Settlements"
            breadcrumbs={[{ label: t('common.breadcrumbs.payroll'), href: '/payroll' }, { label: 'F&F' }]}
            actions={
                <Button size="sm" variant="outline" onClick={() => window.history.back()}>Back</Button>
            }
        >
            <FnFSettlementsContent />
        </DashboardLayout>
    );
};

export { FnFSettlementsPage };
