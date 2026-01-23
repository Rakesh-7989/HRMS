import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { dashboardService } from '@/services/dashboard.service';
import { BarChart } from '@/components/charts/BarChart';
import { PieChart } from '@/components/charts/PieChart';
import { AreaChart } from '@/components/charts/AreaChart';
import { LineChart } from '@/components/charts/LineChart';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Download,
  FileText, 
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';

export const ReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [reportType, setReportType] = useState<'attendance' | 'leave' | 'employee' | 'overview'>('overview');

  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ['dashboard', 'organization'],
    queryFn: () => dashboardService.getOrganizationDashboard(),
    enabled: reportType === 'overview' || reportType === 'employee' || reportType === 'attendance',
  });

  const { data: hrData, isLoading: hrLoading } = useQuery({
    queryKey: ['dashboard', 'hr'],
    queryFn: () => dashboardService.getHRDashboard(),
    enabled: reportType === 'leave' || reportType === 'overview',
  });

  const isLoading = orgLoading || hrLoading;

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case '7d':
        return 'Last 7 days';
      case '30d':
        return 'Last 30 days';
      case '90d':
        return 'Last 90 days';
      default:
        return 'Custom range';
    }
  };

  const exportReport = () => {
    // In a real implementation, this would generate and download a PDF/Excel report
    alert('Export functionality will be implemented with backend API');
  };

  return (
    <DashboardLayout
      title="Reports & Analytics"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard/organization' },
        { label: 'Reports' },
      ]}
    >
      <div className="space-y-6">
        {/* Header with Filters */}
        <Card>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                Reports & Analytics
              </h2>
              <p className="text-sm text-gray-600 dark:text-muted">
                Comprehensive insights into your organization&apos;s HR data
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {(['overview', 'attendance', 'leave', 'employee'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setReportType(type)}
                    className={cn(
                      'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                      reportType === type
                        ? 'bg-white dark:bg-gray-900 text-primary shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="custom">Custom</option>
                </select>
                <Button variant="outline" size="sm" onClick={exportReport}>
                  <Download className="mr-2" size={16} />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Overview Report */}
        {reportType === 'overview' && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-muted mb-1">Total Employees</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {orgData?.orgMetrics.total_employees || 0}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      <TrendingUp size={12} className="inline mr-1" />
                      +{orgData?.orgMetrics.active_users || 0} active
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary-10">
                    <Users className="text-primary" size={24} />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-muted mb-1">Departments</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {orgData?.orgMetrics.total_departments || 0}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-muted mt-1">
                      {orgData?.orgMetrics.total_designations || 0} designations
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent-blue/10">
                    <FileText className="text-accent-blue" size={24} />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-muted mb-1">Leave Requests</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {hrData?.leaveMetrics.total_requests || 0}
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      {hrData?.leaveMetrics.pending || 0} pending
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-yellow-500/10">
                    <Calendar className="text-yellow-500" size={24} />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-muted mb-1">Attendance Rate</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {orgData?.attendanceMetrics.length
                        ? Math.round(
                            (orgData.attendanceMetrics.reduce(
                              (acc, m) => acc + m.total_checkins,
                              0
                            ) /
                              (orgData.attendanceMetrics.length * (orgData.orgMetrics.total_employees || 1))) *
                              100
                          )
                        : 0}
                      %
                    </p>
                    <p className="text-xs text-gray-600 dark:text-muted mt-1">
                      {getDateRangeLabel()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent-green/10">
                    <Clock className="text-accent-green" size={24} />
                  </div>
                </div>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Role Distribution
                </h3>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <PieChart
                    data={orgData?.roleDistribution.map((r) => ({ name: r.role, value: r.count })) || []}
                    height={300}
                  />
                )}
              </Card>

              <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Department Headcount
                </h3>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <BarChart
                    data={orgData?.departmentAnalytics.slice(0, 10) || []}
                    dataKey="employee_count"
                    xKey="name"
                    name="Employees"
                    color="#6B46C1"
                    height={300}
                  />
                )}
              </Card>
            </div>

            {/* Attendance & Leave Trends */}
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Attendance Trend Analysis ({getDateRangeLabel()})
                </h3>
                {isLoading ? (
                  <div className="h-[350px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <AreaChart
                    data={orgData?.attendanceMetrics.map((d) => ({
                      date: format(new Date(d.date), 'MMM dd'),
                      'Total Check-ins': d.total_checkins || 0,
                      'Late Arrivals': d.late_arrivals || 0,
                      'Unique Employees': d.unique_employees || 0,
                    })) || []}
                    dataKeys={['Total Check-ins', 'Late Arrivals', 'Unique Employees']}
                    xKey="date"
                    height={350}
                    colors={['#10B981', '#F59E0B', '#3B82F6']}
                  />
                )}
              </Card>

              <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Leave Type Distribution
                </h3>
                {isLoading ? (
                  <div className="h-[350px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <PieChart
                    data={orgData?.leaveStatistics?.map((stat, index) => ({
                      name: stat.leave_type,
                      value: stat.total_requests || 0,
                      color: ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'][index % 5]
                    })) || []}
                    height={350}

                  />
                )}
              </Card>
            </div>

            {/* Performance Metrics Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Department Performance
                </h3>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <BarChart
                    data={orgData?.departmentAnalytics?.slice(0, 8).map((dept, index) => ({
                      ...dept,
                      fill: ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'][index % 8]
                    })) || []}
                    dataKey="employee_count"
                    xKey="name"
                    name="Employees"
                    height={300}
                    colors={['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6']}
                  />
                )}
              </Card>

              <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Monthly Trends
                </h3>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <LineChart
                    data={orgData?.attendanceMetrics?.slice(-14).map((d) => ({
                      date: format(new Date(d.date), 'MMM dd'),
                      'Attendance Rate': Math.round(((d.total_checkins || 0) / Math.max(d.unique_employees || 1, 1)) * 100),
                      'Punctuality Rate': Math.round((((d.total_checkins || 0) - (d.late_arrivals || 0)) / Math.max(d.total_checkins || 1, 1)) * 100),
                    })) || []}
                    dataKeys={['Attendance Rate', 'Punctuality Rate']}
                    xKey="date"
                    height={300}
                    colors={['#10B981', '#3B82F6']}
                  />
                )}
              </Card>
            </div>
          </>
        )}

        {/* Attendance Report */}
        {reportType === 'attendance' && (
          <>
            <Card>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Attendance Overview ({getDateRangeLabel()})
              </h3>
              {isLoading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <AreaChart
                  data={orgData?.attendanceMetrics.map((d) => ({
                    date: format(new Date(d.date), 'MMM dd'),
                    'Total Check-ins': d.total_checkins,
                    'Unique Employees': d.unique_employees,
                    'Late Arrivals': d.late_arrivals,
                  })) || []}
                  dataKeys={['Total Check-ins', 'Unique Employees', 'Late Arrivals']}
                  xKey="date"
                  height={400}
                />
              )}
            </Card>

            <Card>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Attendance Summary Table
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Total Check-ins</TableHead>
                    <TableHead>Unique Employees</TableHead>
                    <TableHead>Late Arrivals</TableHead>
                    <TableHead>Late %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgData?.attendanceMetrics.slice(0, 20).map((att, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{format(new Date(att.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{att.total_checkins}</TableCell>
                      <TableCell>{att.unique_employees}</TableCell>
                      <TableCell>
                        <span className="text-yellow-600 dark:text-yellow-400">{att.late_arrivals}</span>
                      </TableCell>
                      <TableCell>
                        {att.total_checkins > 0
                          ? Math.round((att.late_arrivals / att.total_checkins) * 100)
                          : 0}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}

        {/* Leave Report */}
        {reportType === 'leave' && (
          <>
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Leave Type Distribution
                </h3>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <PieChart
                    data={hrData?.leaveTypeDistribution.map((lt) => ({
                      name: lt.leave_type,
                      value: lt.count,
                    })) || []}
                    height={300}
                  />
                )}
              </Card>

              <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Leave Requests Status
                </h3>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <BarChart
                    data={[
                      { status: 'Approved', count: hrData?.leaveMetrics.approved || 0 },
                      { status: 'Pending', count: hrData?.leaveMetrics.pending || 0 },
                      { status: 'Rejected', count: hrData?.leaveMetrics.rejected || 0 },
                    ]}
                    dataKey="count"
                    xKey="status"
                    name="Requests"
                    height={300}
                  />
                )}
              </Card>
            </div>

            <Card>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Leave Summary Table
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Total Requests</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Rejected</TableHead>
                    <TableHead>Approval Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgData?.leaveStatistics.map((leave, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{leave.leave_type}</TableCell>
                      <TableCell>{leave.total_requests}</TableCell>
                      <TableCell>
                        <span className="text-green-600 dark:text-green-400">{leave.approved}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-yellow-600 dark:text-yellow-400">{leave.pending}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-600 dark:text-red-400">{leave.rejected}</span>
                      </TableCell>
                      <TableCell>
                        {leave.total_requests > 0
                          ? Math.round((leave.approved / leave.total_requests) * 100)
                          : 0}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}

        {/* Employee Report */}
        {reportType === 'employee' && (
          <>
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Employee Status Distribution
                </h3>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <PieChart
                    data={[
                      {
                        name: 'Active',
                        value: orgData?.orgMetrics.active_users || 0,
                      },
                      {
                        name: 'Inactive',
                        value: orgData?.orgMetrics.inactive_users || 0,
                      },
                    ]}
                    height={300}
                  />
                )}
              </Card>

              <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Top Departments by Headcount
                </h3>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <BarChart
                    data={orgData?.topDepartments || []}
                    dataKey="headcount"
                    xKey="name"
                    name="Employees"
                    color="#2563EB"
                    height={300}
                  />
                )}
              </Card>
            </div>

            <Card>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Department Analytics
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Total Employees</TableHead>
                    <TableHead>Managers</TableHead>
                    <TableHead>Employee Ratio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgData?.departmentAnalytics.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>{dept.employee_count}</TableCell>
                      <TableCell>{dept.manager_count}</TableCell>
                      <TableCell>
                        {dept.manager_count > 0
                          ? Math.round(dept.employee_count / dept.manager_count)
                          : dept.employee_count}
                        :1
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};
