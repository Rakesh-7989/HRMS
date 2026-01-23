import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { dashboardService } from '@/services/dashboard.service';
import { useAuth } from '@/contexts/AuthContext';
import { Users, UserCheck, Calendar, TrendingUp, CheckCircle, XCircle, CalendarCheck } from 'lucide-react';
import { format, subDays } from 'date-fns';
import PeopleEventsCard from '@/components/dashboard/PeopleEventsCard';
import CalendarCard from '@/components/dashboard/CalendarCard';
import { eventsService } from '@/services/events.service';
import { Clock } from 'lucide-react';
import { attendanceService } from '@/services/attendance.service';
import { leaveService } from '@/services/leave.service';





export const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'team'],
    queryFn: () => dashboardService.getTeamDashboard(),
  });
  const rangeTo = format(new Date(), 'yyyy-MM-dd');
  const rangeFrom = format(subDays(new Date(), 29), 'yyyy-MM-dd');

  const { data: attendanceSummary = [] } = useQuery({
    queryKey: ['dashboard', 'attendance-summary', rangeFrom, rangeTo],
    queryFn: () => attendanceService.getAttendanceSummary({ from_date: rangeFrom, to_date: rangeTo }),
    enabled: user?.role === 'HR' || user?.role === 'ADMIN', // Only for HR/Admin
  });

  // Use role-based analytics for managers
  const { data: teamAnalytics } = useQuery({
    queryKey: ['attendance', 'analytics', { from_date: rangeFrom, to_date: rangeTo }],
    queryFn: () => attendanceService.getAttendanceAnalytics({ from_date: rangeFrom, to_date: rangeTo }),
    enabled: user?.role === 'MANAGER',
  });

  const { data: leaveSummary } = useQuery({
    queryKey: ['dashboard', 'leave-summary', rangeFrom, rangeTo],
    queryFn: () => leaveService.getLeaveSummary({ from_date: rangeFrom, to_date: rangeTo }),
  });

  const summaryTotals = useMemo(() => {
    if (user?.role === 'MANAGER' && teamAnalytics?.teamSummary) {
      // For managers, use team analytics data
      return {
        present: teamAnalytics.teamSummary.total_present_days || 0,
        late: teamAnalytics.teamSummary.total_late_days || 0,
        leave: leaveSummary?.total_applications || 0,
        employees: teamAnalytics.teamSummary.total_team_members || 0
      };
    } else {
      // For HR/Admin, use organization summary
      const present = attendanceSummary.reduce((acc, row) => acc + (row.present_days || 0), 0);
      const late = attendanceSummary.reduce((acc, row) => acc + (row.late_days || 0), 0);
      const leave = attendanceSummary.reduce((acc, row) => acc + (row.leave_days || 0), 0);
      return { present, late, leave, employees: attendanceSummary.length };
    }
  }, [attendanceSummary, teamAnalytics, leaveSummary, user?.role]);


  const teamMetrics = data?.teamMetrics || {
    direct_reports: 0,
    active_employees: 0,
    inactive_employees: 0,
  };
  const performanceMetrics = useMemo(() => {
    if (user?.role === 'MANAGER' && teamAnalytics?.teamSummary) {
      // Calculate performance metrics from team analytics
      const totalDays = teamAnalytics.teamSummary.total_present_days +
        teamAnalytics.teamSummary.total_late_days +
        teamAnalytics.teamSummary.total_absent_days;
      const latePercentage = totalDays > 0 ?
        Math.round((teamAnalytics.teamSummary.total_late_days / totalDays) * 100) : 0;

      return {
        days_tracked: Math.max(1, Math.ceil(totalDays / (teamAnalytics.teamSummary.total_team_members || 1))),
        total_checkins: teamAnalytics.teamSummary.total_present_days + teamAnalytics.teamSummary.total_late_days,
        late_arrivals: teamAnalytics.teamSummary.total_late_days,
        late_percentage: latePercentage
      };
    } else {
      // Use data from team dashboard API
      return data?.teamPerformanceMetrics || {
        days_tracked: 0,
        total_checkins: 0,
        late_arrivals: 0,
        late_percentage: 0,
      };
    }
  }, [data?.teamPerformanceMetrics, teamAnalytics, user?.role]);


  const announcements = [
    { id: 1, title: 'Team Meeting at 4 PM', date: 'Today' },
    { id: 2, title: 'Performance Review Cycle Started', date: 'This Week' },
  ];

  const past7Days = [
    { day: 'Mon', date: 'Dec 16', status: 'Present' },
    { day: 'Tue', date: 'Dec 17', status: 'Late' },
    { day: 'Wed', date: 'Dec 18', status: 'Present' },
    { day: 'Thu', date: 'Dec 19', status: 'Absent' },
    { day: 'Fri', date: 'Dec 20', status: 'Present' },
    { day: 'Sat', date: 'Dec 21', status: 'Present' },
    { day: 'Sun', date: 'Dec 22', status: 'Present' },
  ];

  const { data: peopleEventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['peopleEvents', 'team'],
    queryFn: () => eventsService.getPeopleEvents('team'),
    staleTime: 1000 * 60 * 5,
  });

  return (
    <DashboardLayout
      title="Team Dashboard"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard/team' },
        { label: 'Overview' },
      ]}
    >
      <div className="space-y-6">
        {/* People Events (Birthdays / Anniversaries / New Joiners) + Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PeopleEventsCard
            className="h-full min-h-[200px] lg:col-span-2"
            birthdays={peopleEventsData?.birthdays || []}
            anniversaries={peopleEventsData?.anniversaries || []}
            newJoiners={peopleEventsData?.joiners || []}
            isLoading={eventsLoading}
          />

          <CalendarCard className="h-full min-h-[200px] lg:col-span-1" events={peopleEventsData} announcements={announcements} past7Days={past7Days} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Present Days (30d)"
            value={summaryTotals.present || 0}
            icon={Clock}
            iconColor="text-accent-green"
            isLoading={isLoading}
          />
          <StatCard
            title="Late Arrivals (30d)"
            value={summaryTotals.late || 0}
            icon={Clock}
            iconColor="text-yellow-500"
            isLoading={isLoading}
          />
          <StatCard
            title="Leave Requests (30d)"
            value={leaveSummary?.total_applications || 0}
            change={leaveSummary?.approved || 0}
            icon={CalendarCheck}
            iconColor="text-primary"
            isLoading={isLoading}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Direct Reports"
            value={teamMetrics.direct_reports || 0}
            icon={Users}
            iconColor="text-accent-blue"
            isLoading={isLoading}
          />
          <StatCard
            title="Present Today"
            value={data?.teamAttendanceToday?.length || 0}
            change={2.3}
            icon={UserCheck}
            iconColor="text-accent-green"
            isLoading={isLoading}
          />
          <StatCard
            title="On Leave"
            value={data?.teamLeaveRequests?.filter((l) => l.status === 'APPROVED').length || 0}
            icon={Calendar}
            iconColor="text-yellow-500"
            isLoading={isLoading}
          />
          <StatCard
            title="Late Arrival Rate"
            value={`${performanceMetrics.late_percentage || 0}%`}
            change={-5.1}
            icon={TrendingUp}
            iconColor="text-primary"
            isLoading={isLoading}
          />
        </div>

        {/* Team Members & Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="space-y-6"
            >
              <Card className="h-[380px]">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Team Members</h3>
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-16 bg-white/10 dark:bg-white/5 rounded animate-pulse" />
                    ))}
                  </div>
                ) : data?.directReports && data.directReports.length > 0 ? (
                  <div className="space-y-2">
                    {data.directReports.slice(0, 8).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-white/5 border border-light-border dark:border-dark-border"
                      >
                        <div className="flex items-center gap-3">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.5 }}
                            className="w-10 h-10 rounded-full bg-gradient-premium flex items-center justify-center font-bold text-white shadow-glow"
                          >
                            {member.first_name.charAt(0)}
                          </motion.div>
                          <div>
                            <p className="font-semibold text-sm">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-xs text-muted">{member.department}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.on_leave_today > 0 ? (
                            <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                              On Leave
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-600 dark:text-green-400">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted">No team members found</p>
                )}
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="space-y-6"
            >
              <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Team Performance Metrics</h3>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-12 bg-white/10 dark:bg-white/5 rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 dark:bg-white/5">
                      <span className="text-sm text-muted">Days Tracked (30d)</span>
                      <span className="font-bold text-lg">{performanceMetrics.days_tracked || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 dark:bg-white/5">
                      <span className="text-sm text-muted">Total Check-ins</span>
                      <span className="font-bold text-lg">{performanceMetrics.total_checkins || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 dark:bg-white/5">
                      <span className="text-sm text-muted">Late Arrivals</span>
                      <span className="font-bold text-lg text-yellow-400">
                        {performanceMetrics.late_arrivals || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 dark:bg-white/5">
                      <span className="text-sm text-muted">Late Percentage</span>
                      <span className="font-bold text-lg text-primary">
                        {performanceMetrics.late_percentage || 0}%
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>

          {/* ===================== CALENDAR + ANNOUNCEMENTS ===================== */}





        </div>


        {/* Pending Leave Requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Pending Leave Requests</h3>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-white/10 dark:bg-white/5 rounded animate-pulse" />
                ))}
              </div>
            ) : data?.pendingLeaveRequests && data.pendingLeaveRequests.length > 0 ? (
              <div className="space-y-3">
                {data.pendingLeaveRequests.slice(0, 5).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 dark:bg-white/5 border border-light-border dark:border-dark-border hover:border-primary-border transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold">
                          {request.first_name} {request.last_name}
                        </p>
                        <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                          {request.leave_type}
                        </span>
                      </div>
                      <p className="text-sm text-muted mb-1">{request.reason}</p>
                      <p className="text-xs text-muted">
                        {format(new Date(request.start_date), 'MMM dd')} -{' '}
                        {format(new Date(request.end_date), 'MMM dd')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="text-green-400 border-green-400">
                        <CheckCircle size={16} />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-400 border-red-400">
                        <XCircle size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted">No pending leave requests</p>
            )}
          </Card>
        </motion.div>

        {/* Team Attendance Today */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Card>
            <h3 className="text-lg font-semibold mb-4">Today&apos;s Team Attendance</h3>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-white/10 dark:bg-white/5 rounded animate-pulse" />
                ))}
              </div>
            ) : data?.teamAttendanceToday && data.teamAttendanceToday.length > 0 ? (
              <div className="space-y-2">
                {data.teamAttendanceToday.map((att, index) => (
                  <div
                    key={`${att.employee_id}-${index}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-white/5"
                  >
                    <div>
                      <p className="font-medium">
                        {att.first_name} {att.last_name}
                      </p>
                      <p className="text-sm text-muted">
                        {att.check_in_time
                          ? `Checked in at ${att.check_in_time}`
                          : 'Not checked in'}
                      </p>
                    </div>
                    {att.is_late && (
                      <span className="px-3 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                        Late
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted">No attendance data for today</p>
            )}
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

