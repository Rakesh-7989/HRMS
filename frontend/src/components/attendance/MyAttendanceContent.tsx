import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { attendanceService } from '@/services/attendance.service';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatTime12Hour, calculateWorkDuration } from '@/utils/timeFormat';
import { DataTable } from '@/components/ui/DataTable';
import { useTranslation } from 'react-i18next';

export const MyAttendanceContent: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { data: attendanceHistory = [], isLoading } = useQuery({
        queryKey: ['attendance', 'history'],
        queryFn: () => attendanceService.getMyAttendance({ limit: 30 }),
    });

    const columns = [
        {
            header: t('common.date'),
            cell: (record: any) => (
                <div>
                    <div className="font-medium whitespace-nowrap">{format(new Date(record.date), 'MMM dd, yyyy')}</div>
                    <div className="text-xs text-muted font-normal">{format(new Date(record.date), 'EEEE')}</div>
                </div>
            ),
        },
        {
            header: t('common.status'),
            cell: (record: any) => (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${record.status === 'PRESENT' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    record.status === 'ABSENT' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        record.status === 'HALF_DAY' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            record.status === 'APPROVED' ? 'bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400' :
                                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                    {record.status === 'APPROVED' ? 'REGULARIZED' : record.status}
                    {record.is_late && (
                        <span className="ml-1 text-red-600 font-bold">
                            • {t('attendance.late')} {record.late_by ? `(${record.late_by})` : ''}
                        </span>
                    )}
                </span>
            ),
        },
        {
            header: t('attendance.checkIn'),
            className: 'text-center',
            cell: (record: any) => (
                <span className="font-mono">{formatTime12Hour(record.check_in_time, user?.timezone)}</span>
            ),
        },
        {
            header: t('attendance.checkOut'),
            className: 'text-center',
            cell: (record: any) => (
                <span className="font-mono">{formatTime12Hour(record.check_out_time, user?.timezone)}</span>
            ),
        },
        {
            header: t('common.notes'),
            className: 'text-right',
            cell: (record: any) => (
                record.check_in_time && record.check_out_time ? (
                    <span className="text-xs text-muted flex items-center justify-end gap-1">
                        <span>{calculateWorkDuration(record.check_in_time, record.check_out_time)}</span>
                    </span>
                ) : null
            ),
        },
    ];

    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="text-brand-500" size={20} />
                {t('attendance.title')} ({t('common.overallData')})
            </h3>

            <DataTable
                data={attendanceHistory}
                columns={columns}
                loading={isLoading}
                emptyMessage={t('common.noData')}
            />
        </Card>
    );
};
