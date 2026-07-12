import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { attendanceService } from '@/services/attendance.service';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatTime12Hour } from '@/utils/timeFormat';
import { format } from 'date-fns';
import {
    FileText,
    Download,
    Calendar,
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';

interface IndividualAttendanceReportProps {
    employeeId: string;
    fromDate: string;
    toDate: string;
}

export const IndividualAttendanceReport: React.FC<IndividualAttendanceReportProps> = ({ employeeId, fromDate, toDate }) => {
    const { user } = useAuth();
    const { t } = useTranslation();
    // Fetch Report
    const { data: reportData, isLoading } = useQuery({
        queryKey: ['attendance', 'individual-report', employeeId, fromDate, toDate],
        queryFn: () => attendanceService.getIndividualEmployeeReport(employeeId, { from_date: fromDate, to_date: toDate }),
        enabled: !!employeeId && !!fromDate && !!toDate,
    });



    const records = reportData?.daily_report || [];
    const summary = reportData?.summary;

    const exportCSV = () => {
        if (!records.length) return;

        const csvContent = [
            ['Date', 'Day', 'Shift', 'Check In', 'Check Out', 'Total Hours', 'Effective Hours', 'Overtime', 'Status', 'Late By'].join(','),
            ...records.map((r: any) => [
                r.date,
                r.day_of_week,
                r.shift_name || '-',
                r.check_in_time || '-',
                r.check_out_time || '-',
                r.work_hours || '0',
                r.effective_work_hours || '0',
                r.overtime_hours || '0',
                r.status,
                r.late_by || '-'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_report_${employeeId}_${fromDate}_${toDate}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* <Card className="p-6">
                Header filters removed as they are now handled by parent component
            </Card> */}

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">{t('attendance.totalDays')}</p>
                            <p className="text-2xl font-bold">{summary.total_days}</p>
                        </div>
                        <Calendar className="text-brand-500 w-8 h-8" />
                    </Card>
                    <Card className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">{t('attendance.present')}</p>
                            <p className="text-2xl font-bold text-green-600">{summary.present_days}</p>
                        </div>
                        <CheckCircle className="text-green-500 w-8 h-8" />
                    </Card>
                    <Card className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">{t('attendance.lateHalfDay')}</p>
                            <p className="text-2xl font-bold text-yellow-600">{summary.late_days} / {summary.half_days}</p>
                        </div>
                        <Clock className="text-yellow-500 w-8 h-8" />
                    </Card>
                    <Card className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">{t('attendance.absent')} / {t('attendance.leave')}</p>
                            <p className="text-2xl font-bold text-red-600">{summary.absent_days} / {summary.leave_days}</p>
                        </div>
                        <XCircle className="text-red-500 w-8 h-8" />
                    </Card>
                </div>
            )}

            {/* Attendance Table */}
            {isLoading ? (
                <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mx-auto"></div>
                    <p className="mt-2 text-gray-500">{t('common.loading')}</p>
                </div>
            ) : records.length > 0 ? (
                <Card className="overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-semibold text-lg">{t('attendance.detailedLog')}</h3>
                        <Button variant="outline" size="sm" onClick={exportCSV}>
                            <Download className="w-4 h-4 mr-2" />
                            {t('common.exportCsv')}
                        </Button>
                    </div>
                    <DataTable
                        columns={[
                            { header: t('common.date'), accessor: (row) => format(new Date(row.date), 'MMM dd, yyyy'), sortKey: 'date' },
                            { header: t('attendance.day'), accessor: (row) => row.day_of_week, sortKey: 'day_of_week' },
                            { header: t('attendance.shift'), accessor: (row) => row.shift_name || '-', sortKey: 'shift_name' },
                            {
                                header: t('attendance.checkIn'),
                                accessor: (row) => (
                                    row.check_in_time ? (
                                        <span className={row.is_late ? 'text-red-500 font-medium' : 'text-gray-700 dark:text-gray-300'}>
                                            {formatTime12Hour(row.check_in_time, user?.timezone)}
                                            {row.is_late && <span className="text-xs ml-1 text-red-500">({row.late_by})</span>}
                                        </span>
                                    ) : '-'
                                ),
                                sortKey: 'check_in_time',
                            },
                            { header: t('attendance.checkOut'), accessor: (row) => formatTime12Hour(row.check_out_time, user?.timezone) || '-', sortKey: 'check_out_time' },
                            {
                                header: t('common.status'),
                                accessor: (row) => (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                                        ${row.status === 'PRESENT' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                            row.status === 'ABSENT' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                                row.status === 'WEEK_OFF' || row.status === 'HOLIDAY' ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400' :
                                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                        }`}>
                                        {row.status?.replace('_', ' ')}
                                    </span>
                                ),
                                sortKey: 'status',
                            },
                            { header: t('attendance.totalHours'), accessor: (row) => row.work_hours || '-', sortKey: 'work_hours' },
                            { header: t('attendance.effectiveHours'), accessor: (row) => row.effective_work_hours || '-', sortKey: 'effective_work_hours' },
                            {
                                header: t('attendance.overtime'),
                                accessor: (row) => (
                                    Number(row.overtime_hours) > 0 ? (
                                        <span className="text-green-600">+{row.overtime_hours}</span>
                                    ) : '-'
                                ),
                                sortKey: 'overtime_hours',
                            },
                        ]}
                        data={records}
                        pageSize={15}
                    />
                </Card>
            ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">{t('attendance.noRecords')}</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('attendance.tryAdjusting')}</p>
                </div>
            )}
        </div>
    );
};
