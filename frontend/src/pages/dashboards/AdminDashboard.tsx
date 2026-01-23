import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card } from '@/components/ui/Card';
import { dashboardService } from '@/services/dashboard.service';
import { BarChart } from '@/components/charts/BarChart';
import { PieChart } from '@/components/charts/PieChart';
import { AreaChart } from '@/components/charts/AreaChart';
import { Users, UserCheck, Building2, Briefcase, Calendar, Megaphone, } from 'lucide-react';
import { format, subDays } from 'date-fns';
import PeopleEventsCard from '@/components/dashboard/PeopleEventsCard';
import CalendarCard from '@/components/dashboard/CalendarCard';
import { eventsService } from '@/services/events.service';
import { cn } from '@/utils/cn';
import React, { useMemo } from 'react';

export const AdminDashboard: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'organization'],
    queryFn: () => dashboardService.getOrganizationDashboard(),
  });

  const { data: peopleEventsData, isLoading: eventsLoading } = useQuery({
    
    queryKey: ['peopleEvents', 'organization'],
    queryFn: () => eventsService.getPeopleEvents('organization'),
    staleTime: 1000 * 60 * 5,
  });

  // useMemo must be called before any conditional returns to follow React's Rules of Hooks
  const past7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      days.push({
        day: format(date, 'EEE'),
        date: format(date, 'MMM d'),
        status: 'Present', // TODO: Fetch actual status from attendance API
      });
    }
    return days;
  }, []);

  if (error) {
    return (
      <DashboardLayout title="Organization Dashboard">
        <div className="text-center py-12">
          <p className="text-red-400">Failed to load dashboard data</p>
        </div>
      </DashboardLayout>
    );
  }

  const metrics = data?.orgMetrics || {
    total_employees: 0,
    active_users: 0,
    total_departments: 0,
    total_designations: 0,
  };

  const roleDist = data?.roleDistribution || [];
  const deptAnalytics = data?.departmentAnalytics || [];
  const attendanceData = data?.attendanceMetrics || [];
  const leaveStats = data?.leaveStatistics || [];

  /* ---------- STATIC DATA ---------- */

  const announcements = [
    { id: 1, title: 'Company Townhall Tomorrow', date: 'Today' },
    { id: 2, title: 'New Leave Policy Released', date: 'Dec 27' },
  ];

  return (
    <DashboardLayout
      title="Organization Dashboard"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard/organization' },
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

          <CalendarCard className="h-full min-h-[200px] lg:col-span-1" events={peopleEventsData} announcements={announcements} />
        </div>

        {/* ===================== STATS ===================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Employees" value={metrics.total_employees} icon={Users} isLoading={isLoading} />
          <StatCard title="Active Employees" value={metrics.active_users} icon={UserCheck} isLoading={isLoading} />
          <StatCard title="Departments" value={metrics.total_departments} icon={Building2} isLoading={isLoading} />
          <StatCard title="Designations" value={metrics.total_designations} icon={Briefcase} isLoading={isLoading} />
        </div> 

        {/* ===================== CHARTS ===================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold mb-4">Role Distribution</h3>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">Loading...</div>
            ) : (
              <PieChart
                data={roleDist.map((r) => ({ name: r.role, value: r.count }))}
                height={300}
              />
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-4">Department Headcount</h3>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">Loading...</div>
            ) : (
              <BarChart
                data={deptAnalytics.slice(0, 10)}
                dataKey="employee_count"
                xKey="name"
                height={300}
              />
            )}
          </Card>
        </div>

        {/* ===================== ATTENDANCE & LEAVE ===================== */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold mb-4">Attendance Trend</h3>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">Loading...</div>
            ) : (
              <AreaChart
                data={attendanceData.map((d) => ({
                  date: format(new Date(d.date), 'MMM dd'),
                  'Total Check-ins': d.total_checkins,
                  'Late Arrivals': d.late_arrivals,
                }))}
                dataKeys={['Total Check-ins', 'Late Arrivals']}
                xKey="date"
                height={300}
              />
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-4">Leave Statistics</h3>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">Loading...</div>
            ) : (
              <BarChart
                data={leaveStats}
                dataKey="total_requests"
                xKey="leave_type"
                height={300}
              />
            )}
          </Card>
        </div>

        {/* Top Departments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Top Departments by Headcount</h3>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-white/10 dark:bg-white/5 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {data?.topDepartments?.map((dept, idx) => (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 dark:bg-white/5 border border-light-border dark:border-dark-border"
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                        className="w-10 h-10 rounded-full bg-gradient-premium flex items-center justify-center font-bold text-white shadow-glow"
                      >
                        #{idx + 1}
                      </motion.div>
                      <div>
                        <p className="font-semibold">{dept.name}</p>
                        <p className="text-sm text-muted">Department</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{dept.headcount}</p>
                      <p className="text-xs text-muted">employees</p>
                    </div>
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
