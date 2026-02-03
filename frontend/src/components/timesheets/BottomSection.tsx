import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/utils/cn';
import { TimesheetDashboardCharts, TimesheetDashboardBreakdown, TimesheetDashboardStats } from '@/types/project.types';

// --- Components ---

const BillableTimeChart: React.FC<{ data: TimesheetDashboardCharts['billable_vs_non_billable'] }> = ({ data }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <h3 className="font-bold text-gray-800">Billable time</h3>
                <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 text-gray-500"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />Billable</span>
                    <span className="flex items-center gap-1 text-gray-500"><span className="w-1.5 h-1.5 rounded-full bg-gray-200" />Non-billable</span>
                </div>
            </div>
            <select className="text-xs font-medium text-gray-400 bg-transparent border-none outline-none cursor-pointer">
                <option>Last 30 days</option>
            </select>
        </div>

        <div className="flex-1 w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                    />
                    <RechartsTooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '4px', border: 'none', backgroundColor: '#1f2937', color: 'white', fontSize: '12px' }}
                    />
                    <Bar dataKey="billable" fill="#6366f1" radius={[4, 4, 4, 4]} />
                    <Bar dataKey="nonBillable" fill="#e5e7eb" radius={[4, 4, 4, 4]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
);

const BillableHoursStats: React.FC<{ stats: TimesheetDashboardStats }> = ({ stats }) => {
    // Calculate Non-Billable Time
    const totalMinutes = stats.total_time.hours * 60 + stats.total_time.minutes;
    const billableMinutes = stats.billable_hours.hours * 60 + stats.billable_hours.minutes;
    const nonBillableMinutes = Math.max(0, totalMinutes - billableMinutes);

    const nonBillableH = Math.floor(nonBillableMinutes / 60);
    const nonBillableM = nonBillableMinutes % 60;

    const pieData = [
        { name: 'Billable', value: billableMinutes },
        { name: 'Non-billable', value: nonBillableMinutes },
    ];
    const COLORS = ['#818cf8', '#f3f4f6'];

    const percentage = totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex items-center justify-between">
            <div className="flex flex-col justify-center gap-4">
                <h3 className="font-bold text-gray-800 mb-2">Billable hours, %</h3>

                <div>
                    <h4 className="text-2xl font-bold text-indigo-500">{stats.billable_hours.label}</h4>
                    <p className="text-xs font-medium text-gray-400 uppercase">Billable</p>
                </div>

                <div>
                    <h4 className="text-xl font-bold text-gray-400">{nonBillableH}h{nonBillableM.toString().padStart(2, '0')}</h4>
                    <p className="text-xs font-medium text-gray-400 uppercase">Non-billable</p>
                </div>
            </div>

            <div className="w-32 h-32 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={55}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            stroke="none"
                        >
                            {pieData.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-700">{percentage}%</span>
                </div>
            </div>
        </div>
    );
};

const PlansList: React.FC<{ plans: TimesheetDashboardBreakdown['plans'] }> = ({ plans }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
        <div className="flex items-center gap-2 mb-6">
            <h3 className="font-bold text-gray-800">Plans</h3>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{plans.length}</span>
        </div>

        {/* Progress Bar */}
        {plans.length > 0 && (
            <div className="flex h-1.5 w-full rounded-full overflow-hidden mb-6 gap-0.5">
                {plans.slice(0, 3).map((plan, i) => (
                    <div key={i} className={cn(plan.color)} style={{ width: `${100 / Math.min(plans.length, 3)}%` }} />
                ))}
            </div>
        )}

        <ul className="space-y-6">
            {plans.map((plan, i) => (
                <li key={i} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <div className={cn("w-1.5 h-1.5 rounded-full", plan.color)} />
                            <span className="text-gray-600 font-medium truncate max-w-[120px]">{plan.name}</span>
                        </div>
                        <span className="text-gray-400 font-medium">{plan.time}</span>
                    </div>
                </li>
            ))}
        </ul>
    </div>
);

interface BottomSectionProps {
    charts: TimesheetDashboardCharts;
    breakdown: TimesheetDashboardBreakdown;
    stats: TimesheetDashboardStats;
}

export const BottomSection: React.FC<BottomSectionProps> = ({ charts, breakdown, stats }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[320px]">
            {/* Billable Bar Chart - 6 cols (Approx half) */}
            <div className="lg:col-span-6">
                <BillableTimeChart data={charts.billable_vs_non_billable} />
            </div>

            {/* Billable Donut - 3 cols */}
            <div className="lg:col-span-3">
                <BillableHoursStats stats={stats} />
            </div>

            {/* Plans - 3 cols */}
            <div className="lg:col-span-3">
                <PlansList plans={breakdown.plans} />
            </div>
        </div>
    );
};
