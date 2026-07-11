import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog } from '@/components/ui/Dialog';

import { StatsSection } from './StatsSection';
import { MiddleSection } from './MiddleSection';
import { BottomSection } from './BottomSection';
import { timesheetService } from '@/services/timesheet.service';
import { TimesheetDashboardStats, TimesheetDashboardCharts, TimesheetDashboardBreakdown } from '@/types/project.types';
import { WeeklyTimesheetEntry } from './WeeklyTimesheetEntry';
import { TimesheetHistory } from './TimesheetHistory';
import { useTranslation } from 'react-i18next';

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export const TimesheetDashboard: React.FC = () => {
    const { t } = useTranslation();
    const [stats, setStats] = useState<TimesheetDashboardStats | null>(null);
    const [charts, setCharts] = useState<TimesheetDashboardCharts | null>(null);
    const [breakdown, setBreakdown] = useState<TimesheetDashboardBreakdown | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

    const fetchDashboardData = async () => {
        try {
            const data = await timesheetService.getDashboardData();
            setStats(data.stats);
            setCharts(data.charts);
            setBreakdown(data.breakdown);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleEntrySuccess = () => {
        setShowEntryForm(false);
        fetchDashboardData(); // Refresh data after submission
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="bg-gray-50/50 dark:bg-gray-950 min-h-full font-sans relative"
        >
            {/* Header Section */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('timesheets.title')}</h1>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-end">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                setSelectedDate(new Date());
                                setShowEntryForm(true);
                            }}
                            className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-elev-1 shadow-brand-200"
                        >
                            <Plus size={16} />
                            {t('timesheets.logTime')}
                        </button>
                    </div>
                </div>
            </motion.div>

            <div className="space-y-6">
                {stats && <motion.div variants={itemVariants}><StatsSection stats={stats} /></motion.div>}
                {charts && breakdown && <motion.div variants={itemVariants}><MiddleSection charts={charts} breakdown={breakdown} /></motion.div>}
                {charts && breakdown && stats && <motion.div variants={itemVariants}><BottomSection charts={charts} breakdown={breakdown} stats={stats} /></motion.div>}

                {/* History Section */}
                <motion.div variants={itemVariants}>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-elev-1 border border-gray-100 dark:border-white/10">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('timesheets.history')}</h3>
                        <TimesheetHistory
                            onWeekSelect={(date) => {
                                setSelectedDate(date);
                                setShowEntryForm(true);
                            }}
                        />
                    </div>
                </motion.div>
            </div>

            {/* Modal Overlay for Entry Form */}
            <Dialog
                open={showEntryForm}
                onOpenChange={setShowEntryForm}
                onBack={() => setShowEntryForm(false)}
                title={t('timesheets.logTime')}
                description="Record your weekly project activities and hours"
                className="max-w-[1200px]"
            >
                <div className="p-1">
                    <WeeklyTimesheetEntry
                        onSuccess={handleEntrySuccess}
                        onCancel={() => setShowEntryForm(false)}
                        initialDate={selectedDate}
                    />
                </div>
            </Dialog>
        </motion.div>
    );
};
