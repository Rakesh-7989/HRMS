import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { attendanceService } from '@/services/attendance.service';
import { format } from 'date-fns';
import { formatTime12Hour } from '@/utils/timeFormat';


export const TeamAttendanceContent: React.FC = () => {

    const { data: records = [] } = useQuery({
        queryKey: ['attendance', 'records'],
        queryFn: () => attendanceService.getAttendanceRecords({ limit: 50 }),
    });





    return (
        <div className="space-y-6">




            {/* All Records (Admin/HR/Manager) */}
            <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">All Attendance Records</h3>
                {records.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-muted">No records found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-light-border dark:border-dark-border">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Date</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Employee</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Check In</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Check Out</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Device</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Late By</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>

                                </tr>
                            </thead>
                            <tbody>
                                {records.map((att) => (
                                    <tr
                                        key={att.id}
                                        className="border-b border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-white/5"
                                    >
                                        <td className="py-3 px-4 text-gray-900 dark:text-white">
                                            {format(new Date(att.date), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-muted">
                                            {att.first_name ? `${att.first_name} ${att.last_name}` : att.employee_id}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-muted">{formatTime12Hour(att.check_in_time)}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-muted">{formatTime12Hour(att.check_out_time)}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col gap-1">
                                                {att.check_in_device && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium whitespace-nowrap w-fit">
                                                        IN: {att.check_in_device}
                                                    </span>
                                                )}
                                                {att.check_out_device && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 font-medium whitespace-nowrap w-fit">
                                                        OUT: {att.check_out_device}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-red-600 dark:text-red-400 font-medium">
                                            {att.late_by ? att.late_by : '-'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-medium ${att.status === 'PRESENT' || att.status === 'APPROVED'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : att.status === 'REJECTED'
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    }`}
                                            >
                                                {att.status.replace('_', ' ')}
                                            </span>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>


        </div>
    );
};
