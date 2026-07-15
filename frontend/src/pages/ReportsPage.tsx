import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
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
import { useTranslation } from 'react-i18next';

export const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [reportType, setReportType] = useState<'attendance' | 'leave' | 'employee' | 'overview'>('overview');

  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const calculateDateRange = () => {
    const end = new Date();
    const start = new Date();

    if (dateRange === 'custom') {
      return {
        startDate: customStart || format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
        endDate: customEnd || format(new Date(), 'yyyy-MM-dd')
      };
    }

    switch (dateRange) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }

    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    };
  };

  const { startDate, endDate } = calculateDateRange();

  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ['dashboard', 'organization', dateRange, customStart, customEnd],
    queryFn: () => dashboardService.getOrganizationDashboard({ startDate, endDate }),
    enabled: reportType === 'overview' || reportType === 'employee' || reportType === 'attendance',
  });

  const { data: hrData, isLoading: hrLoading } = useQuery({
    queryKey: ['dashboard', 'hr', dateRange, customStart, customEnd],
    queryFn: () => dashboardService.getHRDashboard({ startDate, endDate }),
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

  // CSV Export Helper Function
  const downloadCSV = (data: Record<string, unknown>[], filename: string, headers: string[]) => {
    if (!data || data.length === 0) {
      alert('No data available to export');
      return;
    }

    const csvRows: string[] = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const key = header.toLowerCase().replace(/\s+/g, '_');
        let value = row[key] ?? row[header] ?? '';

        // Handle different key formats
        if (value === '' || value === undefined) {
          // Try camelCase
          const camelKey = header.replace(/\s+(.)/g, (_, c) => c.toUpperCase()).replace(/\s/g, '');
          value = row[camelKey.charAt(0).toLowerCase() + camelKey.slice(1)] ?? '';
        }

        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const exportReport = () => {
    const dateLabel = `${startDate}_to_${endDate}`;

    switch (reportType) {
      case 'overview': {
        // Export organization overview summary
        const summaryData = [{
          'Total Employees': orgData?.orgMetrics.total_employees || 0,
          'Active Employees': orgData?.orgMetrics.active_employees || 0,
          'Total Departments': orgData?.orgMetrics.total_departments || 0,
          'Total Designations': orgData?.orgMetrics.total_designations || 0,
          'Leave Requests': hrData?.leaveMetrics.total_requests || 0,
          'Pending Leaves': hrData?.leaveMetrics.pending || 0,
          'Approved Leaves': hrData?.leaveMetrics.approved || 0,
          'Rejected Leaves': hrData?.leaveMetrics.rejected || 0,
          'Report Period': `${startDate} to ${endDate}`
        }];
        downloadCSV(summaryData, `overview_report_${dateLabel}`, Object.keys(summaryData[0]));

        // Also export department data
        if (orgData?.departmentAnalytics?.length) {
          const deptData = orgData.departmentAnalytics.map(d => ({
            'Department': d.name,
            'Employee Count': d.employee_count
          }));
          downloadCSV(deptData, `department_analytics_${dateLabel}`, ['Department', 'Employee Count']);
        }
        break;
      }

      case 'attendance': {
        if (!orgData?.attendanceMetrics?.length) {
          alert('No attendance data available to export');
          return;
        }
        const attendanceData = orgData.attendanceMetrics.map(d => ({
          'Date': format(new Date(d.date), 'yyyy-MM-dd'),
          'Total Check-ins': d.total_checkins,
          'Late Arrivals': d.late_arrivals,
          'Unique Employees': d.unique_employees
        }));
        downloadCSV(attendanceData, `attendance_report_${dateLabel}`, ['Date', 'Total Check-ins', 'Late Arrivals', 'Unique Employees']);
        break;
      }

      case 'leave': {
        // Export leave statistics
        if (orgData?.leaveStatistics?.length) {
          const leaveData = orgData.leaveStatistics.map(stat => ({
            'Leave Type': stat.leave_type,
            'Total Requests': stat.total_requests,
            'Approved': stat.approved || 0,
            'Pending': stat.pending || 0,
            'Rejected': stat.rejected || 0
          }));
          downloadCSV(leaveData, `leave_statistics_${dateLabel}`, ['Leave Type', 'Total Requests', 'Approved', 'Pending', 'Rejected']);
        } else if (hrData?.leaveMetrics) {
          // Fallback to basic metrics if detailed stats not available
          const leaveData = [{
            'Metric': 'Total Requests',
            'Value': hrData.leaveMetrics.total_requests || 0
          }, {
            'Metric': 'Approved',
            'Value': hrData.leaveMetrics.approved || 0
          }, {
            'Metric': 'Pending',
            'Value': hrData.leaveMetrics.pending || 0
          }, {
            'Metric': 'Rejected',
            'Value': hrData.leaveMetrics.rejected || 0
          }];
          downloadCSV(leaveData, `leave_metrics_${dateLabel}`, ['Metric', 'Value']);
        } else {
          alert('No leave data available to export');
        }
        break;
      }

      case 'employee': {
        // Export role distribution
        if (orgData?.roleDistribution?.length) {
          const roleData = orgData.roleDistribution.map(r => ({
            'Role': r.role,
            'Count': r.count
          }));
          downloadCSV(roleData, `role_distribution_${dateLabel}`, ['Role', 'Count']);
        }

        // Export department analytics
        if (orgData?.departmentAnalytics?.length) {
          const deptData = orgData.departmentAnalytics.map(d => ({
            'Department': d.name,
            'Employee Count': d.employee_count,
            'Manager Count': d.manager_count || 0
          }));
          downloadCSV(deptData, `department_employees_${dateLabel}`, ['Department', 'Employee Count', 'Manager Count']);
        }

        if (!orgData?.roleDistribution?.length && !orgData?.departmentAnalytics?.length) {
          alert('No employee data available to export');
        }
        break;
      }

      default:
        alert('Please select a report type to export');
    }
  };

  return (
    <DashboardLayout
      title={t('reports.reportsAndAnalytics')}
      breadcrumbs={[
        { label: t('common.breadcrumbs.dashboard'), href: '/dashboard/organization' },
        { label: t('common.breadcrumbs.reports') },
      ]}
    >
      <div className="space-y-6">
        {/* Header with Filters */}
        <Card>
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {t('reports.reportsAndAnalytics')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-muted">
                {t('reports.description')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
              {/* Scrollable Tabs Container */}
              <div className="w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 min-w-max">
                  {(['overview', 'attendance', 'leave', 'employee'] as const).map((type) => (
                     <Button variant="ghost" 
                      key={type}
                      onClick={() => setReportType(type)}
                      className={cn(
                        'px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                        reportType === type
                          ? 'bg-white dark:bg-gray-900 text-brand-500 shadow-elev-1'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      )}
                    >
                      {t(`reports.${type}`)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 flex-1 sm:flex-none">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | 'custom')}
                    className="w-full sm:w-auto px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  >
                    <option value="7d">{t('reports.last7Days')}</option>
                    <option value="30d">{t('reports.last30Days')}</option>
                    <option value="90d">{t('reports.last90Days')}</option>
                    <option value="custom">{t('reports.custom')}</option>
                  </select>
                  {dateRange === 'custom' && (
                    <DateRangePicker
                      startDate={customStart}
                      endDate={customEnd}
                      onStartDateChange={setCustomStart}
                      onEndDateChange={setCustomEnd}
                    />
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={exportReport} className="whitespace-nowrap">
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
                    <p className="text-sm text-gray-600 dark:text-muted mb-1">{t('reports.totalEmployees')}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {orgData?.orgMetrics.total_employees || 0}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      <TrendingUp size={12} className="inline mr-1" />
                      +{orgData?.orgMetrics.active_employees || 0} {t('reports.active')}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-brand-50/80">
                    <Users className="text-brand-500" size={24} />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-muted mb-1">{t('reports.departments')}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {orgData?.orgMetrics.total_departments || 0}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-muted mt-1">
                      {orgData?.orgMetrics.total_designations || 0} {t('reports.designations')}
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
                    <p className="text-sm text-gray-600 dark:text-muted mb-1">{t('reports.leaveRequests')}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {hrData?.leaveMetrics.total_requests || 0}
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      {hrData?.leaveMetrics.pending || 0} {t('reports.pending')}
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
                    <p className="text-sm text-gray-600 dark:text-muted mb-1">{t('reports.attendanceRate')}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {orgData?.attendanceMetrics.length
                        ? Math.round(
                          (orgData.attendanceMetrics.reduce(
                            (acc, m) => acc + Number(m.total_checkins),
                            0
                          ) /
                            (orgData.attendanceMetrics.length * (Number(orgData.orgMetrics.total_employees) || 1))) *
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
                  {t('reports.roleDistribution')}
                </h3>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
                  </div>
                ) : (
                  <PieChart
                    data={orgData?.roleDistribution.map((r) => ({ name: r.role === 'EMPLOYEE' ? t('common.roleEmployee') : r.role === 'MANAGER' ? t('common.roleManager') : r.role === 'HR' ? t('common.roleHr') : r.role === 'ADMIN' ? t('common.roleAdmin') : r.role, value: Number(r.count) })) || []}
                    height={300}
                  />
                )}
              </Card>

              <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  {t('reports.departmentHeadcount')}
                </h3>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
                  </div>
                ) : (
                  <BarChart
                    data={orgData?.departmentAnalytics.slice(0, 10).map(d => ({ ...d, employee_count: Number(d.employee_count) })) || []}
                    dataKey="employee_count"
                    xKey="name"
                    name={t('reports.employees')}
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
                  {t('reports.attendanceTrendAnalysis')} ({getDateRangeLabel()})
                </h3>
                {isLoading ? (
                  <div className="h-[350px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
                  </div>
                ) : (
                  <AreaChart
                    data={orgData?.attendanceMetrics.map((d) => ({
                      date: format(new Date(d.date), 'MMM dd'),
                      'Total Check-ins': Number(d.total_checkins) || 0,
                      'Late Arrivals': Number(d.late_arrivals) || 0,
                      'Unique Employees': Number(d.unique_employees) || 0,
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
                  {t('reports.leaveTypeDistribution')}
                </h3>
                {isLoading ? (
                  <div className="h-[350px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
                  </div>
                ) : (
                  <PieChart
                    data={orgData?.leaveStatistics?.map((stat, index) => ({
                      name: stat.leave_type,
                      value: Number(stat.total_requests) || 0,
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
                  {t('reports.departmentPerformance')}
                </h3>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
                  </div>
                ) : (
                  <BarChart
                    data={orgData?.departmentAnalytics?.slice(0, 8).map((dept, index) => ({
                      ...dept,
                      employee_count: Number(dept.employee_count),
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
                  {t('reports.monthlyTrends')}
                </h3>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
                  </div>
                ) : (
                  <LineChart
                    data={orgData?.attendanceMetrics?.slice(-14).map((d) => ({
                      date: format(new Date(d.date), 'MMM dd'),
                      'Attendance Rate': Math.round(((Number(d.unique_employees) || 0) / Math.max(Number(orgData?.orgMetrics?.total_employees) || 1, 1)) * 100),
                      'Punctuality Rate': Math.round((((Number(d.total_checkins) || 0) - (Number(d.late_arrivals) || 0)) / Math.max(Number(d.total_checkins) || 1, 1)) * 100),
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
        )
        }

        {/* Attendance Report */}
        {
          reportType === 'attendance' && (
            <>
              <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Attendance Overview ({getDateRangeLabel()})
                </h3>
                {isLoading ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
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
          )
        }

        {/* Leave Report */}
        {
          reportType === 'leave' && (
            <>
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Leave Type Distribution
                  </h3>
                  {isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
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
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
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
          )
        }

        {/* Employee Report */}
        {
          reportType === 'employee' && (
            <>
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Employee Status Distribution
                  </h3>
                  {isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
                    </div>
                  ) : (
                    <PieChart
                      data={[
                        {
                          name: 'Active',
                          value: orgData?.orgMetrics.active_employees || 0,
                        },
                        {
                          name: 'Inactive',
                          value: orgData?.orgMetrics.inactive_employees || 0,
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
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
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
          )
        }
      </div >
    </DashboardLayout >
  );
};
