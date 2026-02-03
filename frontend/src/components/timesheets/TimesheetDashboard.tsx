import React, { useEffect, useState } from 'react';
import { Search, Bell, Mail, Plus, X } from 'lucide-react';
import { StatsSection } from './StatsSection';
import { MiddleSection } from './MiddleSection';
import { BottomSection } from './BottomSection';
import { timesheetService } from '@/services/timesheet.service';
import { TimesheetDashboardStats, TimesheetDashboardCharts, TimesheetDashboardBreakdown } from '@/types/project.types';
import { TimesheetEntryForm } from '@/components/projects/TimesheetEntryForm';

export const TimesheetDashboard: React.FC = () => {
    const [stats, setStats] = useState<TimesheetDashboardStats | null>(null);
    const [charts, setCharts] = useState<TimesheetDashboardCharts | null>(null);
    const [breakdown, setBreakdown] = useState<TimesheetDashboardBreakdown | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEntryForm, setShowEntryForm] = useState(false);

    const fetchDashboardData = async () => {
        try {
            // setLoading(true); // Don't block UI on refresh
            const [statsData, chartsData, breakdownData] = await Promise.all([
                timesheetService.getDashboardStats(),
                timesheetService.getDashboardCharts(),
                timesheetService.getDashboardBreakdown()
            ]);
            setStats(statsData);
            setCharts(chartsData);
            setBreakdown(breakdownData);
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
        <div className="bg-gray-50/50 min-h-full font-sans animate-fadeIn relative">
            {/* Header Section matching the image's top part within the content area */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Timesheets</h1>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-end">
                    <div className="relative hidden md:block">
                        <Search className="text-gray-300 absolute left-0 top-1/2 -translate-y-1/2" size={20} />
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowEntryForm(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm shadow-purple-200"
                        >
                            <Plus size={16} />
                            Log Time
                        </button>

                        <button className="text-gray-400 hover:text-gray-600 relative">
                            <Bell size={20} />
                            <span className="absolute top-0 right-0 w-2 h-2 bg-red-400 rounded-full border-2 border-white"></span>
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                            <Mail size={20} />
                        </button>
                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm">
                            <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Profile" className="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {stats && <StatsSection stats={stats} />}
                {charts && breakdown && <MiddleSection charts={charts} breakdown={breakdown} />}
                {charts && breakdown && stats && <BottomSection charts={charts} breakdown={breakdown} stats={stats} />}
            </div>

            {/* Modal Overlay for Entry Form */}
            {showEntryForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl relative animate-scaleIn m-4">
                        <button
                            onClick={() => setShowEntryForm(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                        >
                            <X size={24} />
                        </button>
                        <div className="max-h-[85vh] overflow-y-auto rounded-2xl">
                            <TimesheetEntryForm onSuccess={handleEntrySuccess} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
