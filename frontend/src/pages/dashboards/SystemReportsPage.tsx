import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area,
    PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    Building2, Users, DollarSign, Zap, ChevronLeft,
    TrendingUp, PieChart as PieChartIcon,
    Users2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '@/services/common/dashboard.service';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-100 dark:border-gray-800 p-3 rounded-xl shadow-xl">
                <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {entry.name}: {entry.name.toLowerCase().includes('revenue') ? `$${entry.value.toLocaleString()}` : entry.value.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const ReportCard = ({ title, children, icon: Icon, delay = 0 }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow"
    >
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                {Icon && <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-tight">{title}</h3>
        </div>
        <div className="h-64 w-full">
            {children}
        </div>
    </motion.div>
);

export const SystemReportsPage: React.FC = () => {
    const navigate = useNavigate();
    const { data: reports, isLoading } = useQuery({
        queryKey: ['system-reports'],
        queryFn: () => dashboardService.getSystemReports(),
        refetchInterval: 60000,
    });

    const chartData = useMemo(() => {
        if (!reports) return null;
        return {
            revenue: reports.mrrTrend?.map(d => ({
                date: format(new Date(d.date), 'MMM dd'),
                Revenue: parseFloat(d.revenue as any)
            })).reverse() || [],
            growth: reports.growthChurn?.map(d => ({
                month: format(new Date(d.month), 'MMM yy'),
                Tenants: d.new_tenants
            })).reverse() || [],
            usage: reports.usageTrend?.map(d => ({
                date: format(new Date(d.date), 'MMM dd'),
                Users: d.active_users
            })).reverse() || [],
            plans: reports.planDistribution || [],
            features: reports.featureUsage || []
        };
    }, [reports]);

    if (isLoading) {
        return (
            <DashboardLayout title="Reports">
                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-80 bg-gray-100 dark:bg-gray-800 rounded-[2rem] animate-pulse" />)}
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const stats = [
        { label: 'Total MRR', value: `$${reports?.stats.total_mrr?.toLocaleString() || '0'}`, icon: DollarSign, color: 'text-indigo-600', sub: 'Current monthly total' },
        { label: 'Active Tenants', value: reports?.stats.total_tenants || 0, icon: Building2, color: 'text-emerald-600', sub: 'Organizations onboarded' },
        { label: 'Daily Active Users', value: reports?.stats.active_users || 0, icon: Users, color: 'text-amber-600', sub: 'Last 24h activity' },
        { label: 'Avg Employees', value: Math.round(reports?.stats.avg_employees || 0), icon: Users2, color: 'text-purple-600', sub: 'Calculated per tenant' },
    ];

    return (
        <DashboardLayout
            title="System Analytics"
            breadcrumbs={[
                { label: 'Dashboard', href: '/dashboard/system' },
                { label: 'Reports' }
            ]}
        >
            <div className="p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Platform Insights</h1>
                        <p className="text-gray-500 dark:text-gray-400">Core business metrics and platform usage analytics</p>
                    </div>
                    <Button onClick={() => navigate('/dashboard/system')} className="rounded-xl px-6 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200">
                        <ChevronLeft className="w-5 h-5 mr-2" /> Back to Nexus
                    </Button>
                </div>

                {/* Summary Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((s, i) => (
                        <motion.div
                            key={s.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm group hover:border-indigo-200 transition-colors"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 group-hover:bg-indigo-50 transition-colors">
                                    <s.icon className={`w-5 h-5 ${s.color}`} />
                                </div>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{s.label}</span>
                            </div>
                            <div className="text-3xl font-black text-gray-900 dark:text-white">{s.value}</div>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">{s.sub}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Medium Level Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <ReportCard title="Revenue Growth" icon={DollarSign} delay={0.1}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData?.revenue}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="Revenue" stroke="#6366f1" fill="url(#colorRev)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ReportCard>

                    <ReportCard title="User Activity Trend" icon={TrendingUp} delay={0.2}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData?.usage}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="Users" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </ReportCard>

                    <ReportCard title="Subscription Mix" icon={PieChartIcon} delay={0.3}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData?.plans}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {chartData?.plans.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </ReportCard>

                    <ReportCard title="Module Popularity" icon={Zap} delay={0.4}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData?.features} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="feature" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} width={120} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="usage" fill="#8b5cf6" radius={[0, 8, 8, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ReportCard>
                </div>
            </div>
        </DashboardLayout>
    );
};
