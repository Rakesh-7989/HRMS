import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { dashboardService } from '@/services/dashboard.service';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Activity, Users, Shield, ChevronRight,
  Server, Database, Zap, Globe, Settings, Plus, BarChart3,
  Sparkles, Clock, Tag
} from 'lucide-react';
import { format } from 'date-fns';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-gray-700">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Tenant Card Component
const TenantCard = ({ tenant, index, onClick }: { tenant: any; index: number; onClick: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    whileHover={{ y: -4, scale: 1.01 }}
    className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-lg shadow-gray-200/50 dark:shadow-none cursor-pointer"
    onClick={onClick}
  >
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
        {tenant.name?.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-gray-900 dark:text-white truncate">{tenant.name}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">{tenant.domain || 'No domain'}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${tenant.status === 'ACTIVE'
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}>
          {tenant.status}
        </span>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{tenant.employee_count || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Employees</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{tenant.department_count || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Departments</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{tenant.utilization ? `${tenant.utilization}%` : '0%'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Utilization</p>
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
  gradient: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-lg shadow-gray-200/50 dark:shadow-none"
  >
    <div className="flex items-center justify-between mb-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: gradient }}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status === 'healthy'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
        : status === 'warning'
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
          : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
        }`}>
        <span className={`w-2 h-2 rounded-full ${status === 'healthy' ? 'bg-emerald-500' : status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
          }`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{title}</p>
  </motion.div>
);

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'system'],
    queryFn: () => dashboardService.getSystemDashboard(),
  });

  const metrics = (data as any)?.metrics || {};
  const health = (data as any)?.systemHealth || {};

  const systemMetrics = useMemo(() => ({
    total_tenants: metrics.total_tenants || 0,
    total_users: metrics.total_users || 0,
    active_users: health.active_users || metrics.active_users_24h || 0,
    system_health: health.status || 'healthy',
  }), [metrics, health]);

  const tenantList = (data as any)?.recentTenants || (data as any)?.tenants || (data as any)?.topActiveTenants || [];

  // Dynamic Infra Simulation
  const [currentTime, setCurrentTime] = useState(new Date());
  const [infraStats, setInfraStats] = useState({
    uptime: 99.98,
    latency: 12,
    queue: 0
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setInfraStats(prev => ({
        uptime: Math.min(99.99, prev.uptime + (Math.random() * 0.002 - 0.001)),
        latency: Math.max(8, Math.floor(prev.latency + (Math.random() * 4 - 2))),
        queue: Math.max(0, Math.floor(Math.random() * 2))
      }));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Stable Chart data (reversed to show time progressing L to R)
  const growthChartData = useMemo(() => {
    const tGrowth = [...((data as any)?.tenantGrowth || [])].reverse();
    const uGrowth = [...((data as any)?.userGrowth || [])].reverse();
    return tGrowth.map((t: any, index: number) => ({
      date: t.month || t.date ? format(new Date(t.month || t.date), 'MMM dd') : 'Day ' + index,
      Tenants: t.count || t.tenants || t.new_tenants || 0,
      Users: uGrowth[index]?.count || uGrowth[index]?.users || uGrowth[index]?.new_users || 0,
    }));
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

  const resourceUsageData = [
    { name: 'CPU', value: 35, color: '#6366f1' },
    { name: 'Memory', value: 62, color: '#8b5cf6' },
    { name: 'Storage', value: 48, color: '#ec4899' },
    { name: 'Network', value: 25, color: '#10b981' },
  ];

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
      <motion.div
        className="space-y-8"
        initial="initial"
        animate="animate"
      >
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-6"
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          }}
        >
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
              <circle cx="350" cy="50" r="150" fill="white" fillOpacity="0.2" />
              <circle cx="50" cy="150" r="100" fill="white" fillOpacity="0.15" />
              <circle cx="200" cy="100" r="80" fill="white" fillOpacity="0.1" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 mb-2"
              >
                <Shield className="w-5 h-5 text-indigo-300" />
                <span className="text-indigo-300 text-sm font-medium">Super Administrator</span>
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                System Control Center
              </h1>
              <p className="text-indigo-200 text-lg">
                Monitor tenants, users, and system health across the platform
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-right"
            >
              <div className="text-white text-3xl font-bold mb-1">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className="text-indigo-200 text-sm font-medium uppercase tracking-wider">
                {format(currentTime, 'EEEE, MMMM do')}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'Total Tenants',
              value: systemMetrics.total_tenants,
              icon: Building2,
              gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              shadow: 'shadow-indigo-500/30'
            },
            {
              title: 'Total Users',
              value: systemMetrics.total_users,
              icon: Users,
              gradient: 'linear-gradient(135deg, #10b981, #059669)',
              shadow: 'shadow-emerald-500/30'
            },
            {
              title: 'Active Users',
              value: systemMetrics.active_users,
              icon: Activity,
              gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
              shadow: 'shadow-amber-500/30'
            },
            {
              title: 'System Health',
              value: systemMetrics.system_health === 'healthy' ? '99.9%' : '95%',
              icon: Zap,
              gradient: 'linear-gradient(135deg, #ec4899, #be185d)',
              shadow: 'shadow-pink-500/30'
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-xl ${stat.shadow}`}
              style={{ background: stat.gradient }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                  <stat.icon className="w-7 h-7 text-white" />
                </div>
                <p className="text-4xl font-bold">{stat.value}</p>
                <p className="text-white/80 mt-1">{stat.title}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Growth Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Growth Analytics
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Platform expansion trends</p>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthChartData}>
                  <defs>
                    <linearGradient id="colorTenants" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Tenants" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTenants)" />
                  <Area type="monotone" dataKey="Users" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Tenant Distribution & Resource Usage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.55 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50"
            >
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Tenant Status</h4>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tenantStatusData}
                      innerRadius={40}
                      outerRadius={60}
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
              className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50"
            >
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">System Resources</h4>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resourceUsageData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {resourceUsageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        </div>

        {/* System Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SystemStatusCard
            title="API Server"
            status="healthy"
            value={`${infraStats.uptime.toFixed(2)}% Uptime`}
            icon={Server}
            gradient="linear-gradient(135deg, #10b981, #059669)"
            delay={0.6}
          />
          <SystemStatusCard
            title="Database"
            status="healthy"
            value={`${infraStats.latency}ms Latency`}
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
            title="Queue Status"
            status="healthy"
            value={`${infraStats.queue} Pending`}
            icon={Clock}
            gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
            delay={0.9}
          />
        </div>

        {/* Tenants List */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Recent Tenants
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{tenantList.length} organizations</p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/tenants')}>
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
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Tenants Yet</h4>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by creating your first tenant</p>
              <Button onClick={() => navigate('/tenants/create')}>
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
          className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-6"
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Manage Tenants', icon: Building2, path: '/tenants', color: 'from-indigo-500 to-purple-600' },
              { label: 'Manage Coupons', icon: Tag, path: '/coupons', color: 'from-pink-500 to-rose-500' },
              { label: 'System Logs', icon: Activity, path: '/activity', color: 'from-emerald-500 to-teal-500' },
              { label: 'System Settings', icon: Settings, path: '/settings', color: 'from-amber-500 to-orange-500' },
            ].map((action) => (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(action.path)}
                className="p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-3 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-white">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};
