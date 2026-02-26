import React, { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { dashboardService } from '@/services/common/dashboard.service';
import { eventsService } from '@/services/common/events.service';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, TrendingUp, Coffee, CheckCircle,
  CalendarPlus, Loader2, Sparkles,
  Award, ChevronRight, MapPin, Gift, Cake, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart, Line
} from 'recharts';
import { StatCard } from '@/components/dashboard/StatCard';
import { DASHBOARD_GRADIENTS } from '@/utils/constants';
import { ClockWidget } from '../../components/attendance/ClockWidget';

const STATUS_COLORS: Record<string, string> = {
  DONE: '#10b981',
  IN_PROGRESS: '#3b82f6',
  TODO: '#f59e0b',
  REVIEW: '#8b5cf6',
  BACKLOG: '#64748b',
};




// --- UI Components ---



const ActionButton = ({
  icon: Icon, title, subtitle, onClick, colorClass, gradientClass, delay = 0, shortcutKey
}: any) => (
  <motion.button
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    whileHover={{ scale: 1.02, x: 4 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`w-full p-6 rounded-2xl border flex items-center gap-5 group transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${colorClass}`}
  >
    <div className={`w-14 h-14 rounded-2xl text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform shrink-0 ml-1 ${gradientClass}`}>
      <Icon className="w-7 h-7" />
    </div>
    <div className="flex-1 text-left ml-2">
      <p className="font-bold text-slate-800 dark:text-white text-lg">{title}</p>
      <p className="text-sm font-medium opacity-60">{subtitle}</p>
    </div>
    {shortcutKey && (
      <kbd className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 group-hover:bg-indigo-100 group-hover:text-indigo-600 dark:group-hover:bg-indigo-900/40 dark:group-hover:text-indigo-400 transition-colors">
        {shortcutKey}
      </kbd>
    )}
    <ChevronRight className="w-6 h-6 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all mr-2" />
  </motion.button>
);

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
    className={`bg-white dark:bg-[#111827]/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-xl dark:shadow-2xl ${className}`}
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



// --- Main Component ---

export const EmployeeDashboard: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  // Greeting Logic
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'personal'],
    queryFn: () => dashboardService.getPersonalDashboard(),
  });

  const { data: peopleEventsData } = useQuery({
    queryKey: ['peopleEvents', 'personal'],
    queryFn: () => eventsService.getPeopleEvents('personal'),
    staleTime: 1000 * 60 * 5,
  });

  // Data Processing
  const profile = data?.profile;
  const leaveMetrics = data?.leaveMetrics || { pending: 0, approved: 0, rejected: 0, upcoming_leaves: 0 };
  const attendanceSummary = data?.attendanceSummary || { total_days: 0, days_present: 0 };

  const monthlyAttendance = data?.monthlyAttendance || [];
  const upcomingLeaves = data?.upcomingLeaves || [];

  const attendanceRate = attendanceSummary.total_days && attendanceSummary.days_present
    ? Math.round((Number(attendanceSummary.days_present) / 30) * 100)
    : 0;

  // Keyboard shortcuts for Quick Actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      switch (e.key) {
        case '1':
          navigate('/leave');
          break;
        case '2':
          navigate('/attendance');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Task Data Processing
  const taskChartData = (data?.taskMetrics || []).map((m: any) => ({
    name: m.column_key.replace('_', ' '),
    value: Number(m.count)
  }));

  const attendanceChartData = monthlyAttendance
    .reduce((acc: any[], att: any) => {
      const date = format(new Date(att.date), 'MMM dd');
      const sortDate = new Date(att.date).getTime();
      let existing = acc.find((item) => item.date === date);
      if (!existing) {
        existing = { date, sortDate, Present: 0, Late: 0, Absent: 0 };
        acc.push(existing);
      }
      if (att.type === 'ON_TIME' || att.type === 'PRESENT') existing.Present += Number(att.count);
      else if (att.type === 'LATE') existing.Late += Number(att.count);
      else if (att.type === 'ABSENT') existing.Absent += Number(att.count);
      return acc;
    }, [])
    .sort((a: any, b: any) => a.sortDate - b.sortDate);

  const weeklyHoursData = useMemo(() => {
    if (!data?.weeklyActivity) return [];
    return data.weeklyActivity.map((day: any) => {
      let hours = 0;
      if (day.check_in_time && day.check_out_time) {
        const [h1, m1] = day.check_in_time.split(':').map(Number);
        const [h2, m2] = day.check_out_time.split(':').map(Number);
        const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        hours = Math.max(0, parseFloat((diff / 60).toFixed(1)));
      }
      return {
        date: format(new Date(day.date), 'EEE'), // Mon, Tue...
        hours,
        fullDate: day.date
      };
    });
  }, [data?.weeklyActivity]);

  if (isLoading) {
    return (
      <DashboardLayout title="My Dashboard">
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Dashboard">
      <motion.div className="space-y-6 pb-6" initial="initial" animate="animate">

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
                  {greeting}
                </span>
              </motion.div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tighter">
                Welcome back, {profile?.first_name || user?.first_name}! <span className="inline-block animate-bounce-slow">👋</span>
              </h1>
              <p className="text-white/80 text-lg font-medium max-w-xl leading-relaxed">
                <MapPin className="w-4 h-4 inline mr-2 text-indigo-300" />
                {profile?.designation || 'Team Member'} • {profile?.department || 'General'}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* --- Left Column: Clock Widget & Actions --- */}
          <div className="space-y-8">
            {/* Clock Widget */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-[#111827]/60 backdrop-blur-xl rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-xl dark:shadow-2xl"
            >
              <ClockWidget />
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Quick Actions</h3>
                <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-[10px]">Tab</kbd>
                  to navigate
                </span>
              </div>
              <div className="grid grid-cols-1 gap-5">
                <ActionButton
                  icon={CalendarPlus} title="Apply Leave" subtitle="Request Time Off"
                  onClick={() => navigate('/leave')}
                  colorClass="bg-white dark:bg-[#111827]/60 backdrop-blur-xl border-gray-100 dark:border-white/5 shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-500/50"
                  gradientClass="bg-gradient-to-br from-indigo-500 to-purple-600"
                  delay={0.4}
                  shortcutKey="1"
                />
                <ActionButton
                  icon={Calendar} title="Attendance" subtitle="View History"
                  onClick={() => navigate('/attendance')}
                  colorClass="bg-white dark:bg-[#111827]/60 backdrop-blur-xl border-gray-100 dark:border-white/5 shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-500/50"
                  gradientClass="bg-gradient-to-br from-emerald-500 to-teal-600"
                  delay={0.5}
                  shortcutKey="2"
                />
              </div>
            </motion.div>

            {/* Celebrations (Moved to Left Column) */}
            <ChartCard title="Celebrations" delay={0.6}>
              <div className="space-y-3">
                {[...(peopleEventsData?.birthdays || []), ...(peopleEventsData?.anniversaries || [])].slice(0, 3).map((evt: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5">
                    <div className={`w - 10 h - 10 rounded - lg flex items - center justify - center text - white ${evt.type === 'BIRTHDAY' ? 'bg-pink-500' : 'bg-amber-500'} `}>
                      {evt.type === 'BIRTHDAY' ? <Cake className="w-5 h-5" /> : <Award className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{evt.name}</p>
                      <p className="text-xs font-semibold text-slate-400">
                        {evt.date} • {evt.type === 'BIRTHDAY' ? 'Birthday' : 'Anniversary'}
                      </p>
                    </div>
                  </div>
                ))}
                {(!peopleEventsData?.birthdays?.length && !peopleEventsData?.anniversaries?.length) && (
                  <div className="flex flex-col items-center justify-center h-[150px] text-center opacity-60">
                    <Gift className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-400">No events this week</p>
                  </div>
                )}
              </div>
            </ChartCard>
          </div>

          {/* --- Right Column: Stats & Charts --- */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Present" value={attendanceSummary.days_present || 0} icon={CheckCircle}
                gradient={DASHBOARD_GRADIENTS.green} delay={0.2}
              />
              <StatCard
                title="Leave Balance" value={data?.leaveBalance || 0} subtitle="Days Available" icon={Coffee}
                gradient={DASHBOARD_GRADIENTS.purple} delay={0.3}
              />
              <StatCard
                title="Upcoming" value={leaveMetrics.upcoming_leaves || 0} subtitle="Approved Leaves" icon={Calendar}
                gradient={DASHBOARD_GRADIENTS.orange} delay={0.4}
              />
              <StatCard
                title="On Time Rate" value={`${attendanceRate}%`} icon={TrendingUp}
                gradient={DASHBOARD_GRADIENTS.pink} delay={0.5}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Attendance History" subtitle="Status Overview" delay={0.55}>
                <div className="h-[250px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={attendanceChartData}>
                      <defs>
                        <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.5} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={10} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '3 3' }}
                      />
                      <Area type="step" dataKey="Present" stackId="1" stroke="#10b981" fill="url(#colorPresent)" strokeWidth={2} />
                      <Area type="step" dataKey="Late" stackId="1" stroke="#f59e0b" fill="url(#colorLate)" strokeWidth={2} />
                      <Area type="step" dataKey="Absent" stackId="1" stroke="#ef4444" fill="url(#colorAbsent)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Weekly Efficiency" subtitle="Hours Worked" delay={0.6}>
                <div className="h-[250px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={weeklyHoursData}>
                      <defs>
                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.5} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip
                        cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '3 3' }}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const actual = payload[0].value;
                            const target = 9;
                            return (
                              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-xl border border-slate-100 dark:border-white/5 min-w-[140px]">
                                <p className="font-bold text-slate-800 dark:text-white mb-2 text-sm">{label}</p>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">Required:</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{target} hrs</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">Worked:</span>
                                    <span className={`font - bold ${Number(actual) >= target ? 'text-emerald-500' : 'text-amber-500'} `}>
                                      {actual} hrs
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="hours" stroke="none" fill="url(#colorHours)" />
                      <Line
                        type="monotone"
                        dataKey="hours"
                        stroke="#6366f1"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#fff', stroke: '#6366f1', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            {/* Task Overview */}



            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Task Distribution */}
              <ChartCard title="Task Distribution" delay={0.65}>
                <div className="h-[200px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {taskChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name.replace(' ', '_').toUpperCase()] || '#cbd5e1'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value, entry: any) => (
                          <span className="text-gray-400 font-bold ml-2 uppercase text-[10px] tracking-widest">
                            {value} <span className="text-gray-600">({entry.payload.value})</span>
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              {/* Upcoming Leaves */}
              <ChartCard title="Upcoming Leaves" delay={0.7}>
                {upcomingLeaves.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingLeaves.slice(0, 3).map((leave: any, i: number) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <Coffee className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-white text-sm tracking-tight uppercase">{leave.leave_type}</p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            {format(new Date(leave.start_date), 'MMM dd')} - {format(new Date(leave.end_date), 'MMM dd')}
                          </p>
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                          {leave.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[150px] text-center opacity-60">
                    <Coffee className="w-10 h-10 text-gray-700 mb-2" />
                    <p className="text-xs font-black text-gray-600 uppercase tracking-widest">No upcoming leaves</p>
                  </div>
                )}
              </ChartCard>
            </div>
          </div>
        </div>


        {hasPermission('view_admin_dashboard') && !hasPermission('view_all_employees') && (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-12 border border-slate-100 dark:border-white/5 shadow-xl text-center">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Platform Administrator</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              You are currently logged in with platform-wide administrative privileges.
              Please use the <strong>Tenants</strong> and <strong>Plans</strong> sections to manage the platform.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button onClick={() => navigate('/dashboard/system')}>Go to System Dashboard</Button>
              <Button variant="ghost" onClick={() => navigate('/tenants')}>View All Tenants</Button>
            </div>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default EmployeeDashboard;
