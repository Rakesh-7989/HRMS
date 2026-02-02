import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { dashboardService } from '@/services/dashboard.service';
import { attendanceService } from '@/services/attendance.service';
import { eventsService } from '@/services/events.service';
import { geoFencingService } from '@/services/geoFencing.service';
import { detectDeviceType } from '@/utils/deviceDetection';
import { formatTime12Hour } from '@/utils/timeFormat';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Clock, Calendar, TrendingUp, Coffee, CheckCircle, LogIn, LogOut,
  CalendarPlus, Loader2, Sparkles, Sun, Moon, Sunset, Timer,
  Award, Zap, ChevronRight, Calendar as CalendarIcon,
  User, MapPin, Gift, Cake
} from 'lucide-react';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
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

// Greeting based on time
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good Morning', icon: Sun, gradient: 'from-amber-400 to-orange-500' };
  if (hour < 17) return { text: 'Good Afternoon', icon: Sunset, gradient: 'from-orange-400 to-pink-500' };
  return { text: 'Good Evening', icon: Moon, gradient: 'from-indigo-500 to-purple-600' };
};

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  const canClockIn = user?.role === 'EMPLOYEE' || user?.role === 'MANAGER' || user?.role === 'HR';

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

  const profile = data?.profile;
  const leaveMetrics = data?.leaveMetrics || {
    total_applications: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    upcoming_leaves: 0,
  };
  const attendanceSummary = data?.attendanceSummary || {
    total_days: 0,
    late_days: 0,
    days_present: 0,
    avg_hours_worked: 0,
  };
  const todayStatus = data?.todayStatus || {
    check_in_time: null,
    check_out_time: null,
    is_late: null,
    status: 'NOT_CHECKED_IN',
  };
  const monthlyAttendance = data?.monthlyAttendance || [];
  const upcomingLeaves = data?.upcomingLeaves || [];

  const attendanceRate =
    attendanceSummary.total_days && attendanceSummary.days_present
      ? Math.round((Number(attendanceSummary.days_present) / 30) * 100)
      : 0;

  // Calculate working hours if checked in
  const getWorkingTime = () => {
    if (!todayStatus.check_in_time) return null;
    const checkIn = new Date(`2000-01-01T${todayStatus.check_in_time}`);
    const checkOut = todayStatus.check_out_time
      ? new Date(`2000-01-01T${todayStatus.check_out_time}`)
      : new Date();
    const hours = differenceInHours(checkOut, checkIn);
    const mins = differenceInMinutes(checkOut, checkIn) % 60;
    return { hours, mins };
  };

  const workingTime = getWorkingTime();

  // Chart data
  const attendanceChartData = monthlyAttendance
    .reduce((acc: any[], att: any) => {
      const date = format(new Date(att.date), 'MMM dd');
      const sortDate = new Date(att.date).getTime();
      let existing = acc.find((item) => item.date === date);
      if (!existing) {
        existing = { date, sortDate, Present: 0, Late: 0 };
        acc.push(existing);
      }
      if (att.type === 'ON_TIME' || att.type === 'PRESENT') {
        existing.Present += Number(att.count);
      } else if (att.type === 'LATE') {
        existing.Late += Number(att.count);
      }
      return acc;
    }, [])
    .sort((a: any, b: any) => a.sortDate - b.sortDate);

  if (isLoading) {
    return (
      <DashboardLayout title="My Dashboard">
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
    <DashboardLayout title="My Dashboard">
      <motion.div
        className="space-y-8"
        initial="initial"
        animate="animate"
      >
        {/* Welcome Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-3xl p-8 bg-gradient-to-r ${greeting.gradient}`}
        >
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
              <circle cx="350" cy="50" r="150" fill="white" fillOpacity="0.3" />
              <circle cx="50" cy="150" r="100" fill="white" fillOpacity="0.2" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-xl"
              >
                <User className="w-10 h-10" />
              </motion.div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <GreetingIcon className="w-5 h-5 text-white/80" />
                  <span className="text-white/80 text-sm font-medium">{greeting.text}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
                  {profile?.first_name} {profile?.last_name}
                </h1>
                <p className="text-white/70 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {profile?.designation} • {profile?.department}
                </p>
              </div>
            </div>

            {/* Date/Time Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 flex items-center gap-6"
            >
              <div className="text-center border-r border-white/20 pr-6">
                <p className="text-4xl font-bold text-white">{format(new Date(), 'dd')}</p>
                <p className="text-sm text-white/70">{format(new Date(), 'MMM yyyy')}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">{format(new Date(), 'EEEE')}</p>
                <p className="text-3xl font-bold text-white">{format(new Date(), 'hh:mm a')}</p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Clock In/Out Status & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Clock Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Today's Attendance
            </h3>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Check In */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-2xl p-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-3">
                  <LogIn className="w-5 h-5" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Check In</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatTime12Hour(todayStatus.check_in_time) || '--:--'}
                </p>
              </div>

              {/* Check Out */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 rounded-2xl p-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center mb-3">
                  <LogOut className="w-5 h-5" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Check Out</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatTime12Hour(todayStatus.check_out_time) || '--:--'}
                </p>
              </div>

              {/* Working Hours */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 rounded-2xl p-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center mb-3">
                  <Timer className="w-5 h-5" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Working Time</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {workingTime ? `${workingTime.hours}h ${workingTime.mins}m` : '--:--'}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <AnimatePresence>
              {todayStatus.is_late && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30"
                >
                  <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <span>⚠️</span> Late arrival recorded today
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Clock Button */}
            {canClockIn && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (todayStatus.status === 'NOT_CHECKED_IN') {
                    handleClockIn();
                  } else if (todayStatus.status === 'CHECKED_IN') {
                    handleClockOut();
                  }
                }}
                disabled={!!todayStatus.check_out_time || clockInMutation.isPending || clockOutMutation.isPending}
                className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${todayStatus.status === 'NOT_CHECKED_IN'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40'
                  : todayStatus.status === 'CHECKED_IN'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40'
                    : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  }`}
              >
                {(clockInMutation.isPending || clockOutMutation.isPending) ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : todayStatus.status === 'NOT_CHECKED_IN' ? (
                  <>
                    <LogIn className="w-6 h-6" />
                    Clock In Now
                  </>
                ) : todayStatus.status === 'CHECKED_IN' ? (
                  <>
                    <LogOut className="w-6 h-6" />
                    Clock Out
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    Day Completed
                  </>
                )}
              </motion.button>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Quick Actions
            </h3>

            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/leave')}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <CalendarPlus className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">Apply Leave</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Request time off</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/attendance')}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">View Attendance</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Check your history</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/profile')}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-500/10 dark:to-rose-500/10 border border-pink-100 dark:border-pink-500/20 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-pink-500/30">
                  <User className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">My Profile</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Update details</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-pink-600 transition-colors" />
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: 'Leave Balance',
              value: leaveMetrics.approved || 0,
              icon: Coffee,
              gradient: 'from-indigo-500 to-purple-600',
              shadow: 'shadow-indigo-500/30'
            },
            {
              title: 'Days Present',
              value: attendanceSummary.days_present || 0,
              icon: CheckCircle,
              gradient: 'from-emerald-500 to-teal-500',
              shadow: 'shadow-emerald-500/30'
            },
            {
              title: 'Upcoming Leaves',
              value: leaveMetrics.upcoming_leaves || 0,
              icon: Calendar,
              gradient: 'from-amber-500 to-orange-500',
              shadow: 'shadow-amber-500/30'
            },
            {
              title: 'Attendance Rate',
              value: `${attendanceRate}%`,
              icon: TrendingUp,
              gradient: 'from-pink-500 to-rose-500',
              shadow: 'shadow-pink-500/30'
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className={`relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br ${stat.gradient} shadow-xl ${stat.shadow}`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <stat.icon className="w-8 h-8 mb-3 opacity-80" />
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-white/80 text-sm">{stat.title}</p>
            </motion.div>
          ))}
        </div>

        {/* Attendance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Monthly Attendance</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your attendance trend this month</p>
            </div>
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              Last 30 Days
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceChartData}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="date"
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
                <Area
                  type="monotone"
                  dataKey="Present"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorPresent)"
                />
                <Area
                  type="monotone"
                  dataKey="Late"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorLate)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Upcoming Leaves & People Events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Leaves */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Coffee className="w-5 h-5 text-purple-600" />
              Upcoming Leaves
            </h3>

            {upcomingLeaves.length > 0 ? (
              <div className="space-y-3">
                {upcomingLeaves.slice(0, 4).map((leave: any, index: number) => (
                  <motion.div
                    key={leave.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 border border-purple-100 dark:border-purple-500/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{leave.leave_type}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                        {leave.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(leave.start_date), 'MMM dd')} - {format(new Date(leave.end_date), 'MMM dd')}
                    </p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <Coffee className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Upcoming Leaves</h4>
                <p className="text-gray-500 dark:text-gray-400">You have no scheduled leaves</p>
              </div>
            )}
          </motion.div>

          {/* People Events */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-600" />
              Celebrations
            </h3>

            <div className="space-y-4">
              {/* Birthdays */}
              {(peopleEventsData?.birthdays || []).slice(0, 2).map((person: any, index: number) => (
                <motion.div
                  key={person.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-xl bg-pink-50 dark:bg-pink-500/10"
                >
                  <div className="w-10 h-10 rounded-xl bg-pink-500 text-white flex items-center justify-center">
                    <Cake className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">{person.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">🎂 Birthday on {person.date}</p>
                  </div>
                </motion.div>
              ))}

              {/* Anniversaries */}
              {(peopleEventsData?.anniversaries || []).slice(0, 2).map((person: any, index: number) => (
                <motion.div
                  key={person.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">{person.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">🎉 Anniversary on {person.date}</p>
                  </div>
                </motion.div>
              ))}

              {(!peopleEventsData?.birthdays?.length && !peopleEventsData?.anniversaries?.length) && (
                <div className="py-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">No celebrations this week</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};
