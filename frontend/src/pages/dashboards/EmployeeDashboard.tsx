import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { dashboardService } from '@/services/dashboard.service';
import { attendanceService } from '@/services/attendance.service';
import { eventsService } from '@/services/events.service';
import { geoFencingService } from '@/services/geoFencing.service';
import { detectDeviceType } from '@/utils/deviceDetection';
import { formatTime12Hour } from '@/utils/timeFormat';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, TrendingUp, Coffee, CheckCircle, LogIn, LogOut,
  CalendarPlus, Loader2, Sparkles, Timer,
  Award, ChevronRight, MapPin, Gift, Cake, Activity
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart, Line
} from 'recharts';
import { useTranslation } from 'react-i18next';

const STATUS_COLORS: Record<string, string> = {
  DONE: '#10b981',
  IN_PROGRESS: '#3b82f6',
  TODO: '#f59e0b',
  REVIEW: '#8b5cf6',
  BACKLOG: '#64748b',
};




// --- UI Components ---

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
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ y: -5 }}
    className="relative group overflow-hidden rounded-[2rem] p-6 text-white shadow-xl"
    style={{ background: gradient }}
  >
    <div className="absolute inset-0 opacity-10 bg-white/10" />
    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all" />

    <div className="relative z-10">
      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="text-3xl font-black mb-1">{value}</h3>
      <p className="font-bold text-white/90 text-sm tracking-wide">{title}</p>
      {subtitle && <p className="text-white/60 text-[10px] uppercase tracking-wider font-medium mt-1">{subtitle}</p>}
    </div>
  </motion.div>
);

const ActionButton = ({
  icon: Icon, title, subtitle, onClick, colorClass, gradientClass, delay = 0
}: any) => (
  <motion.button
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    whileHover={{ scale: 1.02, x: 4 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`w-full p-4 rounded-2xl border flex items-center gap-4 group transition-all duration-300 ${colorClass}`}
  >
    <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center shadow-lg ${gradientClass}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="flex-1 text-left">
      <p className="font-bold text-slate-800 dark:text-white">{title}</p>
      <p className="text-xs font-medium opacity-60">{subtitle}</p>
    </div>
    <ChevronRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
  </motion.button>
);

const ChartCard = ({ title, subtitle, children, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none"
  >
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-lg font-black text-slate-800 dark:text-white">{title}</h3>
        {subtitle && <p className="text-sm font-medium text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {children}
  </motion.div>
);



// --- Main Component ---

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const { t } = useTranslation();

  const canClockIn = user?.role === 'EMPLOYEE' || user?.role === 'MANAGER' || user?.role === 'HR';

  // Greeting Logic
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('common.morning');
    if (hour < 17) return t('common.afternoon');
    return t('common.evening');
  }, [t]);

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

  const { data: geoSettings } = useQuery({
    queryKey: ['geo-fencing-settings'],
    queryFn: () => geoFencingService.getSettings(),
  });

  // Mutations
  const clockInMutation = useMutation({
    mutationFn: (coords?: { latitude: number; longitude: number; device?: string }) => attendanceService.clockIn(coords),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'personal'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error: any) => {
      const serverMessage = error.response?.data?.message || error.message || '';
      alert(serverMessage || 'Failed to clock in');
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: (coords?: { latitude: number; longitude: number; device?: string }) => attendanceService.clockOut(coords),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'personal'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error: any) => {
      const serverMessage = error.response?.data?.message || error.message || '';
      alert(serverMessage || 'Failed to clock out');
    },
  });

  const handleClockIn = async () => {
    if (geoSettings?.is_enabled) {
      const check = await geoFencingService.performGeoFenceCheck(geoSettings);
      if (!check.allowed) {
        alert(check.errorMessage || 'Geo-fence validation failed');
        return;
      }
      clockInMutation.mutate({
        latitude: check.position?.coords.latitude!,
        longitude: check.position?.coords.longitude!,
        device: detectDeviceType()
      });
    } else {
      clockInMutation.mutate({ device: detectDeviceType() } as any);
    }
  };

  const handleClockOut = async () => {
    const isConfirmed = await confirm({
      title: 'Confirm Clock Out',
      message: 'Are you sure you want to clock out now? This will end your current working session.',
      confirmText: 'Clock Out',
      cancelText: 'Cancel',
      type: 'destructive'
    });

    if (!isConfirmed) return;

    if (geoSettings?.is_enabled) {
      const check = await geoFencingService.performGeoFenceCheck(geoSettings);
      if (!check.allowed) {
        alert(check.errorMessage || 'Geo-fence validation failed');
        return;
      }
      clockOutMutation.mutate({
        latitude: check.position?.coords.latitude!,
        longitude: check.position?.coords.longitude!,
        device: detectDeviceType()
      });
    } else {
      clockOutMutation.mutate({ device: detectDeviceType() } as any);
    }
  };

  // Data Processing
  const profile = data?.profile;
  const leaveMetrics = data?.leaveMetrics || { pending: 0, approved: 0, rejected: 0, upcoming_leaves: 0 };
  const attendanceSummary = data?.attendanceSummary || { total_days: 0, days_present: 0 };
  const todayStatus = data?.todayStatus || { check_in_time: null, check_out_time: null, is_late: null, status: 'NOT_CHECKED_IN' };
  const monthlyAttendance = data?.monthlyAttendance || [];
  const upcomingLeaves = data?.upcomingLeaves || [];

  const attendanceRate = attendanceSummary.total_days && attendanceSummary.days_present
    ? Math.round((Number(attendanceSummary.days_present) / 30) * 100)
    : 0;

  const getWorkingTime = () => {
    if (!todayStatus.check_in_time) return null;
    const checkIn = new Date(`2000-01-01T${todayStatus.check_in_time}`);

    let checkOut: Date;
    if (todayStatus.check_out_time) {
      checkOut = new Date(`2000-01-01T${todayStatus.check_out_time}`);
    } else {
      const nowStr = format(new Date(), 'HH:mm:ss');
      checkOut = new Date(`2000-01-01T${nowStr}`);
    }

    let diffMins = differenceInMinutes(checkOut, checkIn);
    // Handle overnight shifts (if calculation is negative, add 24 hours)
    if (diffMins < 0) {
      diffMins += 24 * 60;
    }

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return { hours, mins };
  };

  const workingTime = getWorkingTime();

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
    <DashboardLayout title={t('dashboard.employeeDashboard')}>
      <motion.div className="space-y-8 pb-10" initial="initial" animate="animate">

        {/* --- Welcome Banner (Twilight Theme) --- */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2rem] p-6 lg:p-8 text-white border border-white/5 shadow-2xl shadow-indigo-500/15"
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)',
          }}
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 mb-1"
              >
                <Sparkles className="w-5 h-5 text-yellow-300" />
                <span className="text-white/80 text-sm font-medium uppercase tracking-wider">{t('common.good')} {greeting}</span>
              </motion.div>
              <h1 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight">
                {t('common.welcomeBack')}, {user?.first_name}! 👋
              </h1>
              <p className="text-white/70 text-lg md:text-xl font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-300" />
                {profile?.designation || 'Team Member'} • {profile?.department || 'General'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-xl rounded-2xl p-3 border border-white/20 shadow-2xl"
              >
                <div className="text-center px-3 border-r border-white/20 min-w-[50px]">
                  <p className="text-2xl font-black text-white leading-none">{format(new Date(), 'dd')}</p>
                  <p className="text-[10px] text-white/70 uppercase tracking-widest mt-1">{format(new Date(), 'MMM')}</p>
                </div>
                <div className="text-center px-3 min-w-[50px]">
                  <p className="text-2xl font-black text-white leading-none uppercase">{format(new Date(), 'eee')}</p>
                  <p className="text-[10px] text-white/70 uppercase tracking-widest mt-1">Today</p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* --- Left Column: Clock In & Actions --- */}
          <div className="space-y-8">
            {/* Clock Status */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none"
            >
              <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Attendance Status
              </h3>

              {canClockIn && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (todayStatus.status === 'NOT_CHECKED_IN') handleClockIn();
                    else if (todayStatus.status === 'CHECKED_IN') handleClockOut();
                  }}
                  disabled={!!todayStatus.check_out_time || clockInMutation.isPending || clockOutMutation.isPending}
                  className={`w-full py-6 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl transition-all mb-6 ${todayStatus.status === 'NOT_CHECKED_IN'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/30 hover:shadow-emerald-500/40'
                    : todayStatus.status === 'CHECKED_IN'
                      ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-rose-500/30 hover:shadow-rose-500/40'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                >
                  {(clockInMutation.isPending || clockOutMutation.isPending) ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : todayStatus.status === 'NOT_CHECKED_IN' ? (
                    <> <LogIn className="w-6 h-6" /> CLOCK IN </>
                  ) : todayStatus.status === 'CHECKED_IN' ? (
                    <> <LogOut className="w-6 h-6" /> CLOCK OUT </>
                  ) : (
                    <> <CheckCircle className="w-6 h-6" /> COMPLETED </>
                  )}
                </motion.button>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Check In</p>
                  <p className="text-xl font-black text-slate-700 dark:text-white">
                    {formatTime12Hour(todayStatus.check_in_time) || '--:--'}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Check Out</p>
                  <p className="text-xl font-black text-slate-700 dark:text-white">
                    {formatTime12Hour(todayStatus.check_out_time) || '--:--'}
                  </p>
                </div>
                <div className="col-span-2 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Working Hours</p>
                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-300">
                      {workingTime ? `${workingTime.hours}h ${workingTime.mins}m` : '--:--'}
                    </p>
                  </div>
                  <Timer className="w-8 h-8 text-indigo-300" />
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <h3 className="text-lg font-black text-slate-800 dark:text-white px-2">Quick Actions</h3>
              <ActionButton
                icon={CalendarPlus} title="Apply Leave" subtitle="Request Time Off"
                onClick={() => navigate('/leave')}
                colorClass="bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-500"
                gradientClass="bg-gradient-to-br from-indigo-500 to-purple-600"
                delay={0.4}
              />
              <ActionButton
                icon={Calendar} title="My Attendance" subtitle="View History"
                onClick={() => navigate('/attendance')}
                colorClass="bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-500"
                gradientClass="bg-gradient-to-br from-emerald-500 to-teal-600"
                delay={0.5}
              />
            </motion.div>

            {/* Celebrations (Moved to Left Column) */}
            <ChartCard title="Celebrations" delay={0.6}>
              <div className="space-y-3">
                {[...(peopleEventsData?.birthdays || []), ...(peopleEventsData?.anniversaries || [])].slice(0, 3).map((evt: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${evt.type === 'BIRTHDAY' ? 'bg-pink-500' : 'bg-amber-500'}`}>
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
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title={t('dashboard.pendingLeaves')}
                value={leaveMetrics.pending}
                subtitle={t('dashboard.awaitingReview')}
                icon={Calendar}
                gradient="linear-gradient(135deg, #f59e0b, #d97706)"
                delay={0.1}
              />
              <StatCard
                title={t('dashboard.onLeaveToday')}
                value={leaveMetrics.upcoming_leaves || 0}
                subtitle={t('dashboard.thisMonth')}
                icon={TrendingUp}
                gradient="linear-gradient(135deg, #3b82f6, #2563eb)"
                delay={0.2}
              />
              <StatCard
                title={t('dashboard.presentToday')}
                value={`${attendanceRate}%`}
                subtitle={t('dashboard.attendanceRate')}
                icon={Activity}
                gradient="linear-gradient(135deg, #10b981, #059669)"
                delay={0.3}
              />
              <StatCard
                title={t('dashboard.approvedRequests')}
                value={leaveMetrics.approved}
                subtitle={t('dashboard.allTimeTotal')}
                icon={CheckCircle}
                gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
                delay={0.4}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                    <span className={`font-bold ${Number(actual) >= target ? 'text-emerald-500' : 'text-amber-500'}`}>
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



            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Task Distribution */}
              <ChartCard title={t('dashboard.leaveUtilization')} subtitle={t('dashboard.entitlementUsage')} delay={0.5}>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: t('dashboard.approvedRequests'), value: leaveMetrics.approved },
                          { name: t('dashboard.pendingLeaves'), value: leaveMetrics.pending },
                          { name: t('dashboard.rejected'), value: leaveMetrics.rejected },
                        ]}
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
                      <Tooltip />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value, entry: any) => (
                          <span className="text-slate-600 dark:text-slate-400 font-bold ml-2">
                            {value} <span className="text-slate-400 dark:text-slate-500 font-normal">({entry.payload.value})</span>
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
                      <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <Coffee className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">{leave.leave_type}</p>
                          <p className="text-xs font-semibold text-slate-400">
                            {format(new Date(leave.start_date), 'MMM dd')} - {format(new Date(leave.end_date), 'MMM dd')}
                          </p>
                        </div>
                        <span className="ml-auto px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-[10px] font-bold text-emerald-600">
                          {leave.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[150px] text-center opacity-60">
                    <Coffee className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-400">No upcoming leaves</p>
                  </div>
                )}
              </ChartCard>
            </div>
          </div>

        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default EmployeeDashboard;
