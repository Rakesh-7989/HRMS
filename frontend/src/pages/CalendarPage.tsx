import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CalendarContent } from '@/components/calendar/CalendarContent';
import { motion } from 'framer-motion';

export const CalendarPage: React.FC = () => {
    return (
        <DashboardLayout>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 touch-none"
            >
                <CalendarContent />
            </motion.div>
        </DashboardLayout>
    );
};

export default CalendarPage;
