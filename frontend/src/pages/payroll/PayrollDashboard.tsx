import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import {
    Users, UserCheck, UserMinus, AlertCircle,
    PlayCircle, Clock,
    DollarSign, Shield, ArrowRight, BarChart3,
    FileText, AlertTriangle, CheckCircle2, Building2,
    Calendar, Wallet, Receipt, Activity
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area
} from 'recharts';

interface DashboardStats {
    runStatus: {
        id: string;
        stage: string;
        status: string;
        verificationStatus: string;
        lastUpdated: string;
        releasedAt: string | null;
    } | null;
    headcount: {
        total: number;
        included: number;
        excluded: number;
        incomplete: number;
        onHold: number;
    };
    costSummary: {
        totalGross: number;
        totalNet: number;
        totalDeductions: number;
        totalTds: number;
        processedCount: number;
    };
    monthlyTrend: Array<{
        month: number;
        year: number;
        status: string;
        totalGross: number;
        totalNet: number;
        employeeCount: number;
    }>;
    departmentCosts: Array<{
        department: string;
        totalCost: number;
        employeeCount: number;
    }>;
    statutorySummary: Array<{
        component: string;
        total: number;
    }>;
    alerts: {
        pendingLeaves: number;
        missingStructures: number;
    };
    arrearsSummary?: {
        pendingCount: number;
        pendingAmount: number;
    };
    recentHistory: Array<{
        id: string;
        month: number;
        year: number;
        stage: string;
        status: string;
        verificationStatus: string;
        totalGross: number;
        totalNet: number;
        totalEmployees: number;
        createdAt: string;
        releasedAt: string | null;
    }>;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

const formatCurrency = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Reusable card class for consistent light/dark theming
const cardClass = "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm";

export const PayrollDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/payroll/river/dashboard?month=${selectedMonth}&year=${selectedYear}`);
            setStats(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load dashboard stats");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, [selectedMonth, selectedYear]);

    const handleStartProcess = async () => {
        if (stats?.runStatus) {
            navigate(`/payroll/process/${stats.runStatus.id}`);
            return;
        }
        try {
            setLoading(true);
            const res = await api.post('/payroll/river/run', { month: selectedMonth, year: selectedYear });
            toast.success("New Payroll Run Started!");
            navigate(`/payroll/process/${res.data.id}`);
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to start payroll run");
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'RELEASED': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
            case 'APPROVED': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
            case 'CALCULATED': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
            case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
            default: return 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
        }
    };

    const trendChartData = stats?.monthlyTrend.map(t => ({
        name: `${MONTHS[t.month - 1]} ${t.year.toString().slice(2)}`,
        gross: t.totalGross,
        net: t.totalNet,
        employees: t.employeeCount
    })) || [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mx-auto" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">Loading Payroll Analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                {/* Filters */}
                <div className="flex justify-end items-center mb-6 gap-2">
                    <select
                        className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all shadow-sm"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                        className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all shadow-sm"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    >
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                </div>

                {/* Cost Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Cost to Company', value: stats?.costSummary.totalGross || 0, icon: Wallet, gradient: 'from-indigo-500 to-blue-600', sub: `${stats?.costSummary.processedCount || 0} employees` },
                        { label: 'Total Net Payout', value: stats?.costSummary.totalNet || 0, icon: DollarSign, gradient: 'from-emerald-500 to-teal-600', sub: 'Bank transfer amount' },
                        { label: 'Total Deductions', value: stats?.costSummary.totalDeductions || 0, icon: Receipt, gradient: 'from-amber-500 to-orange-600', sub: 'PF + ESI + PT + TDS' },
                        { label: 'Pending Arrears', value: stats?.arrearsSummary?.pendingAmount || 0, icon: Clock, gradient: 'from-fuchsia-500 to-purple-600', sub: `${stats?.arrearsSummary?.pendingCount || 0} employees`, path: '/payroll/arrears' },
                        { label: 'Tax Deducted (TDS)', value: stats?.costSummary.totalTds || 0, icon: Shield, gradient: 'from-rose-500 to-pink-600', sub: 'Income tax withheld' }
                    ].map((card, idx) => (
                        <div
                            key={idx}
                            onClick={() => card.path && navigate(card.path)}
                            className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-lg 
                                ${card.path ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-2' : 'hover:shadow-xl hover:-translate-y-1'} 
                                transition-all duration-300 group`}
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-3">
                                    <card.icon className="w-5 h-5 opacity-90" />
                                    <span className="text-sm font-medium opacity-90">{card.label}</span>
                                </div>
                                <div className="text-2xl font-bold tracking-tight">{formatCurrency(card.value)}</div>
                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs opacity-75">{card.sub}</p>
                                    {card.path && <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1" />}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Headcount Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { label: 'Total Employees', value: stats?.headcount.total || 0, icon: Users, color: 'text-indigo-600 dark:text-indigo-400', bgIcon: 'bg-indigo-50 dark:bg-indigo-900/30', borderColor: 'border-indigo-100 dark:border-indigo-800' },
                        { label: 'Included', value: stats?.headcount.included || 0, icon: UserCheck, color: 'text-emerald-600 dark:text-emerald-400', bgIcon: 'bg-emerald-50 dark:bg-emerald-900/30', borderColor: 'border-emerald-100 dark:border-emerald-800' },
                        { label: 'Excluded', value: stats?.headcount.excluded || 0, icon: UserMinus, color: 'text-slate-500 dark:text-slate-400', bgIcon: 'bg-slate-50 dark:bg-slate-800', borderColor: 'border-slate-100 dark:border-slate-700' },
                        { label: 'Incomplete', value: stats?.headcount.incomplete || 0, icon: AlertCircle, color: 'text-amber-600 dark:text-amber-400', bgIcon: 'bg-amber-50 dark:bg-amber-900/30', borderColor: 'border-amber-100 dark:border-amber-800', alert: true },
                        { label: 'On Hold', value: stats?.headcount.onHold || 0, icon: Clock, color: 'text-rose-600 dark:text-rose-400', bgIcon: 'bg-rose-50 dark:bg-rose-900/30', borderColor: 'border-rose-100 dark:border-rose-800' }
                    ].map((item, idx) => (
                        <div key={idx} className={`bg-white dark:bg-gray-800 border ${item.borderColor} rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{item.label}</span>
                                <div className={`p-1.5 rounded-lg ${item.bgIcon}`}>
                                    <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                                </div>
                            </div>
                            <div className={`text-2xl font-bold ${item.alert && (item.value as number) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                                {item.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Trend Chart (2 cols) */}
                    <div className={`lg:col-span-2 ${cardClass} p-5`}>
                        <div className="flex justify-between items-center mb-5">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payroll Trend</h3>
                                <p className="text-xs text-gray-400 dark:text-gray-500">Monthly gross vs net payout</p>
                            </div>
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                <Activity className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                            </div>
                        </div>
                        {trendChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={240}>
                                <AreaChart data={trendChartData}>
                                    <defs>
                                        <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #f1f5f9)" className="[.dark_&]:stroke-gray-700" />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => formatCurrency(v)} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--tooltip-bg, #fff)', border: '1px solid var(--tooltip-border, #e2e8f0)', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', color: 'var(--tooltip-text, #1f2937)' }}
                                        formatter={(value: number) => [formatCurrency(value)]}
                                    />
                                    <Area type="monotone" dataKey="gross" stroke="#6366f1" fill="url(#grossGradient)" strokeWidth={2.5} name="Gross" dot={{ fill: '#6366f1', r: 3 }} />
                                    <Area type="monotone" dataKey="net" stroke="#10b981" fill="url(#netGradient)" strokeWidth={2.5} name="Net" dot={{ fill: '#10b981', r: 3 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-60 flex items-center justify-center text-gray-400 dark:text-gray-500">
                                <div className="text-center">
                                    <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">No payroll data yet. Run your first payroll to see trends.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Department Cost Breakdown */}
                    <div className={`${cardClass} p-5`}>
                        <div className="flex justify-between items-center mb-5">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dept. Costs</h3>
                                <p className="text-xs text-gray-400 dark:text-gray-500">Cost distribution</p>
                            </div>
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                                <Building2 className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                            </div>
                        </div>
                        {stats?.departmentCosts && stats.departmentCosts.length > 0 ? (
                            <div className="space-y-4">
                                {stats.departmentCosts.slice(0, 6).map((dept, idx) => {
                                    const maxCost = stats.departmentCosts[0]?.totalCost || 1;
                                    const percent = (dept.totalCost / maxCost * 100).toFixed(0);
                                    return (
                                        <div key={idx}>
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[60%]">{dept.department}</span>
                                                <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">{formatCurrency(dept.totalCost)}</span>
                                            </div>
                                            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                                    style={{
                                                        width: `${percent}%`,
                                                        background: `linear-gradient(90deg, ${CHART_COLORS[idx % CHART_COLORS.length]}, ${CHART_COLORS[(idx + 1) % CHART_COLORS.length]})`
                                                    }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{dept.employeeCount} employees</p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                                No department data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Alerts & Process Status */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Quick Alerts */}
                    <div className={`${cardClass} p-5`}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <div className="p-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                                <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                            </div>
                            Quick Alerts
                        </h3>
                        <div className="space-y-3">
                            {(stats?.alerts.pendingLeaves || 0) > 0 && (
                                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                    <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                            {stats?.alerts.pendingLeaves} Pending Leave Requests
                                        </p>
                                        <p className="text-xs text-amber-600 dark:text-amber-500">Approve before running payroll</p>
                                    </div>
                                </div>
                            )}
                            {(stats?.alerts.missingStructures || 0) > 0 && (
                                <div className="flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
                                    <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
                                            {stats?.alerts.missingStructures} Missing Salary Structures
                                        </p>
                                        <p className="text-xs text-rose-600 dark:text-rose-500">Employees without salary assignment</p>
                                    </div>
                                </div>
                            )}
                            {(stats?.alerts.pendingLeaves || 0) === 0 && (stats?.alerts.missingStructures || 0) === 0 && (
                                <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">All Clear!</p>
                                        <p className="text-xs text-emerald-600 dark:text-emerald-500">No pending actions for payroll</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Process Status Card */}
                    <div className={`${cardClass} p-5 relative overflow-hidden`}>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full -mr-16 -mt-16" />
                        <div className="relative z-10">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                    <Activity className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                                </div>
                                Payroll Status — {MONTHS[selectedMonth - 1]} {selectedYear}
                            </h3>
                            <div className="flex justify-between items-center">
                                <div>
                                    {stats?.runStatus ? (
                                        <>
                                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(stats.runStatus.status)}`}>
                                                {stats.runStatus.stage} • {stats.runStatus.status}
                                            </span>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                                Updated: {new Date(stats.runStatus.lastUpdated).toLocaleString()}
                                            </p>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                                            <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse" />
                                            <span className="text-sm">Not Started</span>
                                        </div>
                                    )}
                                </div>
                                <Button
                                    size="sm"
                                    onClick={handleStartProcess}
                                    className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0 text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-indigo-500/40"
                                >
                                    {stats?.runStatus ? 'Continue' : 'Start Payroll'}
                                    <PlayCircle className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Mini Stepper */}
                            {stats?.runStatus && (
                                <div className="flex items-center gap-1 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    {['REVIEW', 'INITIATE', 'VERIFY', 'RELEASE'].map((stage, idx) => {
                                        const stages = ['REVIEW', 'INITIATE', 'VERIFY', 'RELEASE'];
                                        const currentIdx = stages.indexOf(stats.runStatus!.stage);
                                        const isActive = stage === stats.runStatus!.stage;
                                        const isCompleted = idx < currentIdx;
                                        return (
                                            <React.Fragment key={stage}>
                                                <div
                                                    className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${isActive ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/50 scale-110' :
                                                        isCompleted ? 'bg-emerald-500 text-white' :
                                                            'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                                                        }`}
                                                >
                                                    {isCompleted ? '✓' : idx + 1}
                                                </div>
                                                {idx < 3 && (
                                                    <div className={`flex-1 h-0.5 rounded ${isCompleted ? 'bg-emerald-400' : 'bg-gray-100 dark:bg-gray-700'}`} />
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Payroll History */}
                {stats?.recentHistory && stats.recentHistory.length > 0 && (
                    <div className={`${cardClass} p-5`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <div className="p-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                </div>
                                Recent Payroll Runs
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                                        <th className="text-left py-3 px-2 font-medium">Period</th>
                                        <th className="text-left py-3 px-2 font-medium">Stage</th>
                                        <th className="text-left py-3 px-2 font-medium">Status</th>
                                        <th className="text-right py-3 px-2 font-medium">Gross</th>
                                        <th className="text-right py-3 px-2 font-medium">Net</th>
                                        <th className="text-center py-3 px-2 font-medium">Employees</th>
                                        <th className="text-right py-3 px-2 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recentHistory.map((run) => (
                                        <tr key={run.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">
                                                {MONTHS[run.month - 1]} {run.year}
                                            </td>
                                            <td className="py-3 px-2">
                                                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">{run.stage}</span>
                                            </td>
                                            <td className="py-3 px-2">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(run.status)}`}>
                                                    {run.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300 font-mono text-xs">
                                                {formatCurrency(run.totalGross)}
                                            </td>
                                            <td className="py-3 px-2 text-right text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                                                {formatCurrency(run.totalNet)}
                                            </td>
                                            <td className="py-3 px-2 text-center text-gray-500 dark:text-gray-400">
                                                {run.totalEmployees}
                                            </td>
                                            <td className="py-3 px-2 text-right">
                                                <button
                                                    onClick={() => navigate(`/payroll/process/${run.id}`)}
                                                    className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                                                >
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default PayrollDashboard;
