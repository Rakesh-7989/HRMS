import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/utils/cn';
import { TimesheetDashboardCharts, TimesheetDashboardBreakdown } from '@/types/project.types';

// --- Components ---

const TaskList: React.FC<{ taskTypes: TimesheetDashboardBreakdown['task_types'] }> = ({ taskTypes }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
        <div className="flex items-center gap-2 mb-6">
            <h3 className="font-bold text-gray-800">Task types</h3>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{taskTypes.length}</span>
        </div>

        {/* Progress Bar - Only if data exists */}
        {taskTypes.length > 0 && (
            <div className="flex h-1.5 w-full rounded-full overflow-hidden mb-6 gap-0.5">
                {taskTypes.map((task, i) => (
                    <div key={i} className={cn(task.color)} style={{ width: `${100 / taskTypes.length}%` }} />
                ))}
            </div>
        )}

        <ul className="space-y-4">
            {taskTypes.map((task, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                        <div className={cn("w-2 h-2 rounded-full ring-2 ring-white shadow-sm", task.color)} />
                        <span className="text-gray-600 font-medium">{task.name}</span>
                    </div>
                    <span className="text-gray-400 font-medium">{task.time}</span>
                </li>
            ))}
        </ul>
    </div>
);

const ProjectsList: React.FC<{ projects: TimesheetDashboardBreakdown['projects'] }> = ({ projects }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-800">Projects</h3>
                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{projects.length}</span>
            </div>
            <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal size={16} /></button>
        </div>

        {/* Progress Bar */}
        {projects.length > 0 && (
            <div className="flex h-1.5 w-full rounded-full overflow-hidden mb-6 my-4 gap-0.5">
                {projects.slice(0, 4).map((proj, i) => (
                    <div key={i} className={cn(proj.color)} style={{ width: `${100 / Math.min(projects.length, 4)}%` }} />
                ))}
            </div>
        )}

        <ul className="space-y-3">
            {projects.map((project, i) => (
                <li key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                        <div className={cn("w-2 h-2 rounded-full", project.color)} />
                        <span className="text-gray-600 font-medium truncate max-w-[120px]">{project.name}</span>
                    </div>
                    <span className="text-gray-400 font-medium">{project.time}</span>
                </li>
            ))}
        </ul>
        <div className="mt-4 text-center">
            <button className="text-purple-600 text-xs font-bold border-b border-dashed border-purple-300 pb-0.5 hover:text-purple-700">Show more</button>
        </div>
    </div>
);

const MainChart: React.FC<{ data: TimesheetDashboardCharts['time_logged'] }> = ({ data }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-800">Time logged</h3>
            <select className="text-xs font-medium text-gray-400 bg-transparent border-none outline-none cursor-pointer hover:text-gray-600">
                <option>Last 30 days</option>
                <option>Last 7 days</option>
            </select>
        </div>

        <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
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
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        labelStyle={{ color: '#6b7280', marginBottom: '0.25rem', fontSize: '10px' }}
                        itemStyle={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: '12px' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="time"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorTime)"
                        activeDot={{ r: 6, strokeWidth: 0, fill: "#1f2937" }} // Mimic the black tooltip dot
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
);

interface MiddleSectionProps {
    charts: TimesheetDashboardCharts;
    breakdown: TimesheetDashboardBreakdown;
}

export const MiddleSection: React.FC<MiddleSectionProps> = ({ charts, breakdown }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[400px]">
            {/* Task Types - 3 cols */}
            <div className="lg:col-span-3">
                <TaskList taskTypes={breakdown.task_types} />
            </div>

            {/* Main Chart - 6 cols */}
            <div className="lg:col-span-6">
                <MainChart data={charts.time_logged} />
            </div>

            {/* Projects - 3 cols */}
            <div className="lg:col-span-3">
                <ProjectsList projects={breakdown.projects} />
            </div>
        </div>
    );
};
