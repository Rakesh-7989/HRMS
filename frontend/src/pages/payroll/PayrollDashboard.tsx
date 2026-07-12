import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import {
    Users, UserCheck, UserMinus, AlertCircle,
    PlayCircle, Clock,
    IndianRupee, Shield, ArrowRight, BarChart3,
    FileText, AlertTriangle, CheckCircle2, Building2,
    Calendar, Wallet, Activity
} from 'lucide-react';
import { showToast } from '@/utils/toast';
import {
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/ui/DataTable';

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
const cardClass = "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-elev-2 hover:shadow-elev-4 transition-all duration-300";

export const PayrollDashboard = () => {
    const { t } = useTranslation();
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
            showToast.error("Failed to load dashboard stats");
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
            showToast.success("New Payroll Run Started!");
            navigate(`/payroll/process/${res.data.id}`);
        } catch (error: any) {
            showToast.error(error.response?.data?.error || "Failed to start payroll run");
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'RELEASED': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
            case 'APPROVED': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
            case 'CALCULATED': return 'bg-brand-50 text-brand-600 border-brand-200 dark:bg-brand-500/20 dark:text-brand-400 dark:border-brand-800';
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
                    <div className="w-16 h-16 border-4 border-brand-200 dark:border-brand-800 border-t-brand-600 dark:border-t-brand-400 rounded-full animate-spin mx-auto" />
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
                        className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all shadow-elev-1"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                        className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all shadow-elev-1"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    >
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                </div>

                {/* Cost Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: t('payroll.totalCostToCompany'), value: stats?.costSummary.totalGross || 0, icon: Wallet, gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)', accent: 'text-brand-600', sub: `${stats?.costSummary.processedCount || 0} ${t('payroll.employeesCount')}` },
                        { label: t('payroll.totalNetPayout'), value: stats?.costSummary.totalNet || 0, icon: IndianRupee, gradient: 'linear-gradient(135deg, #10b981, #059669)', accent: 'text-emerald-600', sub: t('payroll.bankTransferAmount') },
                        { label: t('payroll.totalDeductions'), value: stats?.costSummary.totalDeductions || 0, icon: IndianRupee, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', accent: 'text-amber-600', sub: t('payroll.pfEsiPtTds') },
                        { label: t('payroll.taxDeductedTds'), value: stats?.costSummary.totalTds || 0, icon: Shield, gradient: 'linear-gradient(135deg, #ec4899, #db2777)', accent: 'text-pink-600', sub: t('payroll.incomeTaxWithheld') }
                    ].map((card, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -5, scale: 1.02 }}
                            className="relative group h-full"
                        >
                            <div className="relative overflow-hidden rounded-[1.5rem] p-5 h-full bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-white/5 shadow-elev-2 transition-all duration-300 hover:shadow-elev-4">
                                {/* Subtle Decorative Pattern */}
                                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <circle cx="80" cy="20" r="40" fill="currentColor" className="text-slate-900 dark:text-white" />
                                        <circle cx="10" cy="80" r="20" fill="currentColor" className="text-slate-900 dark:text-white" />
                                    </svg>
                                </div>

                                {/* Icon Accent */}
                                <div
                                    className="relative z-10 w-11 h-11 rounded-2xl flex items-center justify-center mb-4 shadow-elev-4 border border-white/10"
                                    style={{ background: card.gradient }}
                                >
                                    <card.icon className="w-5 h-5 text-white" />
                                </div>

                                {/* Content */}
                                <div className="relative z-10">
                                    <h3 className="text-3xl font-black mb-1 tracking-tighter leading-none text-slate-900 dark:text-white">
                                        {formatCurrency(card.value)}
                                    </h3>
                                    <p className="text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-2">{card.label}</p>
                                    <p className="text-slate-400/60 dark:text-slate-500/60 text-[9px] font-bold uppercase tracking-widest bg-neutral-50 dark:bg-white/5 px-2 py-0.5 rounded-full w-fit">
                                        {card.sub}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Headcount Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { label: t('reports.totalEmployees'), value: stats?.headcount.total || 0, icon: Users, accent: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-500/10', border: 'border-brand-100 dark:border-brand-500/20' },
                        { label: 'Included', value: stats?.headcount.included || 0, icon: UserCheck, accent: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20' },
                        { label: 'Excluded', value: stats?.headcount.excluded || 0, icon: UserMinus, accent: 'text-slate-500 dark:text-slate-400', bg: 'bg-neutral-50 dark:bg-white/5', border: 'border-neutral-100 dark:border-white/5' },
                        { label: 'Incomplete', value: stats?.headcount.incomplete || 0, icon: AlertCircle, accent: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20', alert: true },
                        { label: 'On Hold', value: stats?.headcount.onHold || 0, icon: Clock, accent: 'text-error-600 dark:text-error-400', bg: 'bg-error-50 dark:bg-error-500/10', border: 'border-error-100 dark:border-error-500/20' }
                    ].map((item, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + idx * 0.05 }}
                            className={`bg-white dark:bg-neutral-900 border ${item.border} rounded-2xl p-4 shadow-elev-2 hover:shadow-elev-4 transition-all duration-300`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">{item.label}</span>
                                <div className={`p-1.5 rounded-xl ${item.bg} border ${item.border}`}>
                                    <item.icon className={`w-3.5 h-3.5 ${item.accent}`} />
                                </div>
                            </div>
                            <div className={`text-3xl font-black tracking-tighter ${item.alert && (item.value as number) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                                {item.value}
                            </div>
                        </motion.div>
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
                            <div className="p-2 bg-brand-50 dark:bg-brand-500/20 rounded-lg">
                                <Activity className="w-5 h-5 text-brand-500 dark:text-brand-400" />
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
                                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-white/5" />
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
                            <div className="p-2 bg-brand-50 dark:bg-brand-500/20 rounded-lg">
                                <Building2 className="w-5 h-5 text-brand-500 dark:text-brand-400" />
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
                                <div className="flex items-center gap-3 p-3 bg-error-50 dark:bg-error-500/10 border border-error-200 dark:border-error-800 rounded-lg">
                                    <AlertCircle className="w-5 h-5 text-error-600 dark:text-error-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-error-700 dark:text-rose-300">
                                            {stats?.alerts.missingStructures} Missing Salary Structures
                                        </p>
                                        <p className="text-xs text-error-600 dark:text-error-500">Employees without salary assignment</p>
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
                        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-brand-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full -mr-16 -mt-16" />
                        <div className="relative z-10">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <div className="p-1.5 bg-brand-50 dark:bg-brand-500/20 rounded-lg">
                                    <Activity className="w-4 h-4 text-brand-500 dark:text-brand-400" />
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
                                    className="gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-purple-700 border-0 text-white shadow-elev-4 shadow-brand-500/25 transition-all duration-200 hover:shadow-brand-500/40"
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
                                                    className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${isActive ? 'bg-brand-500 text-white ring-4 ring-brand-100 dark:ring-indigo-900/50 scale-110' :
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
                                {t('payroll.recentRuns')}
                            </h3>
                        </div>
                        {(() => {
                            const columns = [
                                {
                                    header: t('payroll.period'),
                                    cell: (run: any) => (
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                                            {MONTHS[run.month - 1]} {run.year}
                                        </span>
                                    ),
                                },
                                {
                                    header: t('payroll.stage'),
                                    cell: (run: any) => (
                                        <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/20 px-2 py-0.5 rounded">{run.stage}</span>
                                    ),
                                },
                                {
                                    header: t('common.status'),
                                    cell: (run: any) => (
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(run.status)}`}>
                                            {run.status}
                                        </span>
                                    ),
                                },
                                {
                                    header: t('payroll.gross'),
                                    cell: (run: any) => (
                                        <span className="text-right text-gray-700 dark:text-gray-300 font-mono text-xs">{formatCurrency(run.totalGross)}</span>
                                    ),
                                },
                                {
                                    header: t('payroll.net'),
                                    cell: (run: any) => (
                                        <span className="text-right text-emerald-600 dark:text-emerald-400 font-mono text-xs">{formatCurrency(run.totalNet)}</span>
                                    ),
                                },
                                {
                                    header: t('payroll.employees'),
                                    cell: (run: any) => (
                                        <span className="text-center text-gray-500 dark:text-gray-400">{run.totalEmployees}</span>
                                    ),
                                },
                                {
                                    header: t('common.actions'),
                                    cell: (run: any) => (
                                         <Button variant="ghost" 
                                            onClick={() => navigate(`/payroll/process/${run.id}`)}
                                            className="p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-indigo-900/30 text-brand-500 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
                                            title={t('payroll.viewRun')}
                                        >
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    ),
                                },
                            ];
                            return (
                                <DataTable
                                    columns={columns}
                                    data={stats.recentHistory}
                                    pageSize={10}
                                    emptyMessage={t('payroll.noRuns')}
                                />
                            );
                        })()}
                    </div>
                )}
            </div>
        </>
    );
};

export default PayrollDashboard;
