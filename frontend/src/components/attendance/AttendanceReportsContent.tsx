import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatTime12Hour, getCurrentDate } from '@/utils/timeFormat';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { attendanceService, AttendanceAnalytics, AttendanceReports, AttendanceReportRow } from '@/services/attendance.service';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, parseISO } from 'date-fns';
import { AreaChart } from '@/components/charts/AreaChart';
import { PieChart } from '@/components/charts/PieChart';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { usePermissions } from '@/contexts/PermissionsContext';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { DataTable, Column } from '@/components/ui/DataTable';

import { useTranslation } from 'react-i18next';
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
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();
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

    // Role-based access control
    const canViewOrgAnalytics = hasPermission('attendance', 'view_all');
    const canViewTeamAnalytics = hasPermission('attendance', 'view_team');

    // Fetch analytics data
    const { data: analytics } = useQuery<AttendanceAnalytics>({
        queryKey: ['attendance', 'analytics', dateRange],
        queryFn: () => attendanceService.getAttendanceAnalytics(dateRange),
        enabled: selectedView === 'analytics' && (canViewOrgAnalytics || canViewTeamAnalytics || true) // Personal analytics is always allowed if they can see the tab
    });

    // Fetch reports data
    const { data: reports, isLoading: reportsLoading } = useQuery<AttendanceReports>({
        queryKey: ['attendance', 'reports', dateRange, reportType],
        queryFn: () => attendanceService.getAttendanceReports({ ...dateRange, report_type: reportType, limit: 100 }),
        enabled: selectedView === 'reports' && (canViewOrgAnalytics || canViewTeamAnalytics)
    });


    // Prepare chart data based on user role
    const chartData = useMemo(() => {
        if (!analytics) return null;

        if (canViewOrgAnalytics && analytics.overallSummary) {
            // HR/Admin: Organization-wide charts
            return {
                summaryCards: [
                    {
                        title: t('attendance.totalEmployees'),
                        value: analytics.overallSummary.total_employees || 0,
                        icon: Users,
                        color: 'text-brand-500'
                    },
                    {
                        title: t('attendance.reports.presentDays'),
                        value: analytics.overallSummary.total_present_days || 0,
                        icon: CheckCircle,
                        color: 'text-green-500'
                    },
                    {
                        title: t('attendance.lateArrivals'),
                        value: analytics.overallSummary.total_late_days || 0,
                        icon: Clock,
                        color: 'text-yellow-500'
                    },
                    {
                        title: t('attendance.reports.absentDays'),
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
                        title: t('attendance.reports.teamMembers'),
                        value: analytics.teamSummary.total_team_members || 0,
                        icon: Users,
                        color: 'text-brand-500'
                    },
                    {
                        title: t('attendance.reports.presentDays'),
                        value: analytics.teamSummary.total_present_days || 0,
                        icon: CheckCircle,
                        color: 'text-green-500'
                    },
                    {
                        title: t('attendance.lateArrivals'),
                        value: analytics.teamSummary.total_late_days || 0,
                        icon: Clock,
                        color: 'text-yellow-500'
                    },
                    {
                        title: t('attendance.reports.absentDays'),
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
                        title: t('attendance.reports.presentDays'),
                        value: analytics.personalSummary.present_days || 0,
                        icon: CheckCircle,
                        color: 'text-green-500'
                    },
                    {
                        title: t('attendance.lateArrivals'),
                        value: analytics.personalSummary.late_days || 0,
                        icon: Clock,
                        color: 'text-yellow-500'
                    },
                    {
                        title: t('attendance.reports.absentDays'),
                        value: analytics.personalSummary.absent_days || 0,
                        icon: XCircle,
                        color: 'text-red-500'
                    },
                    {
                        title: t('attendance.reports.attendanceRate'),
                        value: `${analytics.personalSummary.attendance_rate || 0}%`,
                        icon: TrendingUp,
                        color: 'text-brand-500'
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
    }, [analytics, canViewOrgAnalytics, canViewTeamAnalytics, t]);

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



    const reportColumns = useMemo((): Column<AttendanceReportRow>[] => [
        {
            header: t('common.date'),
            accessorKey: 'date' as const,
            cell: (row: AttendanceReportRow) => format(new Date(row.date), 'MMM dd'),
        },
        {
            header: t('common.employee'),
            cell: (row: AttendanceReportRow) => (
                <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{row.first_name || ''} {row.last_name || ''}</div>
                    <div className="text-xs text-muted-foreground">{row.department || ''}</div>
                </div>
            ),
        },
        {
            header: t('attendance.checkIn'),
            cell: (row: AttendanceReportRow) => (
                row.check_in_time ? (
                    <div className={row.is_late ? 'text-red-500 font-medium' : ''}>
                        {formatTime12Hour(row.check_in_time, user?.timezone)}
                        {row.is_late && <span className="text-[10px] ml-1 block">{t('attendance.late')}: {row.late_by}</span>}
                    </div>
                ) : '-'
            ),
        },
        {
            header: t('attendance.checkOut'),
            cell: (row: AttendanceReportRow) => formatTime12Hour(row.check_out_time, user?.timezone) || '-',
        },
        {
            header: t('common.status'),
            cell: (row: AttendanceReportRow) => (
                <span className={`px-2 py-1 rounded text-xs font-medium ${row.status === 'PRESENT' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    row.status === 'ABSENT' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                    {row.status}
                </span>
            ),
        },
        {
            header: t('attendance.workingHours'),
            accessorKey: 'work_hours' as const,
            cell: (row: AttendanceReportRow) => row.work_hours || '-',
        },
        {
            header: t('attendance.effectiveHours'),
            accessorKey: 'effective_work_hours' as const,
            cell: (row: AttendanceReportRow) => <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{row.effective_work_hours || '-'}</span>,
        },
        {
            header: t('attendance.overtime'),
            cell: (row: AttendanceReportRow) => (
                Number(row.overtime_hours || 0) > 0 ? (
                    <span className="text-green-600 font-medium">+{row.overtime_hours}</span>
                ) : '-'
            ),
        },
    ], [user?.timezone, t]);

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
                        {t('attendance.analytics')}
                    </Button>
                    <Button
                        variant={selectedView === 'reports' ? 'primary' : 'outline'}
                        onClick={() => setSelectedView('reports')}
                        size="sm"
                    >
                        <FileText className="mr-2" size={16} />
                        {t('attendance.reports')}
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
                            {t('common.filters')}
                        </Button>
                    )}
                    {selectedView === 'reports' && !selectedEmployeeId && (canViewOrgAnalytics || canViewTeamAnalytics) && (
                        <Button
                            variant="outline"
                            onClick={exportReports}
                            size="sm"
                            disabled={!reports?.reports?.length}
                        >
                            <Download className="mr-2" size={16} />
                            {t('common.exportCsv')}
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
                    className="bg-white/5 dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/10"
                >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-2">
                            <Label className="text-sm font-medium mb-2 block">{t('attendance.reports.timePeriod')}</Label>
                            <RadioGroup value={selectedPeriod} onValueChange={(value: string) => setSelectedPeriod(value as '7d' | '30d' | '90d' | 'custom')} className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="7d" id="7d" />
                                    <Label htmlFor="7d">{t('attendance.reports.period7d')}</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="30d" id="30d" />
                                    <Label htmlFor="30d">{t('attendance.reports.period30d')}</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="custom" id="custom" />
                                    <Label htmlFor="custom">{t('attendance.reports.periodCustom')}</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {(canViewOrgAnalytics || canViewTeamAnalytics) && (
                            <div className="md:col-span-2">
                                <Label className="block mb-2">{t('attendance.reports.filterByEmployee')}</Label>
                                <Select
                                    value={selectedEmployeeId}
                                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                    options={[
                                        { value: '', label: t('attendance.reports.allEmployees') },
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
                                    <Label htmlFor="from-date">{t('attendance.reports.fromDate')}</Label>
                                    <Input
                                        id="from-date"
                                        type="date"
                                        value={customFromDate}
                                        onChange={(e) => setCustomFromDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="to-date">{t('attendance.reports.toDate')}</Label>
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
                                        {t('attendance.reports.attendanceTrends')}
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
                                        {t('attendance.reports.departmentBreakdown')}
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
                                    {t('attendance.reports.generalReport')}
                                </h3>
                                {reports?.summary && (
                                    <div className="hidden md:flex text-sm text-muted gap-3">
                                        <span>{t('common.total')}: {reports.summary.total_records}</span>
                                        <span>{t('attendance.present')}: {reports.summary.present_count}</span>
                                        <span>{t('attendance.late')}: {reports.summary.late_count}</span>
                                        <span>{t('attendance.absent')}: {reports.summary.absent_count}</span>
                                    </div>
                                )}
                            </div>

                            <DataTable
                                data={reports?.reports || []}
                                columns={reportColumns}
                                loading={reportsLoading}
                                emptyMessage={t('attendance.reports.noRecordsForPeriod')}
                            />
                        </Card>
                    )}
                </motion.div>
            )}
        </div>
    );
};
