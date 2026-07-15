import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PageTransition } from '@/components/ui/PageTransition';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { dashboardService } from '@/services/dashboard.service';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Activity, Users, Shield, ChevronRight,
  Server, Database, Zap, Globe, Settings, Plus,
  Sparkles, Tag, UserX
} from 'lucide-react';
import { format } from 'date-fns';
import {
  AreaChart, Area, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/utils/constants';

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<Record<string, unknown>>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-100 dark:border-white/10 p-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] min-w-[140px] ring-1 ring-black/5">
        <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] mb-2 border-b border-gray-50 dark:border-white/5 pb-1">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: Record<string, unknown>, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shadow-elev-1" style={{ backgroundColor: entry.color as string }} />
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 font-bold">{entry.name as string}</span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                {entry.value as string}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Tenant Card Component
const TenantCard = ({ tenant, index, onClick }: { tenant: Record<string, unknown>; index: number; onClick: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    whileHover={{ y: -4, scale: 1.01 }}
    className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-elev-4 shadow-gray-200/50 dark:shadow-none cursor-pointer"
    onClick={onClick}
  >
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-elev-4 shadow-brand-500/30">
        {(tenant.name as string)?.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-gray-900 dark:text-white truncate">{tenant.name as string}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">{(tenant.domain as string) || 'No domain'}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${tenant.status === 'ACTIVE'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}>
          {tenant.status as string}
        </span>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-brand-100 dark:hover:bg-brand-500/20 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{(tenant.employee_count as number) || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Employees</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{(tenant.department_count as number) || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Departments</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{(tenant.utilization as string) ? `${(tenant.utilization as string)}%` : '0%'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Utilization</p>
        </div>
      </div>
    </div>
  </motion.div>
);

// Stat Card Component
const StatCard = ({
  title, value, icon: Icon, gradient, delay = 0
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -5, scale: 1.02 }}
    className="relative group h-full"
  >
    <div className="relative overflow-hidden rounded-[1.5rem] p-5 h-full bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-white/5 shadow-elev-4 dark:shadow-none transition-all duration-300 hover:shadow-elev-5 hover:shadow-brand-500/10">
      {/* Subtle Decorative Pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <circle cx="80" cy="20" r="40" fill="currentColor" className="text-slate-900 dark:text-white" />
          <circle cx="10" cy="80" r="20" fill="currentColor" className="text-slate-900 dark:text-white" />
        </svg>
      </div>

      {/* Icon Accent */}
      <div
        className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-elev-4 border border-white/10"
        style={{ background: gradient }}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <h3 className="text-4xl font-black mb-1 tracking-tighter leading-none text-slate-900 dark:text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h3>
        <p className="text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">{title}</p>
      </div>
    </div>
  </motion.div>
);

// System Status Card
const SystemStatusCard = ({
  title, status, value, icon: Icon, gradient, delay = 0
}: {
  title: string;
  status: 'healthy' | 'warning' | 'critical';
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white dark:bg-neutral-900 rounded-[1.5rem] p-5 border border-neutral-100 dark:border-white/5 shadow-elev-4 dark:shadow-none hover:shadow-elev-5 hover:shadow-brand-500/10 transition-all duration-300"
  >
    <div className="flex items-center justify-between mb-4">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-elev-4 border border-white/10"
        style={{ background: gradient }}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${status === 'healthy'
        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
        : status === 'warning'
          ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
          : 'bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400'
        }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'healthy' ? 'bg-emerald-500' : status === 'warning' ? 'bg-amber-500' : 'bg-error-500'
          } animate-pulse`} />
        {status}
      </div>
    </div>
    <p className="text-2xl font-black text-slate-900 dark:text-white mb-1">{value}</p>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
  </motion.div>
);

export const SuperAdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'system'],
    queryFn: () => dashboardService.getSystemDashboard(),
    refetchInterval: 30000, // Refresh every 30s for live resources (more stable for LAN)
    retry: false,
  });

  const systemMetrics = useMemo(() => {
    const m = ((data as unknown as Record<string, unknown>)?.metrics as Record<string, unknown>) || {};
    const h = ((data as unknown as Record<string, unknown>)?.systemHealth as Record<string, unknown>) || {};
    return {
      total_tenants: m.total_tenants || 0,
      total_users: m.total_users || 0,
      active_users: m.active_users !== undefined ? m.active_users : 0,
      inactive_users: m.inactive_users !== undefined ? m.inactive_users : 0,
      total_employees: m.total_employees || 0,
      active_employees: m.active_employees !== undefined ? m.active_employees : 0,
      inactive_employees: m.inactive_employees !== undefined ? m.inactive_employees : 0,
      system_health: h.status || 'healthy',
    };
  }, [data]);

  const tenantList = ((data as unknown as Record<string, unknown>)?.recentTenants as Record<string, unknown>[]) || ((data as unknown as Record<string, unknown>)?.tenants as Record<string, unknown>[]) || ((data as unknown as Record<string, unknown>)?.topActiveTenants as Record<string, unknown>[]) || [];

  // Current Time State
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format uptime seconds to string
  const formatUptime = (seconds: number) => {
    if (!seconds) return '0s';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${Math.floor(seconds % 60)}s`;
  };

  const systemStats = useMemo(() => {
    const h = ((data as unknown as Record<string, unknown>)?.systemHealth as Record<string, unknown>) || {};
    return {
      uptime: formatUptime(h.uptime as number || 0),
      latency: h.latency as number || 0,
      memory: h.memoryUsage as string || '',
      status: h.status as string || 'healthy'
    };
  }, [data]);

  // Platform Growth Data (Cumulative Breakdown)
  const growthChartData = useMemo(() => {
    const tGrowth = [...(((data as unknown as Record<string, unknown>)?.tenantGrowth as Record<string, unknown>[]) || [])].reverse();
    const eGrowth = [...(((data as unknown as Record<string, unknown>)?.employeeGrowth as Record<string, unknown>[]) || [])].reverse();

    return tGrowth.map((t: Record<string, unknown>, index: number) => {
      const tenants = Number(t.count || 0);
      const employees = Number((eGrowth[index] as Record<string, unknown>)?.count || 0);

      return {
        date: (t.month || t.date) ? format(new Date((t.month || t.date) as string), 'MMM dd') : 'Day ' + index,
        Tenants: tenants,
        Employees: employees,
        Total: tenants + employees
      };
    });
  }, [data]);

  const tenantStatusData = useMemo(() => {
    const m = ((data as unknown as Record<string, unknown>)?.metrics as Record<string, unknown>) || {};
    const total = Number(m.total_tenants) || 0;
    const active = Number(m.active_tenants) || 0;
    const inactive = Math.max(0, total - active);

    return [
      { name: 'Active', value: active, color: '#10b981' },
      { name: 'Inactive', value: inactive, color: '#9ca3af' },
      { name: 'Pending', value: 0, color: '#f59e0b' },
    ].filter(d => d.value > 0 || (d.name === 'Active' && total === 0)); // Show at least active if everything is 0
  }, [data]);

  // Resource History for Line Chart
  const [resourceHistory, setResourceHistory] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!data?.systemHealth?.resources) return;

    const res = data.systemHealth.resources;
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    setResourceHistory(prev => {
      // Avoid duplicate timestamp points (React Strict Mode double-invoke)
      if (prev.length > 0 && prev[prev.length - 1].time === timestamp) {
        return prev;
      }

      const newPoint = {
        time: timestamp,
        cpu: res.cpu || 0,
        memory: res.memory || 0,
        storage: res.storage || 0,
        network: res.network || 0,
      };
      const newHistory = [...prev, newPoint];
      return newHistory.slice(-20); // Keep last 20 points
    });
  }, [data]);

  if (isLoading) {
    return (
      <DashboardLayout title={t('dashboard.systemDashboard')}>
        <PageTransition className="flex items-center justify-center h-96">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-brand-200 dark:border-brand-800 rounded-full animate-spin border-t-brand-600" />
            <Sparkles className="w-6 h-6 text-brand-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('dashboard.systemDashboard')}>
      <PageTransition className="space-y-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2.5rem] p-8 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-white/5 shadow-elev-5 dark:shadow-none"
        >
          {/* Subtle Patterns */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
            <div className="absolute inset-0 text-slate-900 dark:text-white" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='currentColor' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 mb-2"
              >
                <Shield className="w-5 h-5 text-amber-500" />
                <span className="text-slate-400 dark:text-slate-500 text-sm font-black uppercase tracking-widest">Super Administrator</span>
              </motion.div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                {t('dashboard.systemControlCenter')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                {t('dashboard.monitorTenantsAndHealth')}
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              <div className="flex items-center gap-4 bg-neutral-50 dark:bg-white/5 rounded-3xl p-4 min-w-fit border border-neutral-100 dark:border-white/5 shadow-elev-1">
                <div className="text-right px-4 border-r border-neutral-200 dark:border-white/10">
                  <p className="text-2xl font-black text-slate-900 dark:text-white leading-none whitespace-nowrap">
                    {format(currentTime, 'HH:mm:ss')}
                  </p>
                  <p className="text-xs text-slate-400 uppercase tracking-widest mt-1 font-bold">Local Time</p>
                </div>
                <div className="text-right px-4">
                  <p className="text-2xl font-black text-brand-600 leading-none uppercase whitespace-nowrap">
                    {format(currentTime, 'eee, MMM dd')}
                  </p>
                  <p className="text-xs text-slate-400 uppercase tracking-widest mt-1 font-bold">System Date</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: t('sidebar.tenants'),
              value: systemMetrics.total_tenants,
              icon: Building2,
              gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            },
            {
              title: t('attendance.totalEmployees'),
              value: systemMetrics.total_employees,
              icon: Users,
              gradient: 'linear-gradient(135deg, #10b981, #059669)',
            },
            {
              title: t('attendance.activeEmployees'),
              value: systemMetrics.active_employees,
              icon: Activity,
              gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
            },
            {
              title: t('attendance.inactiveEmployees'),
              value: systemMetrics.inactive_employees,
              icon: UserX,
              gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
            },
          ].map((stat, index) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value as number}
              icon={stat.icon}
              gradient={stat.gradient}
              delay={0.1 + index * 0.1}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Growth Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-elev-4 dark:shadow-none"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-brand-600" />
                  Growth Analytics
                </h3>
                <p className="text-xs text-gray-500 font-medium">Organizations & Population growth</p>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
<p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Tenants</p>
                    <p className="text-xl font-black text-brand-600 leading-none">{(systemMetrics.total_tenants as number) || 0}</p>
                  </div>
                  <div className="text-right border-l border-gray-100 dark:border-gray-800 pl-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Employees</p>
                  <p className="text-xl font-black text-emerald-500 leading-none">{(systemMetrics.total_employees as number) || 0}</p>
                </div>
              </div>
            </div>

            <div className="h-64 mt-4 relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthChartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tenantGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="employeeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} strokeOpacity={0.2} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                    minTickGap={60}
                    dy={10}
                  />
                  <YAxis
                    yAxisId="tenants"
                    mirror={true}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#4f46e5', fontSize: 10, fontWeight: 800 }}
                    allowDecimals={false}
                    domain={[0, 'auto']}
                  />
                  <YAxis
                    yAxisId="employees"
                    orientation="right"
                    mirror={true}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#10b981', fontSize: 10, fontWeight: 800 }}
                    allowDecimals={false}
                    domain={[0, 'auto']}
                  />
                  <Tooltip
                    content={(({ active, payload }: { active?: boolean; payload?: Array<Record<string, unknown>> }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-gray-900 px-4 py-3 rounded-2xl shadow-elev-6 border border-gray-100 dark:border-white/5 min-w-[170px]">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-50 dark:border-white/5 pb-2">
                              {((payload[0].payload as Record<string, unknown>).date as string)}
                            </p>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
<div className="flex items-center gap-2">
  <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
  <span className="text-sm font-bold text-gray-500">Tenants</span>
</div>
<span className="text-sm font-black text-brand-600">{((payload.find((p: Record<string, unknown>) => p.dataKey === 'Tenants') as Record<string, unknown>)?.value as number) || 0}</span>
                              </div>
                              <div className="flex items-center justify-between">
<div className="flex items-center gap-2">
  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
  <span className="text-sm font-bold text-gray-500">Employees</span>
</div>
<span className="text-sm font-black text-emerald-600">{((payload.find((p: Record<string, unknown>) => p.dataKey === 'Employees') as Record<string, unknown>)?.value as number) || 0}</span>
                              </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-gray-50 dark:border-white/10 flex items-center justify-between">
                              <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tighter">Total Scale</span>
                              <span className="text-lg font-black text-gray-900 dark:text-white tabular-nums">
                                {Number((payload.find((p: Record<string, unknown>) => p.dataKey === 'Tenants') as Record<string, unknown>)?.value || 0) +
                                  Number((payload.find((p: Record<string, unknown>) => p.dataKey === 'Employees') as Record<string, unknown>)?.value || 0)}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    }) as any}
                  />
                  <Area
                    yAxisId="tenants"
                    type="monotone"
                    dataKey="Tenants"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#tenantGradient)"
                    activeDot={{ r: 5, strokeWidth: 0, fill: '#4f46e5' }}
                  />
                  <Area
                    yAxisId="employees"
                    type="monotone"
                    dataKey="Employees"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#employeeGradient)"
                    activeDot={{ r: 5, strokeWidth: 0, fill: '#10b981' }}
                  />
                </AreaChart>
              </ResponsiveContainer>

              <div className="absolute top-0 left-0 pointer-events-none">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-100 dark:border-white/5 shadow-elev-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                  <span className="text-[9px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest">Live Sync</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tenant Distribution & Resource Usage */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.55 }}
            className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-elev-5 shadow-gray-200/50 dark:shadow-none"
          >
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Tenant Status</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tenantStatusData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {tenantStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {tenantStatusData.map(item => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-500">{item.name}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-elev-4 dark:shadow-none"
          >
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">System Resources History</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={resourceHistory}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorStorage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorNetwork" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ top: -10, right: 0, fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="cpu" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" name="CPU %" />
                  <Area type="monotone" dataKey="memory" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorMemory)" name="Memory %" />
                  <Area type="monotone" dataKey="storage" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorStorage)" name="Storage %" />
                  <Area type="monotone" dataKey="network" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorNetwork)" name="Network %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* System Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SystemStatusCard
            title="API Uptime"
            status="healthy"
            value={systemStats.uptime}
            icon={Server}
            gradient="linear-gradient(135deg, #10b981, #059669)"
            delay={0.6}
          />
          <SystemStatusCard
            title="Database Latency"
            status={systemStats.latency > 100 ? 'warning' : 'healthy'}
            value={`${systemStats.latency}ms`}
            icon={Database}
            gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
            delay={0.7}
          />
          <SystemStatusCard
            title="CDN Status"
            status="healthy"
            value="Global Active"
            icon={Globe}
            gradient="linear-gradient(135deg, #f59e0b, #d97706)"
            delay={0.8}
          />
          <SystemStatusCard
            title="Memory Usage"
            status="healthy"
            value={`${systemStats.memory} MB Used`}
            icon={Activity}
            gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
            delay={0.9}
          />
        </div>

        {/* Tenants List */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-elev-5 shadow-gray-200/50 dark:shadow-none"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-600" />
                Recent Tenants
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{tenantList.length} organizations</p>
            </div>
            <Button variant="ghost" onClick={() => navigate(ROUTES.TENANTS)}>
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {tenantList.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {tenantList.slice(0, 6).map((tenant: Record<string, unknown>, index: number) => (
                <TenantCard
                  key={tenant.id as string}
                  tenant={tenant}
                  index={index}
                  onClick={() => navigate(ROUTES.TENANTS)}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-brand-600 dark:text-brand-400" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Tenants Yet</h4>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by creating your first tenant</p>
              <Button onClick={() => navigate(ROUTES.TENANTS_CREATE)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Tenant
              </Button>
            </div>
          )}
        </motion.div>

        {/* Quick Actions Footer */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="relative overflow-hidden bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 border border-neutral-100 dark:border-white/5 shadow-elev-5 dark:shadow-none"
        >
          {/* Subtle Accent Pattern */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <circle cx="90" cy="90" r="30" fill="currentColor" className="text-brand-500" />
              <circle cx="10" cy="10" r="20" fill="currentColor" className="text-amber-500" />
            </svg>
          </div>

          <div className="relative z-10">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3 tracking-tight">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-elev-4 shadow-amber-500/20 border border-white/10">
                <Zap className="w-6 h-6 text-white" />
              </div>
              Quick Control Panel
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Manage Tenants', icon: Building2, path: '/tenants', color: 'from-brand-500 to-brand-600' },
                { label: 'Manage Coupons', icon: Tag, path: '/coupons', color: 'from-pink-500 to-error-500' },
                { label: 'System Logs', icon: Activity, path: '/activity', color: 'from-emerald-500 to-teal-500' },
                { label: 'System Settings', icon: Settings, path: '/settings', color: 'from-amber-500 to-orange-500' },
              ].map((action) => (
                <motion.button
                  key={action.label}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(action.path)}
                  className="group relative p-6 rounded-3xl bg-neutral-50 dark:bg-white/5 border border-neutral-100 dark:border-white/5 flex flex-col items-center gap-4 transition-all hover:bg-white dark:hover:bg-brand-500/10 hover:shadow-elev-5 hover:shadow-brand-500/5 shadow-elev-3"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-elev-4 border border-white/10 group-hover:rotate-6 transition-transform`}>
                    <action.icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none text-center">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </PageTransition>
    </DashboardLayout >
  );
};
