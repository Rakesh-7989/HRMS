import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendance.service';
import { Card } from '@/components/ui/Card';
import { Loader2, Calendar as CalIcon, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatTime12Hour } from '@/utils/timeFormat';

import { useAuth } from '@/contexts/AuthContext';
import { usersService } from '@/services/users.service';

export const BreakHistoryContent: React.FC = () => {
    const { user } = useAuth();
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

    // Fetch employees for filter (Only for HR/Admin/Manager)
    const { data: employees } = useQuery({
        queryKey: ['employees-list'],
        queryFn: () => usersService.getUsers({ is_active: true }),
        enabled: ['HR', 'ADMIN', 'MANAGER'].includes(user?.role || ''),
    });

    const { data: history, isLoading, refetch } = useQuery({
        queryKey: ['break-history', date, selectedEmployeeId],
        queryFn: () => attendanceService.getBreakHistory({
            date,
            employee_id: selectedEmployeeId || undefined
        }),
    });

    const canFilterEmployees = ['HR', 'ADMIN', 'MANAGER'].includes(user?.role || '');

    return (
        <Card>
            <div className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Break History</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        {canFilterEmployees && (
                            <select
                                className="h-9 w-[180px] rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50"
                                value={selectedEmployeeId}
                                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            >
                                <option value="">All Employees</option>
                                {employees?.filter(emp => (emp.first_name || emp.last_name) && emp.employee_uuid && emp.role !== 'ADMIN' && emp.role !== 'MANAGER').map((emp) => (
                                    <option key={emp.id} value={emp.employee_uuid}>
                                        {emp.first_name} {emp.last_name} {emp.employee_id ? `(${emp.employee_id})` : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                        <div className="relative">
                            <CalIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="pl-9 w-40 h-9"
                            />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setDate(new Date().toISOString().split('T')[0])}>
                            Today
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                            <RefreshCw size={14} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : !history || history.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No break records found for this date.
                    </div>
                ) : (
                    <div className="relative overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-3">Employee</th>
                                    <th className="px-6 py-3">Start Time</th>
                                    <th className="px-6 py-3">End Time</th>
                                    <th className="px-6 py-3">Duration</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((record) => (
                                    <tr key={record.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            {record.first_name} {record.last_name}
                                        </td>
                                        <td className="px-6 py-4">
                                            {formatTime12Hour(record.start_time)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {record.end_time ? formatTime12Hour(record.end_time) : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {record.duration_minutes
                                                ? `${Math.round(record.duration_minutes)} mins`
                                                : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {record.end_time ? (
                                                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">
                                                    Completed
                                                </span>
                                            ) : (
                                                <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-orange-900 dark:text-orange-300">
                                                    Ongoing
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Card>
    );
};
