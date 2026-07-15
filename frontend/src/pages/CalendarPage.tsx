import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CalendarContent } from '@/components/calendar/CalendarContent';
import { PageTransition } from '@/components/ui/PageTransition';

export const CalendarPage: React.FC = () => {
    return (
        <DashboardLayout>
            <PageTransition className="p-3 sm:p-6">
                <CalendarContent />
            </PageTransition>
        </DashboardLayout>
    );
};


