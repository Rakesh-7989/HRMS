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
  Users, AlertCircle, UserCheck, Timer, Sparkles, ExternalLink,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart, Bar, PieChart, Pie, Cell, Sector,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { StatCard } from '@/components/dashboard/StatCard';
import { CustomTooltip } from '@/components/dashboard/CustomTooltip';
import { DASHBOARD_GRADIENTS } from '@/utils/constants';



// Leave Request Card - Enhanced Informational Layout
const LeaveRequestCard = ({ request, index }: { request: any; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className="group"
  >
    <div className="relative overflow-hidden p-3 border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-all duration-300">
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
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    className={`bg-[#111827]/60 dark:bg-[#0f172a]/80 backdrop-blur-xl rounded-2xl p-6 border border-white/5 shadow-2xl ${className}`}
  >
    <div className="flex items-center justify-between mb-6 gap-4">
      <div className="min-w-0">
        <h3 className="text-xl font-black text-white truncate tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs font-bold text-gray-500 mt-1 truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {headerAction}
        {badge && (
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/10 text-white/80 border border-white/5 backdrop-blur-md">
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
      <motion.div className="space-y-6 pb-6" initial="initial" animate="animate">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl p-8 shadow-2xl shadow-indigo-500/20"
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #6366f1 100%)',
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
              <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tighter">
                Welcome back, {user?.first_name}! <span className="inline-block animate-bounce-slow">👋</span>
              </h1>
              <p className="text-white/80 text-lg font-medium max-w-xl leading-relaxed">
                Here's what's happening with your people today. Monitor attendance and leaves at a glance.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-6 backdrop-blur-2xl rounded-2xl p-6 border border-white/10 min-w-fit shadow-inner"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isBaseLoading ? (
            Array(4).fill(0).map((_, i) => <StatSkeleton key={i} />)
          ) : (
            <>
              <StatCard
                title="Pending Leaves"
                value={statsMetrics.pending}
                subtitle="Awaiting review"
                icon={AlertCircle}
                gradient={DASHBOARD_GRADIENTS.orange}
                delay={0.1}
              />
              <StatCard
                title="On Leave Today"
                value={employeesOnLeave.length}
                subtitle="Employees absent"
                icon={UserX}
                gradient={DASHBOARD_GRADIENTS.purple}
                delay={0.2}
              />
              <StatCard
                title="Present Today"
                value={attendanceOverview.total_checkins}
                subtitle={`${attendanceOverview.late_count} late arrivals`}
                icon={UserCheck}
                gradient={DASHBOARD_GRADIENTS.green}
                delay={0.3}
              />
              <StatCard
                title="Approved Requests"
                value={statsMetrics.approved}
                subtitle="All time total"
                icon={CheckCircle}
                gradient={DASHBOARD_GRADIENTS.purple}
                delay={0.4}
              />
            </>
          )}
        </div>


        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                            fill={entry.color}
                            strokeWidth={2}
                            stroke="rgba(255,255,255,0.05)"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={<CustomTooltip />}
                        contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Subtle pulse effect in the center */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55px] h-[55px] rounded-full bg-indigo-500/5 dark:bg-indigo-400/5 animate-pulse-slow" />
                </div>

                {/* Legend - Right Side */}
                <div className="w-full lg:w-1/2 flex flex-col gap-2">
                  {leaveStatusData.map((item, index) => (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      onMouseEnter={() => setActivePieIndex(index)}
                      onMouseLeave={() => setActivePieIndex(undefined)}
                      className={`flex flex-col gap-2 p-3 rounded-2xl transition-all duration-300 ${activePieIndex === index ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shadow-sm"
                            style={{ background: item.color }}
                          />
                          <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{item.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-white bg-white/10 px-2 py-0.5 rounded-md min-w-[28px] text-center">
                          {item.value}
                        </span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.value / totalRequests) * 100}%` }}
                          transition={{ duration: 1.5, delay: 1 }}
                          className="h-full rounded-full"
                          style={{ background: item.color }}
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
                      contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      formatter={(value: any) => [`${value}% Utilization`]}
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

        {/* Attendance Overview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="relative overflow-hidden bg-[#111827]/60 dark:bg-[#0f172a]/80 backdrop-blur-xl rounded-2xl p-8 text-white border border-white/5 shadow-2xl"
        >
          {/* Decorative Glows */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px]" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                  <Clock className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Today's Attendance</h3>
                  <p className="text-white/50 text-xs font-medium uppercase tracking-widest">{format(new Date(), 'eeee, MMMM do')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-md">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">Live Updates</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Employees',
                  desc: 'Active workforce',
                  value: attendanceOverview.total_employees || 0,
                  icon: Users,
                  accent: 'text-indigo-400',
                  bg: 'bg-indigo-500/15',
                  glow: 'shadow-indigo-500/10',
                  gradient: ['#6366f1', '#4f46e5']
                },
                {
                  label: 'Total Present',
                  desc: 'Employees clocked in',
                  value: attendanceOverview.unique_employees,
                  icon: UserCheck,
                  gradient: ['#22d3ee', '#0891b2'],
                },
                {
                  label: 'Not Clocked In',
                  desc: 'Yet to check in',
                  value: attendanceOverview.not_clocked_in || 0,
                  icon: UserX,
                  accent: 'text-slate-400',
                  bg: 'bg-slate-500/15',
                  glow: 'shadow-slate-500/10',
                  gradient: ['#94a3b8', '#475569']
                },
                {
                  label: 'On Time',
                  desc: 'Arrived within schedule',
                  value: Math.max(0, attendanceOverview.total_checkins - attendanceOverview.late_count),
                  icon: CheckCircle,
                  gradient: ['#34d399', '#059669'],
                },
                {
                  label: 'Late Arrivals',
                  desc: 'Clocked in after schedule',
                  value: attendanceOverview.late_count,
                  icon: Timer,
                  gradient: ['#fbbf24', '#d97706'],
                },
                {
                  label: 'Caution Rate',
                  desc: 'Risk of late trends',
                  value: `${attendanceOverview.late_percentage}%`,
                  icon: TrendingUp,
                  gradient: ['#f87171', '#dc2626'],
                },
              ].map((item, index) => (

                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="group relative p-5 rounded-2xl transition-all duration-300 border border-transparent hover:border-white/5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
                      style={{ background: `linear-gradient(135deg, ${item.gradient[0]}, ${item.gradient[1]})` }}
                    >
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-3xl font-black tracking-tighter mb-1">{item.value}</h4>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{item.label}</p>
                    <p className="text-gray-600 text-[10px] font-bold leading-tight line-clamp-1">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Pending Requests and Employees on Leave Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-8">
          {/* Pending Leave Requests */}
          <ChartCard
            title="Pending Leave Requests"
            subtitle={`${pendingRequests.length} submissions`}
            badge="Review"
            delay={0.9}
            headerAction={
              <button
                onClick={() => navigate('/leave?tab=team-requests')}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/5"
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
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/5"
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
                    className="group rounded-xl p-3 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all"
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
