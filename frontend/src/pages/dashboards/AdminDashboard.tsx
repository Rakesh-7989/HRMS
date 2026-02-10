import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { dashboardService } from '@/services/dashboard.service';
import { eventsService } from '@/services/events.service';
import {
  Users, Building2, Briefcase, TrendingUp, TrendingDown,
  Calendar, Clock, Activity, Sparkles, Award, Folder
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Modern color palette
const COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  pink: '#ec4899',
  cyan: '#06b6d4',
  gradients: {
    purple: ['#6366f1', '#8b5cf6'],
    blue: ['#3b82f6', '#06b6d4'],
    green: ['#10b981', '#34d399'],
    orange: ['#f59e0b', '#fb923c'],
    pink: ['#ec4899', '#f472b6'],
  }
};

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

// Animation variants
const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
};

// Custom Tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-gray-700">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Stat Card Component
const StatCard = ({
  title, value, change, trend, icon: Icon, gradient, delay = 0
}: {
  title: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down';
  icon: any;
  gradient: string[];
  delay?: number;
}) => {
  const isPositive = trend === 'up' || (change && change > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="relative group"
    >
      <div className="relative overflow-hidden rounded-3xl p-6 h-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none">
        {/* Gradient Background Orb */}
        <div
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"
          style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
        />

        {/* Icon */}
        <div
          className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </h3>
            {change !== undefined && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${isPositive
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                }`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(change)}%
              </div>
            )}
          </div>
        </div>

        {/* Decorative Line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})` }}
        />
      </div>
    </motion.div>
  );
};

// Chart Card Component
const ChartCard = ({
  title, subtitle, badge, children, className = '', delay = 0
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    className={`bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none ${className}`}
  >
    <div className="flex items-center justify-between mb-6 gap-4">
      <div className="min-w-0">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
      {badge && (
        <span className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          {badge}
        </span>
      )}
    </div>
    {children}
  </motion.div>
);

// Department Row Component
const DepartmentRow = ({ name, count, percentage, index }: { name: string; count: number; percentage: number; index: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.1 * index }}
    className="group"
  >
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
          style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
        >
          {name.charAt(0)}
        </div>
        <span className="font-medium text-gray-900 dark:text-white">{name}</span>
      </div>
      <span className="font-bold text-gray-900 dark:text-white">{count}</span>
    </div>
    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1, delay: 0.1 * index, ease: [0.22, 1, 0.36, 1] }}
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${CHART_COLORS[index % CHART_COLORS.length]}, ${CHART_COLORS[(index + 1) % CHART_COLORS.length]})` }}
      />
    </div>
  </motion.div>
);

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'organization'],
    queryFn: () => dashboardService.getOrganizationDashboard(),
  });

  const { data: peopleEventsData } = useQuery({
    queryKey: ['peopleEvents', 'organization'],
    queryFn: () => eventsService.getPeopleEvents('organization'),
    staleTime: 1000 * 60 * 5,
  });

  const metrics = data?.orgMetrics || {
    total_employees: 0,
    total_users: 0,
    total_projects: 0,
    active_employees: 0,
    total_departments: 0,
    total_designations: 0,
  };

  const roleDist = data?.roleDistribution || [];
  const deptAnalytics = data?.departmentAnalytics || [];

  const leaveStats = data?.leaveStatistics || [];

  // Process data for charts


  const roleChartData = roleDist.map((r: any) => ({
    name: r.role,
    value: Number(r.count),
  }));

  const taskChartData = ((data as any)?.taskMetrics || []).map((t: any) => ({
    status: t.column_key.replace('_', ' '),
    count: Number(t.count),
  }));



  // Calculate max for percentage
  const maxDeptCount = Math.max(...deptAnalytics.map((d: any) => Number(d.employee_count)), 1);

  if (isLoading) {
    return (
      <DashboardLayout title="Organization Dashboard">
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
    <DashboardLayout title="Organization Dashboard">
      <motion.div
        className="space-y-8"
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-8"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
          }}
        >
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
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
                <Sparkles className="w-5 h-5 text-yellow-300" />
                <span className="text-white/80 text-sm font-medium">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}</span>
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Welcome back, {user?.first_name}! 👋
              </h1>
              <p className="text-white/70 text-lg">
                Here's what's happening in your organization today
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-4 bg-white/10 backdrop-blur-lg rounded-2xl p-4 min-w-fit"
            >
              <div className="text-center px-4 border-r border-white/20">
                <p className="text-xl md:text-3xl font-bold text-white">{format(new Date(), 'dd')}</p>
                <p className="text-sm text-white/70">{format(new Date(), 'MMM yyyy')}</p>
              </div>
              <div className="text-center px-4">
                <p className="text-xl md:text-3xl font-bold text-white">{format(new Date(), 'EEEE')}</p>
                <p className="text-sm text-white/70">{format(new Date(), 'hh:mm a')}</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Employees"
            value={metrics.total_users || metrics.total_employees}
            change={12}
            trend="up"
            icon={Users}
            gradient={COLORS.gradients.purple}
            delay={0.1}
          />
          <StatCard
            title="Total Projects"
            value={(metrics as any).total_projects || 0}
            change={5}
            trend="up"
            icon={Folder}
            gradient={COLORS.gradients.green}
            delay={0.2}
          />
          <StatCard
            title="Departments"
            value={metrics.total_departments}
            icon={Building2}
            gradient={COLORS.gradients.blue}
            delay={0.3}
          />
          <StatCard
            title="Designations"
            value={metrics.total_designations}
            icon={Briefcase}
            gradient={COLORS.gradients.orange}
            delay={0.4}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Overview Chart - Replaces Attendance */}
          <ChartCard
            title="Task Overview"
            subtitle="Tasks by Status"
            badge="Project Health"
            delay={0.5}
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="status"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]}>
                    {taskChartData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Role Distribution Pie Chart */}
          <ChartCard
            title="Role Distribution"
            subtitle="Employee roles breakdown"
            badge={`${roleDist.length} Roles`}
            delay={0.6}
          >
            <div className="h-72 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {CHART_COLORS.map((color, index) => (
                      <linearGradient key={index} id={`pieGradient${index}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={1} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={roleChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1000}
                  >
                    {roleChartData.map((_: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#pieGradient${index % CHART_COLORS.length})`}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    formatter={(value) => <span className="text-gray-600 dark:text-gray-300 text-sm ml-2 mr-2">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leave Statistics Bar Chart */}
          <ChartCard
            title="Leave Policies"
            subtitle="Configured leave types"
            badge={`${leaveStats.length} Total`}
            className="lg:col-span-2"
            delay={0.7}
          >
            <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {leaveStats.map((s: any, i: number) => (
                  <motion.div
                    key={s.leave_type}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + (i * 0.05) }}
                    className="group relative overflow-hidden p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all cursor-default"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-indigo-600 transition-transform group-hover:scale-110">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors text-sm truncate">
                        {s.leave_type}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
              {leaveStats.length === 0 && (
                <div className="py-10 text-center text-gray-400 font-medium">
                  No leave types configured
                </div>
              )}
            </div>
          </ChartCard>

          {/* Department Distribution */}
          <ChartCard
            title="Top Departments"
            subtitle="By headcount"
            delay={0.8}
          >
            <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
              {deptAnalytics.slice(0, 6).map((dept: any, index: number) => (
                <DepartmentRow
                  key={dept.name}
                  name={dept.name}
                  count={Number(dept.employee_count)}
                  percentage={(Number(dept.employee_count) / maxDeptCount) * 100}
                  index={index}
                />
              ))}
            </div>
          </ChartCard>
        </div>

        {/* People Events Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Birthdays */}
          <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-3xl p-6 text-white shadow-xl shadow-pink-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                🎂
              </div>
              <div>
                <h3 className="font-bold text-lg">Birthdays</h3>
                <p className="text-white/70 text-sm">This month</p>
              </div>
            </div>
            <div className="space-y-3">
              {(peopleEventsData?.birthdays || []).slice(0, 3).map((person: any) => (
                <div key={person.id} className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                    {person.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{person.name}</p>
                    <p className="text-white/70 text-xs">{person.date}</p>
                  </div>
                </div>
              ))}
              {(!peopleEventsData?.birthdays || peopleEventsData.birthdays.length === 0) && (
                <p className="text-white/60 text-center py-4">No birthdays this month</p>
              )}
            </div>
          </div>

          {/* Anniversaries */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-6 text-white shadow-xl shadow-amber-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                🎉
              </div>
              <div>
                <h3 className="font-bold text-lg">Anniversaries</h3>
                <p className="text-white/70 text-sm">Work anniversaries</p>
              </div>
            </div>
            <div className="space-y-3">
              {(peopleEventsData?.anniversaries || []).slice(0, 3).map((person: any) => (
                <div key={person.id} className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                    {person.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{person.name}</p>
                    <p className="text-white/70 text-xs">{person.date}</p>
                  </div>
                </div>
              ))}
              {(!peopleEventsData?.anniversaries || peopleEventsData.anniversaries.length === 0) && (
                <p className="text-white/60 text-center py-4">No anniversaries this month</p>
              )}
            </div>
          </div>

          {/* New Joiners */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                👋
              </div>
              <div>
                <h3 className="font-bold text-lg">New Joiners</h3>
                <p className="text-white/70 text-sm">Recent hires</p>
              </div>
            </div>
            <div className="space-y-3">
              {(peopleEventsData?.joiners || []).slice(0, 3).map((person: any) => (
                <div key={person.id} className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                    {person.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{person.name}</p>
                    <p className="text-white/70 text-xs">{person.date}</p>
                  </div>
                </div>
              ))}
              {(!peopleEventsData?.joiners || peopleEventsData.joiners.length === 0) && (
                <p className="text-white/60 text-center py-4">No new joiners this month</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Stats Footer */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Avg. Attendance Rate', value: '94%', icon: Activity, color: '#6366f1' },
            { label: 'On Leave Today', value: '12', icon: Calendar, color: '#f59e0b' },
            { label: 'Late Arrivals Today', value: '5', icon: Clock, color: '#ef4444' },
            { label: 'Performance Score', value: 'A+', icon: Award, color: '#10b981' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 flex items-center gap-4"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};
