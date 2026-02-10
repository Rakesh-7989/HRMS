import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { attendanceService } from '@/services/attendance.service';
import { format } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';
import { formatTime12Hour, calculateWorkDuration } from '@/utils/timeFormat';

export const MyAttendanceContent: React.FC = () => {
    const { data: attendanceHistory = [], isLoading } = useQuery({
        queryKey: ['attendance', 'history'],
        queryFn: () => attendanceService.getMyAttendance({ limit: 30 }),
    });

    if (isLoading) {
        return <div className="p-8 text-center">Loading attendance history...</div>;
    }

    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="text-primary" size={20} />
                My Attendance History (Last 30 Days)
            </h3>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 font-medium">
                        <tr>
                            <th className="px-4 py-3 rounded-l-md max-w-[40px]">Date</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-center">Check In</th>
                            <th className="px-4 py-3 text-center">Check Out</th>
                            <th className="px-4 py-3 rounded-r-md text-right">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {attendanceHistory.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-muted">No attendance records found.</td>
                            </tr>
                        ) : (
                            attendanceHistory.map((record) => (
                                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                                        {format(new Date(record.date), 'MMM dd, yyyy')}
                                        <div className="text-xs text-muted font-normal">{format(new Date(record.date), 'EEEE')}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${record.status === 'PRESENT' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            record.status === 'ABSENT' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                record.status === 'HALF_DAY' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                    record.status === 'APPROVED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                            }`}>
                                            {record.status === 'APPROVED' ? 'REGULARIZED' : record.status}
                                            {record.is_late && (
                                                <span className="ml-1 text-red-600 font-bold">
                                                    • LATE {record.late_by ? `(${record.late_by})` : ''}
                                                </span>
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono text-gray-600 dark:text-gray-300">
                                        {formatTime12Hour(record.check_in_time)}
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono text-gray-600 dark:text-gray-300">
                                        {formatTime12Hour(record.check_out_time)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {record.check_in_time && record.check_out_time && (
                                            <div className="text-xs text-muted flex items-center justify-end gap-1">
                                                <Clock size={12} />
                                                <span>{calculateWorkDuration(record.check_in_time, record.check_out_time)}</span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};
