import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatTime12Hour, getCurrentDate } from '@/utils/timeFormat';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { attendanceService, AttendanceAnalytics, AttendanceReports } from '@/services/attendance.service';
import { adminService } from '@/services/admin.service';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, parseISO } from 'date-fns';
import { AreaChart } from '@/components/charts/AreaChart';
import { PieChart } from '@/components/charts/PieChart';
import { Select } from '@/components/ui/Select';
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
    CheckCircle,
    XCircle
} from 'lucide-react';
import { usersService } from '@/services/users.service';
import { IndividualAttendanceReport } from './IndividualAttendanceReport';

export const AttendanceReportsContent: React.FC = () => {
    const { user } = useAuth();
    const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
    const [customFromDate, setCustomFromDate] = useState('');
    const [customToDate, setCustomToDate] = useState('');
    const [reportType] = useState<'summary' | 'detailed' | 'trends' | 'compliance'>('summary');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedView, setSelectedView] = useState<'analytics' | 'reports' | 'individual'>('analytics');

    // Employee Search Config
    const [employeeSearch] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const { data: usersResponse } = useQuery({
        queryKey: ['users', 'list', employeeSearch],
        queryFn: () => usersService.getUsers({ search: employeeSearch, limit: 100 }),
        enabled: showFilters,
    });
    const employees = usersResponse?.data || [];

    // Calculate date range based on selection
    const dateRange = useMemo(() => {
        const todayStr = getCurrentDate(user?.timezone);
        const now = parseISO(todayStr);
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
                    to_date: customToDate || todayStr
                };
            default:
                fromDate = subDays(now, 30);
        }

        return {
            from_date: format(fromDate, 'yyyy-MM-dd'),
            to_date: todayStr
        };
    }, [selectedPeriod, customFromDate, customToDate, user?.timezone]);

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

    useQuery({
        queryKey: ['tenant-profile'],
        queryFn: () => adminService.getTenantProfile(),
    });

    // Role-based access control
    const canViewOrgAnalytics = user?.role === 'ADMIN' || user?.role === 'HR';
    const canViewTeamAnalytics = user?.role === 'MANAGER';


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
                        color: 'text-violet-500'
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
                        color: 'text-violet-500'
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
                        color: 'text-violet-500'
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
            {/* Header and Controls */}
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
                    {selectedView === 'reports' && (
                        <Button
                            variant="outline"
                            onClick={() => setShowFilters(!showFilters)}
                            size="sm"
                        >
                            <Filter className="mr-2" size={16} />
                            Filters
                        </Button>
                    )}
                    {selectedView === 'reports' && !selectedEmployeeId && user?.role !== 'EMPLOYEE' && (
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

            {/* Filters Section */}
            {showFilters && selectedView === 'reports' && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white/5 dark:bg-white/5 rounded-lg p-4 border border-light-border dark:border-dark-border"
                >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-2">
                            <Label className="text-sm font-medium mb-2 block">Time Period</Label>
                            <RadioGroup value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)} className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="7d" id="7d" />
                                    <Label htmlFor="7d">7 Days</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="30d" id="30d" />
                                    <Label htmlFor="30d">30 Days</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="custom" id="custom" />
                                    <Label htmlFor="custom">Custom</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {(canViewOrgAnalytics || canViewTeamAnalytics) && (
                            <div className="md:col-span-2">
                                <Label className="block mb-2">Filter by Employee (Optional)</Label>
                                <Select
                                    value={selectedEmployeeId}
                                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                    options={[
                                        { value: '', label: 'All Employees' },
                                        ...employees.map(emp => ({
                                            value: emp.id,
                                            label: `${emp.first_name} ${emp.last_name}`
                                        }))
                                    ]}
                                />
                            </div>
                        )}

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
                    </div>
                </>
            )}

            {/* Reports View */}
            {selectedView === 'reports' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {selectedEmployeeId ? (
                        /* Individual Report View - Conditionally Rendered */
                        <IndividualAttendanceReport
                            employeeId={selectedEmployeeId}
                            fromDate={dateRange.from_date}
                            toDate={dateRange.to_date}
                        />
                    ) : (
                        /* General Report View (Table) */
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <FileText className="mr-2" size={20} />
                                    General Attendance Report
                                </h3>
                                {reports?.summary && (
                                    <div className="hidden md:flex text-sm text-muted gap-3">
                                        <span>Total: {reports.summary.total_records}</span>
                                        <span>Present: {reports.summary.present_count}</span>
                                        <span>Late: {reports.summary.late_count}</span>
                                        <span>Absent: {reports.summary.absent_count}</span>
                                    </div>
                                )}
                            </div>

                            {reportsLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-12 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                                    ))}
                                </div>
                            ) : reports?.reports && reports.reports.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <thead>
                                            <tr>
                                                <th className="text-left py-3 px-4">Date</th>
                                                <th className="text-left py-3 px-4">Employee</th>
                                                <th className="text-left py-3 px-4">Check In</th>
                                                <th className="text-left py-3 px-4">Check Out</th>
                                                <th className="text-left py-3 px-4">Status</th>
                                                <th className="text-left py-3 px-4">Total Hrs</th>
                                                <th className="text-left py-3 px-4">Eff. Hrs</th>
                                                <th className="text-left py-3 px-4">Overtime</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reports.reports.map((report, index) => (
                                                <motion.tr
                                                    key={index}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                                >
                                                    <td className="py-3 px-4 whitespace-nowrap">{format(new Date(report.date), 'MMM dd')}</td>
                                                    <td className="py-3 px-4">
                                                        <div className="font-medium text-gray-900 dark:text-gray-100">{report.first_name} {report.last_name}</div>
                                                        <div className="text-xs text-muted-foreground">{report.department}</div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {report.check_in_time ? (
                                                            <div className={report.is_late ? 'text-red-500 font-medium' : ''}>
                                                                {formatTime12Hour(report.check_in_time, user?.timezone)}
                                                                {report.is_late && <span className="text-[10px] ml-1 block">Late: {report.late_by}</span>}
                                                            </div>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="py-3 px-4">{formatTime12Hour(report.check_out_time, user?.timezone) || '-'}</td>
                                                    <td className="py-3 px-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${report.status === 'PRESENT' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                            report.status === 'ABSENT' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                            }`}>
                                                            {report.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">{report.work_hours || '-'}</td>
                                                    <td className="py-3 px-4 font-mono text-sm text-gray-600 dark:text-gray-400">{report.effective_work_hours || '-'}</td>
                                                    <td className="py-3 px-4">
                                                        {Number(report.overtime_hours) > 0 ? (
                                                            <span className="text-green-600 font-medium">+{report.overtime_hours}</span>
                                                        ) : '-'}
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted">
                                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>No attendace records found for this period.</p>
                                </div>
                            )}
                        </Card>
                    )}
                </motion.div>
            )}
        </div>
    );
};
