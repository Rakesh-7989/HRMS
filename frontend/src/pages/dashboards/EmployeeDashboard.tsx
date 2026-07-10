import React from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { dashboardService } from '@/services/dashboard.service';
import { attendanceService } from '@/services/attendance.service';
import { AreaChart } from '@/components/charts/AreaChart';
import { Clock, Calendar, TrendingUp, Coffee, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import PeopleEventsCard from '@/components/dashboard/PeopleEventsCard';
import CalendarCard from '@/components/dashboard/CalendarCard';
import { eventsService } from '@/services/events.service';
import { cn } from '@/utils/cn';
import { useAuth } from '@/contexts/AuthContext';
import { SkeletonChart } from '@/components/ui/Skeleton';
import { useNavigate } from 'react-router-dom';


export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // EMPLOYEE, MANAGER, and HR can clock in/out and apply for leave
  const canClockIn = user?.role === 'EMPLOYEE' || user?.role === 'MANAGER' || user?.role === 'HR';
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'personal'],
    queryFn: () => dashboardService.getPersonalDashboard(),
  });

  const { data: peopleEventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['peopleEvents', 'personal'],
    queryFn: () => eventsService.getPeopleEvents('personal'),
    staleTime: 1000 * 60 * 5,
  });

  const clockInMutation = useMutation({
    mutationFn: () => attendanceService.clockIn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'personal'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: () => attendanceService.clockOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'personal'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });

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
      ? Math.round((attendanceSummary.days_present / 30) * 100)
      : 0;

  return (
    <DashboardLayout
      title="My Dashboard"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard/personal' },
        { label: 'Overview' },
      ]}
    >
      <div className="space-y-6">
        {/* People Events (wider) + Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PeopleEventsCard
            className="h-full min-h-[200px] lg:col-span-2"
            birthdays={peopleEventsData?.birthdays || []}
            anniversaries={peopleEventsData?.anniversaries || []}
            newJoiners={peopleEventsData?.joiners || []}
            isLoading={eventsLoading}
          />
          <CalendarCard className="h-full min-h-[200px] lg:col-span-1" events={peopleEventsData} />
        </div>

        {/* Welcome Card */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-gradient-to-r from-primary/10 via-accent-blue/10 to-accent-green/10 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">
                    Welcome back, {profile.first_name}! 👋
                  </h2>
                  <p className="text-muted">
                    {profile.designation} · {profile.department}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted">Today&apos;s Status</p>
                  <p
                    className={cn(
                      'font-semibold',
                      todayStatus.status === 'CHECKED_IN' ? 'text-blue-400' :
                        todayStatus.status === 'NOT_CHECKED_IN' ? 'text-gray-400' :
                          todayStatus.status === 'PRESENT' || todayStatus.status === 'COMPLETED' ? 'text-green-400' :
                            todayStatus.status === 'INCOMPLETE_HOURS' ? 'text-yellow-400' :
                              'text-green-400'
                    )}
                  >
                    {todayStatus.status === 'CHECKED_IN' ? 'Checked In' :
                      todayStatus.status === 'NOT_CHECKED_IN' ? 'Not Checked In' :
                        todayStatus.status.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )
        }

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Leave Balance"
            value={leaveMetrics.approved || 0}
            icon={Calendar}
            iconColor="text-accent-blue"
            isLoading={isLoading}
          />
          <StatCard
            title="Days Present (30d)"
            value={0}
            change={3.2}
            icon={TrendingUp}
            iconColor="text-accent-green"
            isLoading={isLoading}
          />
          <StatCard
            title="Upcoming Leaves"
            value={leaveMetrics.upcoming_leaves || 0}
            icon={Coffee}
            iconColor="text-accent-purple"
            isLoading={isLoading}
          />
          <StatCard
            title="Attendance Rate"
            value={`${attendanceRate}%`}
            change={2.1}
            icon={Clock}
            iconColor="text-primary"
            isLoading={isLoading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >

            <Card>
              {canClockIn && (
                <>
                  <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <Button
                      variant={todayStatus.status === 'NOT_CHECKED_IN' ? 'primary' : 'outline'}
                      className="h-24 flex flex-col items-center justify-center"
                      onClick={() => {
                        if (todayStatus.status === 'NOT_CHECKED_IN') {
                          clockInMutation.mutate();
                        } else if (todayStatus.status === 'CHECKED_IN') {
                          clockOutMutation.mutate();
                        }
                      }}
                      isLoading={clockInMutation.isPending || clockOutMutation.isPending}
                      disabled={!!todayStatus.check_out_time}
                    >
                      <Clock className="mb-2" size={24} />
                      {todayStatus.status === 'NOT_CHECKED_IN'
                        ? 'Clock In'
                        : todayStatus.status === 'CHECKED_IN'
                          ? 'Clock Out'
                          : 'Completed'}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col items-center justify-center"
                      onClick={() => navigate('/leave')}
                    >
                      <Calendar className="mb-2" size={24} />
                      Request Leave
                    </Button>
                  </div>
                </>
              )}

              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Monthly Attendance</h3>
              {isLoading ? (
                <SkeletonChart />
              ) : monthlyAttendance && monthlyAttendance.length > 0 ? (
                <AreaChart
                  data={monthlyAttendance
                    .reduce((acc: any[], att) => {
                      const date = format(new Date(att.date), 'MMM dd');
                      const sortDate = new Date(att.date).getTime();
                      let existing = acc.find((item) => item.date === date);
                      if (!existing) {
                        existing = { date, sortDate, Present: 0, Late: 0 };
                        acc.push(existing);
                      }
                      if (att.type === 'ON_TIME' || att.type === 'PRESENT') {
                        existing.Present += att.count;
                      } else if (att.type === 'LATE') {
                        existing.Late += att.count;
                      }
                      return acc;
                    }, [])
                    .sort((a, b) => a.sortDate - b.sortDate)}
                  dataKeys={['Present', 'Late']}
                  xKey="date"
                  height={250}
                />
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-600 dark:text-muted">
                  No attendance data available
                </div>
              )}
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="grid grid-cols-2 gap-2"
          >

            <Card>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Employee&apos;s Status</h3>
              {isLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-20 bg-white/10 rounded" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-white/5">
                    <span className="text-sm text-muted">Check In</span>
                    <span className="font-medium">
                      {todayStatus.check_in_time || '--:--'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-white/5">
                    <span className="text-sm text-muted">Check Out</span>
                    <span className="font-medium">
                      {todayStatus.check_out_time || '--:--'}
                    </span>
                  </div>
                  {todayStatus.is_late && (
                    <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        ⚠️ Late arrival today
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Upcoming Leaves</h3>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-white/10 dark:bg-white/5 rounded animate-pulse" />
                  ))}
                </div>
              ) : upcomingLeaves.length > 0 ? (
                <div className="space-y-2">
                  {upcomingLeaves.slice(0, 5).map((leave) => (
                    <div
                      key={leave.id}
                      className="p-3 rounded-lg bg-white/5 dark:bg-white/5 border border-light-border dark:border-dark-border"
                    >
                      <p className="font-medium text-sm">{leave.leave_type}</p>
                      <p className="text-xs text-muted">
                        {format(new Date(leave.start_date), 'MMM dd')} -{' '}
                        {format(new Date(leave.end_date), 'MMM dd')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-muted text-sm">No upcoming leaves</p>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Leave History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recent Leave History</h3>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-white/10 dark:bg-white/5 rounded animate-pulse" />
                ))}
              </div>
            ) : data?.leaveHistory && data.leaveHistory.length > 0 ? (
              <div className="space-y-2">
                {data.leaveHistory.slice(0, 5).map((leave) => (
                  <div
                    key={leave.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 dark:bg-white/5 border border-light-border dark:border-dark-border"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{leave.leave_type}</p>
                        <span
                          className={cn(
                            'px-2 py-1 rounded text-xs',
                            leave.status === 'APPROVED'
                              ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                              : leave.status === 'PENDING'
                                ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                : 'bg-red-500/20 text-red-600 dark:text-red-400'
                          )}
                        >
                          {leave.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted">
                        {format(new Date(leave.start_date), 'MMM dd')} -{' '}
                        {format(new Date(leave.end_date), 'MMM dd')}
                      </p>
                    </div>
                    <CheckCircle
                      size={20}
                      className={leave.status === 'APPROVED' ? 'text-green-400' : 'text-muted'}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted">No leave history</p>
            )}
          </Card>
        </motion.div>
      </div >
    </DashboardLayout >
  );
};


