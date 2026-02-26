import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { dashboardService } from '@/services/common/dashboard.service';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Activity, Users, Shield, ChevronRight,
  Server, Database, Zap, Globe, Settings, Plus,
  Sparkles, Tag, UserX, ArrowUp, ArrowDown
} from 'lucide-react';
import { format } from 'date-fns';
import {
  AreaChart, Area, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { StatCard } from '@/components/dashboard/StatCard';
import { CustomTooltip } from '@/components/dashboard/CustomTooltip';
import { DASHBOARD_GRADIENTS } from '@/utils/constants';



// Tenant Card Component
// Tenant Card Component
const TenantCard = ({ tenant, index, onClick }: { tenant: any; index: number; onClick: () => void }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.05 }}
    whileHover={{ scale: 1.01, y: -2 }}
    className="bg-gray-50 dark:bg-white/5 rounded-[1.5rem] p-5 border border-gray-200 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 hover:shadow-lg transition-all cursor-pointer group"
    onClick={onClick}
  >
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:scale-110 transition-transform">
        {tenant.name?.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-bold text-gray-900 dark:text-white truncate tracking-tight">{tenant.name}</h4>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">{tenant.domain || 'No domain set'}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${tenant.status === 'ACTIVE'
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
          : 'bg-gray-100 dark:bg-white/5 text-gray-500 border border-gray-200 dark:border-white/5'
          }`}>
          {tenant.status}
        </span>
        <div className="w-8 h-8 rounded-lg bg-white dark:bg-white/5 border border-gray-100 dark:border-transparent flex items-center justify-center text-gray-400 dark:text-white group-hover:bg-gray-50 group-hover:text-primary dark:group-hover:bg-white/10 group-hover:translate-x-1 transition-all">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
    <div className="mt-5 pt-5 border-t border-gray-200 dark:border-white/5">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xl font-bold text-gray-900 dark:text-white tracking-tighter tabular-nums">{tenant.employee_count || 0}</p>
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Staff</p>
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900 dark:text-white tracking-tighter tabular-nums">{tenant.department_count || 0}</p>
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Depts</p>
        </div>
        <div>
          <p className="text-xl font-bold text-emerald-500 dark:text-emerald-400 tracking-tighter tabular-nums">{tenant.utilization ? `${tenant.utilization}%` : '0%'}</p>
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Usage</p>
        </div>
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
  icon: any;
  gradient: string[];
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    className="bg-white dark:bg-[#0f172a]/80 backdrop-blur-xl rounded-[2rem] p-6 border border-gray-200 dark:border-white/5 shadow-xl dark:shadow-2xl"
  >
    <div className="flex items-center justify-between mb-4">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform"
        style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md ${status === 'healthy'
        ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
        : status === 'warning'
          ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
          : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
        }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'healthy' ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : status === 'warning' ? 'bg-amber-500 dark:bg-amber-400' : 'bg-rose-500 dark:bg-rose-400'
          }`} />
        {status}
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tighter">{value}</p>
    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{title}</p>
  </motion.div>
);

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(true);

  // Track visibility of top/bottom sentinels using IntersectionObserver
  useEffect(() => {
    const topEl = topRef.current;
    const bottomEl = bottomRef.current;
    if (!topEl || !bottomEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === topEl) setShowScrollTop(!entry.isIntersecting);
          if (entry.target === bottomEl) setShowScrollBottom(!entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(topEl);
    observer.observe(bottomEl);
    return () => observer.disconnect();
  }, []);

  const scrollToTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth' });
  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'system'],
    queryFn: () => dashboardService.getSystemDashboard(),
    refetchInterval: 5000, // Refresh every 5s for live resources
  });

  const metrics = (data as any)?.metrics || {};
  const health = (data as any)?.systemHealth || {};

  const systemMetrics = useMemo(() => ({
    total_tenants: metrics.total_tenants || 0,
    total_users: metrics.total_users || 0,
    active_users: metrics.active_users !== undefined ? metrics.active_users : 0,
    inactive_users: metrics.inactive_users !== undefined ? metrics.inactive_users : 0,
    total_employees: metrics.total_employees || 0,
    active_employees: metrics.active_employees !== undefined ? metrics.active_employees : 0,
    inactive_employees: metrics.inactive_employees !== undefined ? metrics.inactive_employees : 0,
    system_health: health.status || 'healthy',
  }), [metrics, health]);

  const tenantList = (data as any)?.recentTenants || (data as any)?.tenants || (data as any)?.topActiveTenants || [];

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

  const systemStats = useMemo(() => ({
    uptime: formatUptime((data as any)?.systemHealth?.uptime || 0),
    latency: (data as any)?.systemHealth?.latency || 0,
    memory: (data as any)?.systemHealth?.memoryUsage || 0,
    status: (data as any)?.systemHealth?.status || 'healthy'
  }), [data]);

  // Platform Growth Data (Cumulative Breakdown)
  const growthChartData = useMemo(() => {
    const tGrowth = [...((data as any)?.tenantGrowth || [])].reverse();
    const eGrowth = [...((data as any)?.employeeGrowth || [])].reverse();

    return tGrowth.map((t: any, index: number) => {
      const tenants = Number(t.count || 0);
      const employees = Number(eGrowth[index]?.count || 0);

      return {
        date: t.month || t.date ? format(new Date(t.month || t.date), 'MMM dd') : 'Day ' + index,
        Tenants: tenants,
        Employees: employees,
        Total: tenants + employees
      };
    });
  }, [data]);

  const tenantStatusData = useMemo(() => {
    const metrics = (data as any)?.metrics || {};
    const total = metrics.total_tenants || 0;
    const active = metrics.active_tenants || 0;
    const inactive = Math.max(0, total - active);

    return [
      { name: 'Active', value: active, color: '#10b981' },
      { name: 'Inactive', value: inactive, color: '#9ca3af' },
      { name: 'Pending', value: 0, color: '#f59e0b' },
    ].filter(d => d.value > 0 || (d.name === 'Active' && total === 0)); // Show at least active if everything is 0
  }, [data]);

  // Resource History for Line Chart
  const [resourceHistory, setResourceHistory] = useState<any[]>([]);

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
      <DashboardLayout title="System Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-800 rounded-full animate-spin border-t-indigo-600" />
            <Sparkles className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="System Dashboard">
      <motion.div className="space-y-6 pb-6" initial="initial" animate="animate">
        {/* Scroll sentinel – top */}
        <div ref={topRef} />
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/20"
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          }}
        >
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 mb-3 bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-md"
              >
                <Shield className="w-4 h-4 text-indigo-300" />
                <span className="text-white text-[10px] font-bold uppercase tracking-widest">
                  Super Administrator
                </span>
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tighter">
                System Control Center <span className="inline-block animate-pulse">⚡</span>
              </h1>
              <p className="text-white/80 text-lg font-medium max-w-xl leading-relaxed">
                Monitor tenants, users, and overall system health across the entire platform ecosystem.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-6 bg-black/20 backdrop-blur-2xl rounded-[2rem] p-6 border border-white/10 min-w-fit shadow-inner"
            >
              <div className="text-center px-4 border-r border-white/10">
                <p className="text-4xl font-bold text-white tabular-nums">{format(currentTime, 'HH:mm')}</p>
                <p className="text-[10px] uppercase font-bold tracking-widest text-white/60 mt-1">{format(currentTime, 'ss')} SECONDS</p>
              </div>
              <div className="text-center px-4 min-w-[120px]">
                <p className="text-2xl font-bold text-white leading-tight">{format(currentTime, 'EEEE')}</p>
                <p className="text-lg font-bold text-white/80 tabular-nums mt-0.5">{format(currentTime, 'MMM do')}</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: 'Total Tenants',
              value: systemMetrics.total_tenants,
              icon: Building2,
              gradient: DASHBOARD_GRADIENTS.purple,
            },
            {
              title: 'Total Employees',
              value: systemMetrics.total_employees,
              icon: Users,
              gradient: DASHBOARD_GRADIENTS.green,
            },
            {
              title: 'Active Employees',
              value: systemMetrics.active_employees,
              icon: Activity,
              gradient: DASHBOARD_GRADIENTS.orange,
            },
            {
              title: 'Inactive Employees',
              value: systemMetrics.inactive_employees,
              icon: UserX,
              gradient: DASHBOARD_GRADIENTS.pink,
            },
          ].map((stat, index) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              gradient={stat.gradient}
              delay={0.1 + index * 0.1}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Growth Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-[#0f172a]/80 backdrop-blur-xl rounded-[2rem] p-6 border border-gray-200 dark:border-white/5 shadow-xl dark:shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  Growth Analytics
                </h3>
                <p className="text-xs text-gray-500 font-medium">Organizations & Population growth</p>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Tenants</p>
                  <p className="text-xl font-bold text-indigo-600 leading-none">{(data as any)?.metrics?.total_tenants || 0}</p>
                </div>
                <div className="text-right border-l border-gray-100 dark:border-gray-800 pl-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Employees</p>
                  <p className="text-xl font-bold text-emerald-500 leading-none">{(data as any)?.metrics?.total_employees || 0}</p>
                </div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Platform expansion trends</p>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 'bold' }} />
                  <Tooltip
                    content={<CustomTooltip />}
                    contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Area type="monotone" dataKey="Tenants" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTenants)" />
                  <Area type="monotone" dataKey="Users" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
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
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-gray-900 px-4 py-3 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/5 min-w-[170px]">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-50 dark:border-white/5 pb-2">
                              {payload[0].payload.date}
                            </p>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                  <span className="text-xs font-bold text-gray-500">Tenants</span>
                                </div>
                                <span className="text-xs font-black text-indigo-600">{payload.find((p: any) => p.dataKey === 'Tenants')?.value || 0}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span className="text-xs font-bold text-gray-500">Employees</span>
                                </div>
                                <span className="text-xs font-black text-emerald-600">{payload.find((p: any) => p.dataKey === 'Employees')?.value || 0}</span>
                              </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
                              <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tighter">Total Scale</span>
                              <span className="text-lg font-black text-gray-900 dark:text-white tabular-nums">
                                {Number(payload.find((p: any) => p.dataKey === 'Tenants')?.value || 0) +
                                  Number(payload.find((p: any) => p.dataKey === 'Employees')?.value || 0)}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
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
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-100 dark:border-white/5 shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Live Sync</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tenant Distribution */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.55 }}
            className="bg-white dark:bg-[#0f172a]/80 backdrop-blur-xl rounded-[2rem] p-6 border border-gray-200 dark:border-white/5 shadow-xl dark:shadow-2xl"
          >
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Tenant Status Distribution</h4>
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
                  <Tooltip
                    content={<CustomTooltip />}
                    contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {tenantStatusData.map(item => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest">{item.name}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-[#0f172a]/80 backdrop-blur-xl rounded-[2rem] p-6 border border-gray-200 dark:border-white/5 shadow-xl dark:shadow-2xl"
          >
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">System Resources History</h4>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 8, fontWeight: 'bold' }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 8, fontWeight: 'bold' }} />
                  <Tooltip
                    content={<CustomTooltip />}
                    contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ top: -10, right: 0, fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  />
                  <Area type="monotone" dataKey="cpu" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" name="CPU" />
                  <Area type="monotone" dataKey="memory" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorMemory)" name="MEM" />
                  <Area type="monotone" dataKey="storage" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorStorage)" name="STO" />
                  <Area type="monotone" dataKey="network" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorNetwork)" name="NET" />
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
            gradient={['#10b981', '#059669']}
            delay={0.6}
          />
          <SystemStatusCard
            title="Database Latency"
            status={systemStats.latency > 100 ? 'warning' : 'healthy'}
            value={`${systemStats.latency}ms`}
            icon={Database}
            gradient={['#6366f1', '#4f46e5']}
            delay={0.7}
          />
          <SystemStatusCard
            title="CDN Status"
            status="healthy"
            value="Global Active"
            icon={Globe}
            gradient={['#f59e0b', '#d97706']}
            delay={0.8}
          />
          <SystemStatusCard
            title="Memory Usage"
            status="healthy"
            value={`${systemStats.memory} MB Used`}
            icon={Activity}
            gradient={['#8b5cf6', '#7c3aed']}
            delay={0.9}
          />
        </div>

        {/* Tenants List */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.0 }}
          className="bg-white dark:bg-[#0f172a]/80 backdrop-blur-xl rounded-[2rem] p-8 border border-gray-200 dark:border-white/5 shadow-xl dark:shadow-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 tracking-tight">
                <Building2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                Recent Tenants
              </h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{tenantList.length} organizations registered</p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/tenants')} className="text-indigo-600 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10">
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {tenantList.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {tenantList.slice(0, 6).map((tenant: any, index: number) => (
                <TenantCard
                  key={tenant.id}
                  tenant={tenant}
                  index={index}
                  onClick={() => navigate('/tenants')}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-4 border border-gray-200 dark:border-white/5">
                <Building2 className="w-8 h-8 text-gray-400 dark:text-white/40" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">No Tenants Registered</h4>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">Get started by creating your first global tenant</p>
              <Button onClick={() => navigate('/tenants/create')} className="bg-indigo-600 hover:bg-indigo-700 text-white border-0">
                <Plus className="w-4 h-4 mr-2" />
                Create Tenant
              </Button>
            </div>
          )}
        </motion.div>

        {/* Quick Actions Footer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.1 }}
          className="bg-gradient-to-br from-[#1e1b4b] to-[#0f172a] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl"
        >
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 tracking-tight">
            <Zap className="w-5 h-5 text-amber-400" />
            System Control Center
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Tenants', icon: Building2, path: '/tenants', gradient: ['#6366f1', '#8b5cf6'] },
              { label: 'Coupons', icon: Tag, path: '/coupons', gradient: ['#ec4899', '#f43f5e'] },
              { label: 'Logs', icon: Activity, path: '/activity', gradient: ['#10b981', '#06b6d4'] },
              { label: 'Settings', icon: Settings, path: '/settings', gradient: ['#f59e0b', '#fb923c'] },
            ].map((action) => (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(action.path)}
                className="p-6 rounded-[2rem] bg-white/5 hover:bg-white/10 border border-white/5 flex flex-col items-center gap-4 transition-all"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${action.gradient[0]}, ${action.gradient[1]})` }}
                >
                  <action.icon className="w-7 h-7 text-white" />
                </div>
                <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Scroll sentinel – bottom */}
        <div ref={bottomRef} />
      </motion.div>

      {/* Floating Scroll Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            className="w-11 h-11 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            title="Scroll to Top"
          >
            <ArrowUp size={18} />
          </motion.button>
        )}
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToBottom}
            className="w-11 h-11 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            title="Scroll to Bottom"
          >
            <ArrowDown size={18} />
          </motion.button>
        )}
      </div>
    </DashboardLayout >
  );
};
