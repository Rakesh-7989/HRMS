import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { dashboardService } from '@/services/dashboard.service';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import {
  Calendar, Clock, UserX, CheckCircle,
  Users, AlertCircle, UserCheck, Timer, Sparkles, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart, Bar, PieChart, Pie, Cell, Sector,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-gray-700 min-w-[140px]">
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-extrabold border-b border-gray-700 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => {
          const isUtilization = entry.dataKey === 'value' && entry.payload.count !== undefined;
          return (
            <div key={index} className="space-y-1 py-1">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm font-medium text-gray-300">
                    {isUtilization ? 'Taken' : entry.name}
                  </span>
                </div>
                <span className="text-sm font-bold">
                  {entry.value}{isUtilization ? '%' : ''}
                </span>
              </div>
              {isUtilization && (
                <div className="flex items-center justify-between text-[10px] text-gray-500 ml-4 font-bold uppercase tracking-tighter">
                  <span>Req. Count</span>
                  <span>{entry.payload.count}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

// Stat Card Component
const StatCard = ({
  title, value, subtitle, icon: Icon, gradient, delay = 0
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: any;
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
    <div className="relative overflow-hidden rounded-[1.5rem] p-5 h-full bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/5">
      {/* Subtle Decorative Pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <circle cx="80" cy="20" r="40" fill="currentColor" className="text-slate-900 dark:text-white" />
          <circle cx="10" cy="80" r="20" fill="currentColor" className="text-slate-900 dark:text-white" />
        </svg>
      </div>

      {/* Icon Accent */}
      <div
        className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-white/10"
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
        {subtitle && (
          <p className="text-slate-400/60 dark:text-slate-500/60 text-[9px] mt-2 font-bold uppercase tracking-widest bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded-full w-fit">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  </motion.div>
);

// Leave Request Card - Enhanced Informational Layout
const LeaveRequestCard = ({ request, index }: { request: any; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className="group"
  >
    <div className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center gap-3">
        {/* Avatar with soft glow */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-base shadow-md group-hover:scale-105 transition-transform">
            {request.first_name?.charAt(0)}{request.last_name?.charAt(0)}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-white dark:border-gray-900" />
        </div>

        {/* Informational Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-gray-900 dark:text-white truncate text-sm">
              {request.first_name} {request.last_name}
            </h4>
            <span className="text-[9px] text-gray-400 font-bold uppercase">
              {format(new Date(request.created_at), 'MMM dd')}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-wider">
              <Calendar className="w-2.5 h-2.5" />
              {format(new Date(request.start_date), 'MMM dd')} - {format(new Date(request.end_date), 'MMM dd')}
            </div>
            <span className="text-[9px] text-gray-400 font-bold uppercase truncate">• {request.department}</span>
          </div>
        </div>

        {/* Status indicator */}
        <div className="shrink-0 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-100/50 dark:border-amber-500/20">
          <p className="text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest leading-none">STATUS</p>
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 mt-0.5">Pending</p>
        </div>
      </div>
    </div>
  </motion.div>
);

// Loading Skeleton Component
const Skeleton = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl ${className}`} />
);

// Stat Skeleton
const StatSkeleton = () => (
  <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 h-36">
    <Skeleton className="w-11 h-11 rounded-xl mb-3" />
    <Skeleton className="w-16 h-7 mb-1.5" />
    <Skeleton className="w-24 h-3.5" />
  </div>
);

// Chart Card
const ChartCard = ({
  title, subtitle, badge, children, className = '', delay = 0, headerAction
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
  headerAction?: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
    transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    className={`bg-white dark:bg-gray-900 rounded-3xl p-4 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-gray-200/60 dark:hover:shadow-indigo-500/5 transition-all duration-300 ${className}`}
  >
    <div className="flex items-center justify-between mb-3">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {headerAction}
        {badge && (
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            {badge}
          </span>
        )}
      </div>
    </div>
    {children}
  </motion.div>
);

export const HRDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activePieIndex, setActivePieIndex] = React.useState<number | undefined>(undefined);
  const [statusDateRange, setStatusDateRange] = React.useState({
    start: undefined as string | undefined,
    end: undefined as string | undefined
  });

  const [utilizationDateRange, setUtilizationDateRange] = React.useState({
    start: undefined as string | undefined,
    end: undefined as string | undefined
  });

  // Base Dashboard Data for top stats (Always Overall)
  const { data: baseData, isLoading: isBaseLoading } = useQuery({
    queryKey: ['dashboard', 'hr', 'base'],
    queryFn: () => dashboardService.getHRDashboard(),
  });

  // Main dashboard data for Status Chart (Filtered)
  const { data: statusData, isLoading: isStatusLoading } = useQuery({
    queryKey: ['dashboard', 'hr', 'status', statusDateRange.start, statusDateRange.end],
    queryFn: () => dashboardService.getHRDashboard({ startDate: statusDateRange.start, endDate: statusDateRange.end }),
  });

  // Utilization specific data (Filtered)
  const { data: utilizationData, isLoading: isUtilizationLoading } = useQuery({
    queryKey: ['dashboard', 'hr', 'utilization', utilizationDateRange.start, utilizationDateRange.end],
    queryFn: () => dashboardService.getHRDashboard({ startDate: utilizationDateRange.start, endDate: utilizationDateRange.end }),
  });


  const statsMetrics = baseData?.leaveMetrics || { pending: 0, approved: 0, rejected: 0 };
  const chartMetrics = statusData?.leaveMetrics || { pending: 0, approved: 0, rejected: 0 };



  const pendingRequests = baseData?.pendingRequests || [];
  const leaveTypeDist = utilizationData?.leaveTypeDistribution || [];
  const attendanceOverview = baseData?.attendanceOverview || {
    total_checkins: 0,
    unique_employees: 0,
    late_count: 0,
    late_percentage: 0,
    total_employees: 0,
    not_clocked_in: 0,
  };
  const employeesOnLeave = baseData?.employeesOnLeaveToday || [];

  // Custom Active Shape for Pie
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: 'drop-shadow(0px 0px 8px rgba(0,0,0,0.2))' }}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 12}
          outerRadius={outerRadius + 15}
          fill={fill}
        />
      </g>
    );
  };

  // Chart data
  const leaveDistData = leaveTypeDist.map((lt: any) => ({
    name: lt.leave_type,
    value: parseFloat(lt.utilization_percentage) || 0,
    count: lt.count
  }));

  const leaveStatusData = [
    { name: 'Approved', value: chartMetrics.approved, color: '#10b981' },
    { name: 'Pending', value: chartMetrics.pending, color: '#f59e0b' },
    { name: 'Rejected', value: chartMetrics.rejected, color: '#ef4444' },
  ];



  const totalRequests = leaveStatusData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <DashboardLayout title="HR Dashboard">
      <motion.div
        className="space-y-8"
        initial="initial"
        animate="animate"
      >
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2.5rem] p-8 bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-200/50 dark:shadow-none"
        >
          {/* Subtle Patterns */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
            <div className="absolute inset-0 text-slate-900 dark:text-white" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='currentColor' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 mb-1"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-widest">
                  Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}
                </span>
              </motion.div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">
                Welcome back, {user?.first_name}! 👋
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                Here's what's happening with your people today
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 rounded-3xl p-4 min-w-fit border border-slate-100 dark:border-white/5 shadow-sm"
              >
                <div className="text-center px-4 border-r border-slate-200 dark:border-white/10">
                  <p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-none">{format(new Date(), 'dd')}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-bold">{format(new Date(), 'MMM')}</p>
                </div>
                <div className="text-center px-4">
                  <p className="text-2xl md:text-3xl font-black text-indigo-600 leading-none uppercase">{format(new Date(), 'eee')}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-bold">Today</p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>



        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isBaseLoading ? (
            Array(4).fill(0).map((_, i) => <StatSkeleton key={i} />)
          ) : (
            <>
              <StatCard
                title="Pending Leaves"
                value={statsMetrics.pending}
                subtitle="Awaiting review"
                icon={AlertCircle}
                gradient="linear-gradient(135deg, #f59e0b, #d97706)"
                delay={0.1}
              />
              <StatCard
                title="On Leave Today"
                value={employeesOnLeave.length}
                subtitle="Employees absent"
                icon={UserX}
                gradient="linear-gradient(135deg, #6366f1, #4f46e5)"
                delay={0.2}
              />
              <StatCard
                title="Present Today"
                value={attendanceOverview.total_checkins}
                subtitle={`${attendanceOverview.late_count} late arrivals`}
                icon={UserCheck}
                gradient="linear-gradient(135deg, #10b981, #059669)"
                delay={0.3}
              />
              <StatCard
                title="Approved Requests"
                value={statsMetrics.approved}
                subtitle="All time total"
                icon={CheckCircle}
                gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
                delay={0.4}
              />
            </>
          )}
        </div>


        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leave Status Radial Chart */}
          <ChartCard
            title="Leave Request Status"
            subtitle="Overview by result"
            delay={0.5}
            headerAction={
              <div className="flex items-center gap-2">
                {statusDateRange.start && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50"
                    onClick={() => setStatusDateRange({ start: undefined, end: undefined })}
                  >
                    CLEAR
                  </Button>
                )}
                <div className="min-w-[200px]">
                  <DateRangePicker
                    startDate={statusDateRange.start || ''}
                    endDate={statusDateRange.end || ''}
                    onStartDateChange={(s) => setStatusDateRange(prev => ({ ...prev, start: s }))}
                    onEndDateChange={(e) => setStatusDateRange(prev => ({ ...prev, end: e }))}
                    placeholder="Overall Data"
                    className="!px-2 !py-1 !rounded-lg text-[10px]"
                  />
                </div>
              </div>
            }
          >
            {isStatusLoading ? (
              <div className="h-72 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
              </div>
            ) : totalRequests === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                <div className="relative w-40 h-40 mb-4 opacity-20">
                  <div className="absolute inset-0 border-[15px] border-current rounded-full" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Calendar className="w-12 h-12" />
                  </div>
                </div>
                <p className="text-sm font-bold uppercase tracking-widest">No data for this period</p>
                <p className="text-[10px] mt-1">Try selecting a broader date range</p>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row items-center gap-8 min-h-[300px]">
                {/* Donut Chart - Left Side */}
                <div className="relative w-full lg:w-1/2 h-[280px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <linearGradient id="pieGreen" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id="pieYellow" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#d97706" />
                        </linearGradient>
                        <linearGradient id="pieRed" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="100%" stopColor="#dc2626" />
                        </linearGradient>
                      </defs>
                      <Pie
                        activeIndex={activePieIndex}
                        activeShape={renderActiveShape}
                        data={leaveStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                        isAnimationActive={true}
                        animationBegin={0}
                        animationDuration={1500}
                        animationEasing="ease-out"
                        onMouseEnter={(_, index) => setActivePieIndex(index)}
                        onMouseLeave={() => setActivePieIndex(undefined)}
                      >
                        {leaveStatusData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color.includes('#') ? entry.color : `url(#${entry.color})`}
                            strokeWidth={2}
                            stroke="rgba(255,255,255,0.05)"
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Subtle pulse effect in the center */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55px] h-[55px] rounded-full bg-indigo-500/5 dark:bg-indigo-400/5 animate-pulse-slow" />
                </div>

                {/* Premium Animated Legend - Right Side */}
                <div className="w-full lg:w-1/2 flex flex-col gap-3">
                  {leaveStatusData.map((item, index) => (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      onMouseEnter={() => setActivePieIndex(index)}
                      onMouseLeave={() => setActivePieIndex(undefined)}
                      className={`flex flex-col gap-2 p-3 rounded-2xl transition-all duration-300 ${activePieIndex === index ? 'bg-indigo-50/50 dark:bg-indigo-500/10 ring-1 ring-indigo-500/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shadow-sm"
                            style={{ background: item.color.includes('#') ? item.color : `linear-gradient(to bottom right, ${item.color.includes('Green') ? '#10b981, #059669' : item.color.includes('Yellow') ? '#f59e0b, #d97706' : '#ef4444, #dc2626'})` }}
                          />
                          <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest leading-none">{item.name}</span>
                        </div>
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/20 px-2 py-0.5 rounded-md min-w-[28px] text-center">
                          {item.value}
                        </span>
                      </div>
                      <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.value / totalRequests) * 100}%` }}
                          transition={{ duration: 1.5, delay: 1 }}
                          className="h-full rounded-full"
                          style={{ background: item.color.includes('#') ? item.color : (item.name === 'Approved' ? '#10b981' : item.name === 'Pending' ? '#f59e0b' : '#ef4444') }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>

          {/* Leave Type Distribution */}
          <ChartCard
            title="Leave Utilization"
            subtitle="Entitlement usage"
            badge={`${leaveTypeDist.length} Types`}
            delay={0.6}
            headerAction={
              <div className="flex items-center gap-2">
                {utilizationDateRange.start && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50"
                    onClick={() => setUtilizationDateRange({ start: undefined, end: undefined })}
                  >
                    CLEAR
                  </Button>
                )}
                <div className="min-w-[200px]">
                  <DateRangePicker
                    startDate={utilizationDateRange.start || ''}
                    endDate={utilizationDateRange.end || ''}
                    onStartDateChange={(s) => setUtilizationDateRange(prev => ({ ...prev, start: s }))}
                    onEndDateChange={(e) => setUtilizationDateRange(prev => ({ ...prev, end: e }))}
                    placeholder="Overall Data"
                    className="!px-2 !py-1 !rounded-lg text-[10px]"
                  />
                </div>
              </div>
            }
          >

            {isUtilizationLoading ? (
              <div className="h-72 flex flex-col gap-4 justify-center">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-24 h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    <div className="flex-1 h-6 bg-indigo-50 dark:bg-indigo-900/20 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : leaveDistData.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                <div className="p-4 rounded-full bg-slate-50 dark:bg-slate-800/50 mb-3">
                  <Timer className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest">No Leave Types Found</p>
                <p className="text-[10px] mt-1">Configure leave types in settings</p>
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leaveDistData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }} barSize={16}>
                    <defs>
                      <linearGradient id="barGradient1" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                      <linearGradient id="barGradient2" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#d946ef" />
                      </linearGradient>
                      <linearGradient id="barGradient3" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="barGradient4" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={true} opacity={0.3} />
                    <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }} unit="%" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 600 }}
                      width={100}
                    />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      content={<CustomTooltip />}
                    />
                    <Bar
                      dataKey="value"
                      radius={[0, 4, 4, 0]}
                      isAnimationActive={true}
                      animationBegin={0}
                      animationDuration={1500}
                    >
                      {leaveDistData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#barGradient${(index % 4) + 1})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Attendance Overview - Twilight Aura Palette */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="relative overflow-hidden bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-200/50 dark:shadow-none"
        >
          {/* Subtle Accent Pattern */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <circle cx="90" cy="10" r="30" fill="currentColor" className="text-indigo-500" />
              <circle cx="10" cy="90" r="20" fill="currentColor" className="text-emerald-500" />
            </svg>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-white/10 transition-transform hover:rotate-6">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Today's Attendance</h3>
                  <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">{format(new Date(), 'eeee, MMMM do')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live Updates</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {[
                {
                  label: 'Total Employees',
                  desc: 'Active workforce',
                  value: attendanceOverview.total_employees || 0,
                  icon: Users,
                  accent: 'text-indigo-400',
                  bg: 'bg-indigo-500/15',
                  glow: 'shadow-indigo-500/10'
                },
                {
                  label: 'Total Present',
                  desc: 'Employees clocked in',
                  value: attendanceOverview.unique_employees,
                  icon: UserCheck,
                  accent: 'text-cyan-400',
                  bg: 'bg-cyan-500/15',
                  glow: 'shadow-cyan-500/10'
                },
                {
                  label: 'Not Clocked In',
                  desc: 'Yet to check in',
                  value: attendanceOverview.not_clocked_in || 0,
                  icon: UserX,
                  accent: 'text-slate-400',
                  bg: 'bg-slate-500/15',
                  glow: 'shadow-slate-500/10'
                },
                {
                  label: 'On Time',
                  desc: 'Arrived within schedule',
                  value: Math.max(0, attendanceOverview.total_checkins - attendanceOverview.late_count),
                  icon: CheckCircle,
                  accent: 'text-emerald-400',
                  bg: 'bg-emerald-500/15',
                  glow: 'shadow-emerald-500/10'
                },
                {
                  label: 'Late Arrivals',
                  desc: 'Clocked in after schedule',
                  value: attendanceOverview.late_count,
                  icon: Timer,
                  accent: 'text-amber-400',
                  bg: 'bg-amber-500/15',
                  glow: 'shadow-amber-500/10'
                },
              ].map((item, index) => (

                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="group relative p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-indigo-500/10 transition-all duration-300 shadow-md hover:shadow-xl"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-12 h-12 rounded-2xl ${item.bg} flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform shadow-lg`}>
                      <item.icon className={`w-6 h-6 ${item.accent}`} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">{item.value}</h3>
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${item.accent}`}>{item.label}</p>
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold leading-tight group-hover:text-slate-900 dark:group-hover:text-white transition-colors uppercase tracking-wider">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Pending Requests and Employees on Leave Side-by-Side - Enhanced Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
          {/* Pending Leave Requests */}
          <ChartCard
            title="Pending Leave Requests"
            subtitle={`${pendingRequests.length} submissions`}
            badge="Review"
            delay={0.9}
            headerAction={
              <button
                onClick={() => navigate('/leave?tab=team-requests')}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100/50"
              >
                Manage
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            }
          >
            {pendingRequests.length > 0 ? (
              <div className="space-y-2 h-[170px] overflow-y-auto pr-1.5 custom-scrollbar">
                {pendingRequests.map((request: any, index: number) => (
                  <LeaveRequestCard key={request.id} request={request} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center h-[170px] flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border border-dashed border-gray-200">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="text-[11px] font-black text-gray-900 dark:text-white mb-0.5 uppercase tracking-tighter">Queue Clear</h4>
                <p className="text-[8px] text-gray-500 font-medium">No pending requests</p>
              </div>
            )}
          </ChartCard>

          {/* Employees on Leave Today */}
          <ChartCard
            title="Today's Out of Office"
            subtitle={`${employeesOnLeave.length} staff away`}
            delay={1.0}
            headerAction={
              <button
                onClick={() => navigate('/attendance')}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100/50"
              >
                Logs
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            }
          >
            {employeesOnLeave.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-[170px] overflow-y-auto pr-1.5 custom-scrollbar">
                {employeesOnLeave.map((emp: any, index: number) => (
                  <motion.div
                    key={emp.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="group bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-3 flex items-center gap-3 border border-slate-100 dark:border-slate-800/50 hover:border-blue-300 transition-all shadow-sm"
                  >
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
                        {emp.first_name?.charAt(0)}{emp.last_name?.charAt(0)}
                      </div>
                      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-gray-900 shadow-sm" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white truncate text-xs">
                        {emp.first_name} {emp.last_name}
                      </p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[8px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          {emp.leave_type}
                        </span>
                        <span className="text-[8px] text-gray-400 font-bold">• {emp.department}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center h-[170px] flex flex-col items-center justify-center bg-slate-50/30 dark:bg-slate-800/10 rounded-2xl border border-dashed border-slate-200">
                <div className="relative mb-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center ring-4 ring-emerald-500/5">
                    <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <h4 className="text-[11px] font-black text-gray-900 dark:text-white mb-0.5 uppercase tracking-tighter">Full Presence</h4>
                <p className="text-[8px] text-gray-500 font-medium">All employees are active.</p>
              </div>
            )}
          </ChartCard>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};
