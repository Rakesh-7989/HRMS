import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { dashboardService } from '@/services/dashboard.service';
import { BarChart } from '@/components/charts/BarChart';
import { PieChart } from '@/components/charts/PieChart';
import { Calendar, Clock, UserX, CheckCircle, XCircle, TrendingUp, CalendarCheck } from 'lucide-react';
import { format, subDays } from 'date-fns';
import PeopleEventsCard from '@/components/dashboard/PeopleEventsCard';
import CalendarCard from '@/components/dashboard/CalendarCard';
import { eventsService } from '@/services/events.service';
import { leaveService } from '@/services/leave.service';

export const HRDashboard: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'hr'],
    queryFn: () => dashboardService.getHRDashboard(),
  });

  const rangeTo = format(new Date(), 'yyyy-MM-dd');
  const rangeFrom = format(subDays(new Date(), 29), 'yyyy-MM-dd');



  const { data: leaveSummary } = useQuery({
    queryKey: ['dashboard', 'leave-summary', rangeFrom, rangeTo],
    queryFn: () => leaveService.getLeaveSummary({ from_date: rangeFrom, to_date: rangeTo }),
  });





  const leaveMetrics = data?.leaveMetrics || {
    total_requests: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    employees_with_requests: 0,
  };
  const pendingRequests = data?.pendingRequests || [];
  const leaveTypeDist = data?.leaveTypeDistribution || [];
  const attendanceOverview = data?.attendanceOverview || {
    date: '',
    total_checkins: 0,
    unique_employees: 0,
    late_count: 0,
    late_percentage: 0,
  };

  /* ===== People Events Data ===== */

  const { data: peopleEventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['peopleEvents', 'hr'],
    queryFn: () => eventsService.getPeopleEvents('hr'),
    staleTime: 1000 * 60 * 5,
  });

  return (
    <DashboardLayout
      title="HR Dashboard"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard/hr' },
        { label: 'Overview' },
      ]}
    >
      <div className="space-y-6">

        {/* People Events + Calendar */}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Present Days (30d)"
            value={0}
            icon={Clock}
            iconColor="text-accent-green"
            isLoading={isLoading}
          />
          <StatCard
            title="Late Arrivals (30d)"
            value={0}
            icon={Clock}
            iconColor="text-yellow-500"
            isLoading={isLoading}
          />
          <StatCard
            title="Leave Requests (30d)"
            value={0}
            change={leaveSummary?.approved || 0}
            icon={CalendarCheck}
            iconColor="text-primary"
            isLoading={isLoading}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Pending Leaves"
            value={leaveMetrics.pending || 0}
            icon={Calendar}
            iconColor="text-yellow-500"
            isLoading={isLoading}
          />
          <StatCard
            title="On Leave Today"
            value={data?.employeesOnLeaveToday?.length || 0}
            icon={UserX}
            iconColor="text-accent-blue"
            isLoading={isLoading}
          />
          <StatCard
            title="Attendance Today"
            value={attendanceOverview.total_checkins || 0}
            change={4.2}
            icon={Clock}
            iconColor="text-accent-green"
            isLoading={isLoading}
          />
          <StatCard
            title="Approved Requests"
            value={leaveMetrics.approved || 0}
            change={leaveMetrics.total_requests ? Math.round((leaveMetrics.approved / leaveMetrics.total_requests) * 100) : 0}
            icon={TrendingUp}
            iconColor="text-accent-purple"
            isLoading={isLoading}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Leave Type Distribution</h3>
              {isLoading ? (
                <div className="h-[420px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : leaveTypeDist.length > 0 ? (
                <PieChart
                  data={leaveTypeDist.map((lt) => ({ name: lt.leave_type, value: lt.count }))}
                  height={420}
                />
              ) : (
                <div className="h-[420px] flex items-center justify-center text-muted">
                  No data available
                </div>
              )}
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Leave Requests Overview</h3>
              {isLoading ? (
                <div className="h-[420px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <BarChart
                  data={[
                    { status: 'Approved', count: leaveMetrics.approved || 0 },
                    { status: 'Pending', count: leaveMetrics.pending || 0 },
                    { status: 'Rejected', count: leaveMetrics.rejected || 0 },
                  ]}
                  dataKey="count"
                  xKey="status"
                  name="Requests"
                  height={420}
                />
              )}
            </Card>
          </motion.div>
        </div>


        {/* Attendance Overview Card */}
        {attendanceOverview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Employee&apos;s Attendance Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.div
                  whileHover={{ scale: 1.05, y: -4 }}
                  className="p-4 rounded-lg bg-accent-green/10 border border-accent-green/20"
                >
                  <p className="text-sm text-gray-600 dark:text-muted mb-1">Total Check-ins</p>
                  <p className="text-2xl font-bold text-accent-green">{attendanceOverview.total_checkins || 0}</p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05, y: -4 }}
                  className="p-4 rounded-lg bg-accent-blue/10 border border-accent-blue/20"
                >
                  <p className="text-sm text-gray-600 dark:text-muted mb-1">Unique Employees</p>
                  <p className="text-2xl font-bold text-accent-blue">{attendanceOverview.unique_employees || 0}</p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05, y: -4 }}
                  className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
                >
                  <p className="text-sm text-gray-600 dark:text-muted mb-1">Late Arrivals</p>
                  <p className="text-2xl font-bold text-yellow-500">{attendanceOverview.late_count || 0}</p>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05, y: -4 }}
                  className="p-4 rounded-lg bg-accent-purple/10 border border-accent-purple/20"
                >
                  <p className="text-sm text-gray-600 dark:text-muted mb-1">Late %</p>
                  <p className="text-2xl font-bold text-accent-purple">{attendanceOverview.late_percentage || 0}%</p>
                </motion.div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Pending Requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
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
            ) : pendingRequests.length > 0 ? (
              <div className="space-y-3">
                {pendingRequests.slice(0, 5).map((request) => (
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
                      <p className="text-sm text-muted">{request.department}</p>
                      <p className="text-xs text-muted mt-1">
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

        {/* Employees on Leave Today */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Card>
            <h3 className="text-lg font-semibold mb-4">Employees on Leave Today</h3>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-white/10 dark:bg-white/5 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {data?.employeesOnLeaveToday?.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-white/5"
                  >
                    <div>
                      <p className="font-medium">
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-sm text-muted">{emp.department}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400">
                      {emp.leave_type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};
