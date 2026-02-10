import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { StatsSection } from './StatsSection';
import { MiddleSection } from './MiddleSection';
import { BottomSection } from './BottomSection';
import { timesheetService } from '@/services/timesheet.service';
import { TimesheetDashboardStats, TimesheetDashboardCharts, TimesheetDashboardBreakdown } from '@/types/project.types';
import { WeeklyTimesheetEntry } from './WeeklyTimesheetEntry';

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
    const [stats, setStats] = useState<TimesheetDashboardStats | null>(null);
    const [charts, setCharts] = useState<TimesheetDashboardCharts | null>(null);
    const [breakdown, setBreakdown] = useState<TimesheetDashboardBreakdown | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEntryForm, setShowEntryForm] = useState(false);

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
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="bg-gray-50/50 min-h-full font-sans relative"
        >
            {/* Header Section */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Timesheets</h1>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-end">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowEntryForm(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm shadow-purple-200"
                        >
                            <Plus size={16} />
                            Log Time
                        </button>
                    </div>
                </div>
            </motion.div>

            <div className="space-y-6">
                {stats && <motion.div variants={itemVariants}><StatsSection stats={stats} /></motion.div>}
                {charts && breakdown && <motion.div variants={itemVariants}><MiddleSection charts={charts} breakdown={breakdown} /></motion.div>}
                {charts && breakdown && stats && <motion.div variants={itemVariants}><BottomSection charts={charts} breakdown={breakdown} stats={stats} /></motion.div>}
            </div>

            {/* Modal Overlay for Entry Form */}
            <AnimatePresence>
                {showEntryForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    >
                        <motion.div
                            key="modal"
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl relative m-4"
                        >
                            <button
                                onClick={() => setShowEntryForm(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10 p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X size={24} />
                            </button>
                            <div className="max-h-[85vh] overflow-y-auto rounded-2xl">
                                <WeeklyTimesheetEntry onSuccess={handleEntrySuccess} onCancel={() => setShowEntryForm(false)} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
