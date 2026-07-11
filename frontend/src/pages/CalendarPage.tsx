import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CalendarContent } from '@/components/calendar/CalendarContent';
import { motion } from 'framer-motion';
import { PageTransition } from '@/components/common/PageTransition';
import { useTranslation } from 'react-i18next';

export const CalendarPage: React.FC = () => {
  const { t: _t } = useTranslation();
    return (
        <DashboardLayout>
            <PageTransition className="p-3 sm:p-6">
                <CalendarContent />
            </PageTransition>
        </DashboardLayout>
    );
};

export default CalendarPage;
