import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/utils/cn';

interface StatCardProps {
    title: string;
    value: React.ReactNode;
    change: number;
    isPrimary?: boolean;
    unit?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, isPrimary }) => {
    return (
        <div className={cn(
            "p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden transition-all hover:shadow-md",
            isPrimary ? "bg-gradient-to-br from-purple-600 to-purple-400 text-white border-none shadow-purple-200" : "bg-white text-gray-800"
        )}>
            {isPrimary && (
                <div className="absolute -right-4 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            )}

            <div className="flex items-start justify-between relative z-10">
                <div className="flex items-baseline gap-1">
                    <h3 className="text-4xl font-bold tracking-tight">{value}</h3>
                </div>

                {change !== 0 && (
                    <div className={cn(
                        "flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-bold",
                        isPrimary ? "bg-white/20 text-white" : change > 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                    )}>
                        {change > 0 ? <ArrowUp size={10} strokeWidth={3} /> : <ArrowDown size={10} strokeWidth={3} />}
                        <span>{Math.abs(change)}</span>
                    </div>
                )}
            </div>

            <p className={cn(
                "font-medium text-sm relative z-10",
                isPrimary ? "text-purple-100" : "text-gray-400"
            )}>{title}</p>
        </div>
    );
};

import { TimesheetDashboardStats } from '@/types/project.types';

export const StatsSection: React.FC<{ stats: TimesheetDashboardStats }> = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
                title="Total time"
                value={<>{stats.total_time.hours}<span className="text-xl font-medium opacity-80">h</span>{stats.total_time.minutes.toString().padStart(2, '0')}</>}
                change={stats.total_time.trend}
                isPrimary
            />
            <StatCard
                title="Billable hours"
                value={<>{stats.billable_hours.hours}<span className="text-xl font-medium opacity-60 text-gray-400">h</span>{stats.billable_hours.minutes.toString().padStart(2, '0')}</>}
                change={stats.billable_hours.trend}
            />
            <StatCard
                title="Productivity score"
                value={<>{stats.productivity_score.value}<span className="text-xl font-medium opacity-60 text-gray-400">%</span></>}
                change={stats.productivity_score.trend}
            />
        </div>
    );
};
