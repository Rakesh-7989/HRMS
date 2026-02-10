import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { attendanceService, AttendanceAnalytics, AttendanceReports } from '@/services/attendance.service';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays } from 'date-fns';
import { BarChart } from '@/components/charts/BarChart';
import { AreaChart } from '@/components/charts/AreaChart';
import { PieChart } from '@/components/charts/PieChart';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Table } from '@/components/ui/Table';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    Users,
    Clock,
    Download,
    Filter,
    BarChart3,
    PieChart as PieChartIcon,
    LineChart as LineChartIcon,
    FileText,
    AlertTriangle,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { adminService } from '@/services/admin.service';

export const AttendanceReportsContent: React.FC = () => {
    const { user } = useAuth();
    const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
    const [customFromDate, setCustomFromDate] = useState('');
    const [customToDate, setCustomToDate] = useState('');
    const [reportType, setReportType] = useState<'summary' | 'detailed' | 'trends' | 'compliance'>('summary');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedView, setSelectedView] = useState<'analytics' | 'reports'>('analytics');

    // Calculate date range based on selection
    const dateRange = useMemo(() => {
        const now = new Date();
        let fromDate: Date;

        switch (selectedPeriod) {
            case '7d':
                fromDate = subDays(now, 7);
                break;
            case '30d':
                fromDate = subDays(now, 30);
                break;
            case '90d':
                fromDate = subDays(now, 90);
                break;
            case 'custom':
                return {
                    from_date: customFromDate || format(subDays(now, 30), 'yyyy-MM-dd'),
                    to_date: customToDate || format(now, 'yyyy-MM-dd')
                };
            default:
                fromDate = subDays(now, 30);
        }

        return {
            from_date: format(fromDate, 'yyyy-MM-dd'),
            to_date: format(now, 'yyyy-MM-dd')
        };
    }, [selectedPeriod, customFromDate, customToDate]);

    // Fetch analytics data
    const { data: analytics } = useQuery<AttendanceAnalytics>({
        queryKey: ['attendance', 'analytics', dateRange],
        queryFn: () => attendanceService.getAttendanceAnalytics(dateRange),
        enabled: selectedView === 'analytics'
    });

    // Fetch reports data
    const { data: reports, isLoading: reportsLoading } = useQuery<AttendanceReports>({
        queryKey: ['attendance', 'reports', dateRange, reportType],
        queryFn: () => attendanceService.getAttendanceReports({ ...dateRange, report_type: reportType, limit: 100 }),
        enabled: selectedView === 'reports'
    });

    const { data: tenantProfile } = useQuery({
        queryKey: ['tenant-profile'],
        queryFn: () => adminService.getTenantProfile(),
    });



    const isCheckOutEarly = (checkOutTime: string | null | undefined) => {
        if (!checkOutTime || !tenantProfile?.settings?.workingHours?.endTime) return false;
        const checkOut = checkOutTime.substring(0, 5);
        const target = tenantProfile.settings.workingHours.endTime;
        return checkOut < target;
    };

    // Role-based access control
    const canViewOrgAnalytics = user?.role === 'ADMIN' || user?.role === 'HR';
    const canViewTeamAnalytics = user?.role === 'MANAGER';
    const showEmployeeColumn = canViewOrgAnalytics || canViewTeamAnalytics;

    // Prepare chart data based on user role
    const chartData = useMemo(() => {
        if (!analytics) return null;

        if (canViewOrgAnalytics && analytics.overallSummary) {
            // HR/Admin: Organization-wide charts
            return {
                summaryCards: [
                    {
                        title: 'Total Employees',
                        value: analytics.overallSummary.total_employees || 0,
                        icon: Users,
                        color: 'text-blue-500'
                    },
                    {
                        title: 'Present Days',
                        value: analytics.overallSummary.total_present_days || 0,
                        icon: CheckCircle,
                        color: 'text-green-500'
                    },
                    {
                        title: 'Late Arrivals',
                        value: analytics.overallSummary.total_late_days || 0,
                        icon: Clock,
                        color: 'text-yellow-500'
                    },
                    {
                        title: 'Absent Days',
                        value: analytics.overallSummary.total_absent_days || 0,
                        icon: XCircle,
                        color: 'text-red-500'
                    }
                ],
                attendanceTrends: analytics.dailyTrends?.map(trend => ({
                    date: format(new Date(trend.date), 'MMM dd'),
                    Present: trend.present_count,
                    Late: trend.late_count,
                    Absent: trend.absent_count
                })) || [],
                departmentBreakdown: analytics.departmentStats?.map(dept => ({
                    name: dept.department_name,
                    value: dept.present_days,
                    total: dept.total_employees
                })) || [],
                topPerformers: analytics.topPerformers?.slice(0, 5) || []
            };
        } else if (canViewTeamAnalytics && analytics.teamSummary) {
            // Manager: Team charts
            return {
                summaryCards: [
                    {
                        title: 'Team Members',
                        value: analytics.teamSummary.total_team_members || 0,
                        icon: Users,
                        color: 'text-blue-500'
                    },
                    {
                        title: 'Present Days',
                        value: analytics.teamSummary.total_present_days || 0,
                        icon: CheckCircle,
                        color: 'text-green-500'
                    },
                    {
                        title: 'Late Arrivals',
                        value: analytics.teamSummary.total_late_days || 0,
                        icon: Clock,
                        color: 'text-yellow-500'
                    },
                    {
                        title: 'Absent Days',
                        value: analytics.teamSummary.total_absent_days || 0,
                        icon: XCircle,
                        color: 'text-red-500'
                    }
                ],
                attendanceTrends: analytics.dailyTrends?.map(trend => ({
                    date: format(new Date(trend.date), 'MMM dd'),
                    Present: trend.present_count,
                    Late: trend.late_count,
                    Absent: trend.absent_count
                })) || [],
                teamPerformance: analytics.teamMemberStats?.map(member => ({
                    name: `${member.first_name} ${member.last_name}`,
                    attendance: member.attendance_rate || 0,
                    department: member.department
                })) || [],
                topPerformers: analytics.teamMemberStats?.slice(0, 5) || []
            };
        } else if (analytics.personalSummary) {
            // Employee: Personal charts
            return {
                summaryCards: [
                    {
                        title: 'Present Days',
                        value: analytics.personalSummary.present_days || 0,
                        icon: CheckCircle,
                        color: 'text-green-500'
                    },
                    {
                        title: 'Late Arrivals',
                        value: analytics.personalSummary.late_days || 0,
                        icon: Clock,
                        color: 'text-yellow-500'
                    },
                    {
                        title: 'Absent Days',
                        value: analytics.personalSummary.absent_days || 0,
                        icon: XCircle,
                        color: 'text-red-500'
                    },
                    {
                        title: 'Attendance Rate',
                        value: `${analytics.personalSummary.attendance_rate || 0}%`,
                        icon: TrendingUp,
                        color: 'text-blue-500'
                    }
                ],
                monthlyTrends: analytics.monthlyBreakdown?.map(month => ({
                    month: month.month,
                    Present: month.present_days,
                    Late: month.late_days,
                    Absent: month.absent_days
                })) || [],
                dailyDetails: analytics.dailyDetails?.slice(0, 30) || []
            };
        }

        return null;
    }, [analytics, canViewOrgAnalytics, canViewTeamAnalytics]);

    const exportReports = () => {
        if (!reports?.reports) return;

        const csvContent = [
            ['Date', 'Employee', 'Department', 'Check In', 'Check Out', 'Status', 'Late', 'Work Hours'].join(','),
            ...reports.reports.map(report =>
                [
                    report.date,
                    `"${report.first_name} ${report.last_name}"`,
                    `"${report.department || ''}"`,
                    report.check_in_time || '',
                    report.check_out_time || '',
                    report.status,
                    report.is_late ? 'Yes' : 'No',
                    report.work_hours || ''
                ].join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-report-${dateRange.from_date}-to-${dateRange.to_date}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex gap-2">
                    <Button
                        variant={selectedView === 'analytics' ? 'primary' : 'outline'}
                        onClick={() => setSelectedView('analytics')}
                        size="sm"
                    >
                        <BarChart3 className="mr-2" size={16} />
                        Analytics
                    </Button>
                    <Button
                        variant={selectedView === 'reports' ? 'primary' : 'outline'}
                        onClick={() => setSelectedView('reports')}
                        size="sm"
                    >
                        <FileText className="mr-2" size={16} />
                        Reports
                    </Button>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        size="sm"
                    >
                        <Filter className="mr-2" size={16} />
                        Filters
                    </Button>
                    {selectedView === 'reports' && user?.role !== 'EMPLOYEE' && (
                        <Button
                            variant="outline"
                            onClick={exportReports}
                            size="sm"
                            disabled={!reports?.reports?.length}
                        >
                            <Download className="mr-2" size={16} />
                            Export CSV
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white/5 dark:bg-white/5 rounded-lg p-4 border border-light-border dark:border-dark-border"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label className="text-sm font-medium">Time Period</Label>
                            <RadioGroup value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                                <div className="flex gap-4 mt-2">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="7d" id="7d" />
                                        <Label htmlFor="7d">Last 7 days</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="30d" id="30d" />
                                        <Label htmlFor="30d">Last 30 days</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="90d" id="90d" />
                                        <Label htmlFor="90d">Last 90 days</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="custom" id="custom" />
                                        <Label htmlFor="custom">Custom</Label>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>

                        {selectedPeriod === 'custom' && (
                            <>
                                <div>
                                    <Label htmlFor="from-date">From Date</Label>
                                    <Input
                                        id="from-date"
                                        type="date"
                                        value={customFromDate}
                                        onChange={(e) => setCustomFromDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="to-date">To Date</Label>
                                    <Input
                                        id="to-date"
                                        type="date"
                                        value={customToDate}
                                        onChange={(e) => setCustomToDate(e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        {selectedView === 'reports' && (
                            <div>
                                <Label className="text-sm font-medium">Report Type</Label>
                                <RadioGroup value={reportType} onValueChange={(value: any) => setReportType(value)}>
                                    <div className="flex gap-4 mt-2">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="summary" id="summary" />
                                            <Label htmlFor="summary">Summary</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="detailed" id="detailed" />
                                            <Label htmlFor="detailed">Detailed</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="compliance" id="compliance" />
                                            <Label htmlFor="compliance">Compliance</Label>
                                        </div>
                                    </div>
                                </RadioGroup>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Analytics View */}
            {selectedView === 'analytics' && (
                <>
                    {/* Summary Cards */}
                    {chartData?.summaryCards && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {chartData.summaryCards.map((card, index) => (
                                <motion.div
                                    key={card.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted">{card.title}</p>
                                                <p className={`text-2xl font-bold mt-2 ${card.color}`}>{card.value}</p>
                                            </div>
                                            <card.icon className={card.color} size={24} />
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* Charts Grid */}
                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Attendance Trends */}
                        {chartData?.attendanceTrends && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Card className="p-3 sm:p-6">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
                                        <LineChartIcon className="mr-2" size={20} />
                                        Attendance Trends
                                    </h3>
                                    <AreaChart
                                        data={chartData.attendanceTrends}
                                        dataKeys={['Present', 'Late', 'Absent']}
                                        xKey="date"
                                        height={300}
                                    />
                                </Card>
                            </motion.div>
                        )}

                        {/* Department Breakdown or Team Performance */}
                        {canViewOrgAnalytics && chartData?.departmentBreakdown && chartData.departmentBreakdown.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Card className="p-3 sm:p-6">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
                                        <PieChartIcon className="mr-2" size={20} />
                                        Department Breakdown
                                    </h3>
                                    <PieChart
                                        data={chartData.departmentBreakdown}
                                        height={300}
                                    />
                                </Card>
                            </motion.div>
                        )}

                        {/* Team Performance for Managers */}
                        {canViewTeamAnalytics && chartData?.teamPerformance && chartData.teamPerformance.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Card className="p-3 sm:p-6">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
                                        <BarChart3 className="mr-2" size={20} />
                                        Team Performance
                                    </h3>
                                    <BarChart
                                        data={chartData.teamPerformance.map(member => ({
                                            name: member.name.split(' ')[0], // First name only for chart
                                            'Attendance Rate': member.attendance
                                        }))}
                                        dataKey="Attendance Rate"
                                        xKey="name"
                                        name="Attendance Rate (%)"
                                        height={300}
                                    />
                                </Card>
                            </motion.div>
                        )}

                        {/* Monthly Trends for Employees */}
                        {chartData?.monthlyTrends && chartData.monthlyTrends.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Card className="p-3 sm:p-6">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
                                        <BarChart3 className="mr-2" size={20} />
                                        Monthly Attendance
                                    </h3>
                                    <BarChart
                                        data={chartData.monthlyTrends}
                                        dataKey="Present"
                                        xKey="month"
                                        name="Present Days"
                                        height={300}
                                    />
                                </Card>
                            </motion.div>
                        )}
                    </div>

                    {/* Top Performers */}
                    {chartData?.topPerformers && chartData.topPerformers.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Card>
                                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
                                    <TrendingUp className="mr-2" size={20} />
                                    Top Performers
                                </h3>
                                <div className="space-y-3">
                                    {chartData.topPerformers.map((performer, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-premium flex items-center justify-center font-bold text-white text-sm">
                                                    {performer.first_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">{performer.first_name} {performer.last_name}</p>
                                                    <p className="text-xs text-muted">{performer.department}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-green-500">{performer.attendance_rate}%</p>
                                                <p className="text-xs text-muted">{performer.present_days} present days</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </>
            )}

            {/* Reports View */}
            {selectedView === 'reports' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                <FileText className="mr-2" size={20} />
                                Attendance Reports
                                {reportType === 'compliance' && <AlertTriangle className="ml-2 text-yellow-500" size={16} />}
                            </h3>
                            {reports?.summary && (
                                <div className="text-sm text-muted">
                                    Total Records: {reports.summary.total_records} |
                                    Present: {reports.summary.present_count} |
                                    Late: {reports.summary.late_count} |
                                    Absent: {reports.summary.absent_count}
                                </div>
                            )}
                        </div>

                        {reportsLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="h-16 bg-white/10 dark:bg-white/5 rounded animate-pulse" />
                                ))}
                            </div>
                        ) : reports?.reports && reports.reports.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <thead>
                                        <tr>
                                            <th className="text-left">Date</th>
                                            {showEmployeeColumn && <th className="text-left">Employee</th>}
                                            {canViewOrgAnalytics && <th className="text-left">Department</th>}
                                            <th className="text-left">Check In</th>
                                            <th className="text-left">Check Out</th>
                                            <th className="text-left">Status</th>
                                            <th className="text-left">Device</th>
                                            <th className="text-left">Work Hours</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reports.reports.map((report, index) => (
                                            <motion.tr
                                                key={index}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="border-t border-light-border dark:border-dark-border"
                                            >
                                                <td className="py-3">{format(new Date(report.date), 'MMM dd, yyyy')}</td>
                                                {showEmployeeColumn && (
                                                    <td className="py-3">
                                                        {report.first_name} {report.last_name}
                                                        {report.email && <div className="text-xs text-muted">{report.email}</div>}
                                                    </td>
                                                )}
                                                {canViewOrgAnalytics && <td className="py-3">{report.department || '-'}</td>}
                                                <td className="py-3">
                                                    {report.check_in_time ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={report.is_late ? 'text-yellow-500 font-medium' : ''}>
                                                                {report.check_in_time}
                                                            </span>
                                                            {report.is_late && (
                                                                <span className="flex items-center text-[10px] text-yellow-600 font-bold bg-yellow-50 px-1 rounded border border-yellow-200" title="Late Arrival">
                                                                    LATE
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td className="py-3">
                                                    {report.check_out_time ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={isCheckOutEarly(report.check_out_time) ? 'text-orange-500 font-medium' : ''}>
                                                                {report.check_out_time}
                                                            </span>
                                                            {isCheckOutEarly(report.check_out_time) && (
                                                                <span className="flex items-center text-[10px] text-orange-600 font-bold bg-orange-50 px-1 rounded border border-orange-200" title="Early Departure">
                                                                    EARLY
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td className="py-3">
                                                    <span className={`px-2 py-1 rounded text-xs ${report.status === 'PRESENT' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                                                        report.status === 'HALF_DAY' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                                                            report.status === 'ABSENT' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                                                                'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                                                        }`}>
                                                        {report.status}
                                                    </span>
                                                </td>
                                                <td className="py-3">
                                                    <div className="flex gap-1">
                                                        {report.check_in_device && (
                                                            <span className="text-[10px] px-1 rounded bg-gray-100 dark:bg-gray-800" title={`In: ${report.check_in_device}`}>
                                                                {report.check_in_device.charAt(0)}
                                                            </span>
                                                        )}
                                                        {report.check_out_device && report.check_out_device !== report.check_in_device && (
                                                            <span className="text-[10px] px-1 rounded bg-gray-100 dark:bg-gray-800" title={`Out: ${report.check_out_device}`}>
                                                                {report.check_out_device.charAt(0)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3">{report.work_hours ? `${report.work_hours}h` : '-'}</td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted">
                                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No attendance records found for the selected period.</p>
                            </div>
                        )}
                    </Card>
                </motion.div>
            )}
        </div>
    );
};
