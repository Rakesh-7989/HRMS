import React from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { dashboardService } from '@/services/dashboard.service';
import { eventsService } from '@/services/events.service';
import {
  Users, Building2, Briefcase, Calendar, Clock, Activity,
  Sparkles, Award, UserCheck, UserX
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { StatCard } from '@/components/dashboard/StatCard';
import { CustomTooltip } from '@/components/dashboard/CustomTooltip';
import { CHART_COLORS, DASHBOARD_GRADIENTS } from '@/utils/constants';

// Stagger animation variant
const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
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
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    className={`bg-white dark:bg-[#111827]/60 backdrop-blur-xl rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-xl dark:shadow-2xl ${className}`}
  >
    <div className="flex items-center justify-between mb-6 gap-4">
      <div className="min-w-0">
        <h3 className="text-xl font-black text-gray-900 dark:text-white truncate tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs font-bold text-gray-500 mt-1 truncate">{subtitle}</p>}
      </div>
      {badge && (
        <span className="shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/80 border border-gray-200 dark:border-white/5 backdrop-blur-md">
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
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.05 * index }}
    className="group"
  >
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-lg"
          style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
        >
          {name.charAt(0)}
        </div>
        <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{name}</span>
      </div>
      <span className="text-sm font-black text-white tabular-nums">{count}</span>
    </div>
    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.8, delay: 0.05 * index, ease: [0.22, 1, 0.36, 1] }}
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
    inactive_employees: 0,
    inactive_users: 0,
    total_departments: 0,
    total_designations: 0,
    employee_growth: 0,
    active_employee_growth: 0,
    department_growth: 0,
    designation_growth: 0,
    on_leave_today: 0,
    late_today: 0,
  };

  const attendanceRate = React.useMemo(() => {
    if (!data?.attendanceMetrics || data.attendanceMetrics.length === 0) return '0%';
    const totalEmployees = data.orgMetrics?.total_employees || 1;
    const avgCheckins = data.attendanceMetrics.reduce((acc, curr) => acc + Number(curr.unique_employees), 0) / data.attendanceMetrics.length;
    const rate = Math.round((avgCheckins / totalEmployees) * 100);
    return `${Math.min(100, rate)}%`;
  }, [data]);

  const performanceScore = React.useMemo(() => {
    const tasks = (data as any)?.taskMetrics || [];
    const doneTasks = tasks.find((t: any) => t.column_key.toLowerCase().includes('done'))?.count || 0;
    const totalTasks = tasks.reduce((acc: number, curr: any) => acc + Number(curr.count), 0);
    const taskCompletionRate = totalTasks > 0 ? (doneTasks / totalTasks) : 0.5; // Default 0.5 if no tasks

    const attRate = parseFloat(attendanceRate) / 100;

    const score = (taskCompletionRate * 0.5 + attRate * 0.5) * 100;
    if (score > 90) return 'A+';
    if (score > 80) return 'A';
    if (score > 70) return 'B+';
    if (score > 60) return 'B';
    return 'C';
  }, [data, attendanceRate]);

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
        className="space-y-6"
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/20"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
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
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span className="text-white text-[10px] font-bold uppercase tracking-widest">
                  Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}
                </span>
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tighter">
                Welcome back, {user?.first_name}! <span className="inline-block animate-bounce-slow">👋</span>
              </h1>
              <p className="text-white/80 text-lg font-medium max-w-xl leading-relaxed">
                Here's what's happening in your organization today. Monitor growth and productivity at a glance.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-6 bg-black/20 backdrop-blur-2xl rounded-[2rem] p-6 border border-white/10 min-w-fit shadow-inner"
            >
              <div className="text-center px-4 border-r border-white/10">
                <p className="text-4xl font-black text-white tabular-nums">{format(new Date(), 'dd')}</p>
                <p className="text-[10px] uppercase font-bold tracking-widest text-white/60 mt-1">{format(new Date(), 'MMM yyyy')}</p>
              </div>
              <div className="text-center px-4 min-w-[120px]">
                <p className="text-2xl font-black text-white leading-tight">{format(new Date(), 'EEEE')}</p>
                <p className="text-lg font-bold text-white/80 tabular-nums mt-0.5">{format(new Date(), 'hh:mm a')}</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Employees"
            value={metrics.total_employees}
            icon={Users}
            gradient={DASHBOARD_GRADIENTS.purple}
            delay={0.1}
          />
          <StatCard
            title="Active Employees"
            value={metrics.active_employees || (metrics.total_employees - (metrics.inactive_employees || 0))}
            icon={UserCheck}
            gradient={DASHBOARD_GRADIENTS.green}
            delay={0.2}
          />
          <StatCard
            title="Inactive Employees"
            value={metrics.inactive_employees || 0}
            icon={UserX}
            gradient={DASHBOARD_GRADIENTS.pink}
            delay={0.25}
          />
          <StatCard
            title="Departments"
            value={metrics.total_departments}
            icon={Building2}
            gradient={DASHBOARD_GRADIENTS.orange}
            delay={0.3}
          />
          <StatCard
            title="Designations"
            value={metrics.total_designations}
            icon={Briefcase}
            gradient={DASHBOARD_GRADIENTS.pink}
            delay={0.4}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Birthdays */}
          <div className="bg-gradient-to-br from-pink-500/90 to-rose-600/90 rounded-[2.5rem] p-6 text-white shadow-2xl shadow-pink-500/20 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-2xl shadow-inner">
                🎂
              </div>
              <div>
                <h3 className="font-black text-xl tracking-tight">Birthdays</h3>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">This month</p>
              </div>
            </div>
            <div className="space-y-3">
              {(peopleEventsData?.birthdays || []).slice(0, 3).map((person: any) => (
                <div key={person.id} className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/5 shadow-sm transition-transform hover:scale-[1.02]">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-black text-sm border border-white/10">
                    {person.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate uppercase tracking-tight">{person.name}</p>
                    <p className="text-white/60 text-[10px] font-bold">{person.date}</p>
                  </div>
                </div>
              ))}
              {(!peopleEventsData?.birthdays || peopleEventsData.birthdays.length === 0) && (
                <p className="text-white/50 text-center py-6 text-xs font-bold uppercase tracking-tighter">No birthdays this month</p>
              )}
            </div>
          </div>

          {/* Anniversaries */}
          <div className="bg-gradient-to-br from-amber-500/90 to-orange-600/90 rounded-[2.5rem] p-6 text-white shadow-2xl shadow-amber-500/20 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-2xl shadow-inner">
                🎉
              </div>
              <div>
                <h3 className="font-black text-xl tracking-tight">Anniversaries</h3>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Work anniversaries</p>
              </div>
            </div>
            <div className="space-y-3">
              {(peopleEventsData?.anniversaries || []).slice(0, 3).map((person: any) => (
                <div key={person.id} className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/5 shadow-sm transition-transform hover:scale-[1.02]">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-black text-sm border border-white/10">
                    {person.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate uppercase tracking-tight">{person.name}</p>
                    <p className="text-white/60 text-[10px] font-bold">{person.date}</p>
                  </div>
                </div>
              ))}
              {(!peopleEventsData?.anniversaries || peopleEventsData.anniversaries.length === 0) && (
                <p className="text-white/50 text-center py-6 text-xs font-bold uppercase tracking-tighter">No anniversaries this month</p>
              )}
            </div>
          </div>

          {/* New Joiners */}
          <div className="bg-gradient-to-br from-emerald-500/90 to-teal-600/90 rounded-[2.5rem] p-6 text-white shadow-2xl shadow-emerald-500/20 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-2xl shadow-inner">
                🚀
              </div>
              <div>
                <h3 className="font-black text-xl tracking-tight">New Joiners</h3>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Recent hires</p>
              </div>
            </div>
            <div className="space-y-3">
              {(peopleEventsData?.joiners || []).slice(0, 3).map((person: any) => (
                <div key={person.id} className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/5 shadow-sm transition-transform hover:scale-[1.02]">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-black text-sm border border-white/10">
                    {person.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate uppercase tracking-tight">{person.name}</p>
                    <p className="text-white/60 text-[10px] font-bold">{person.date}</p>
                  </div>
                </div>
              ))}
              {(!peopleEventsData?.joiners || peopleEventsData.joiners.length === 0) && (
                <p className="text-white/50 text-center py-6 text-xs font-bold uppercase tracking-tighter">No new joiners this month</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Stats Footer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Avg. Attendance Rate', value: attendanceRate, icon: Activity, color: '#6366f1' },
            { label: 'On Leave Today', value: metrics.on_leave_today || 0, icon: Calendar, color: '#f59e0b' },
            { label: 'Late Arrivals Today', value: metrics.late_today || 0, icon: Clock, color: '#ef4444' },
            { label: 'Performance Score', value: performanceScore, icon: Award, color: '#10b981' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-[#0f172a]/80 backdrop-blur-xl rounded-2xl p-5 border border-gray-100 dark:border-white/5 flex items-center gap-5 shadow-xl dark:shadow-2xl transition-all hover:translate-y-[-2px]"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: `${stat.color}20`, border: `1px solid ${stat.color}40` }}
              >
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{stat.value}</p>
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};
