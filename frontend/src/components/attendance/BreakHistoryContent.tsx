import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendance.service';
import { Card } from '@/components/ui/Card';
import { Calendar as CalIcon, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatTime12Hour, getCurrentDate } from '@/utils/timeFormat';

import { useAuth } from '@/contexts/AuthContext';
import { usersService } from '@/services/users.service';
import { DataTable } from '@/components/ui/DataTable';

export const BreakHistoryContent: React.FC = () => {
    const { user } = useAuth();
    const [date, setDate] = useState<string>(getCurrentDate(user?.timezone));
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

    // Fetch employees for filter (Only for HR/Admin/Manager)
    const { data: usersResponse } = useQuery({
        queryKey: ['employees-list'],
        queryFn: () => usersService.getUsers({ is_active: true }),
        enabled: ['HR', 'ADMIN', 'MANAGER'].includes(user?.role || ''),
    });
    const employees = usersResponse?.data || [];

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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Break History</h3>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        {canFilterEmployees && (
                            <select
                                className="h-9 w-full sm:w-[180px] rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-elev-1 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500/50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50"
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
                        <div className="relative w-full sm:w-auto">
                            <CalIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="pl-9 w-full sm:w-48 h-9"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setDate(getCurrentDate(user?.timezone))} className="flex-1 sm:flex-none">
                                Today
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 flex-1 sm:flex-none">
                                <RefreshCw size={14} />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </div>

                <DataTable
                    data={history || []}
                    columns={[
                        {
                            header: 'Employee',
                            cell: (record: any) => `${record.first_name} ${record.last_name}`,
                        },
                        {
                            header: 'Start Time',
                            cell: (record: any) => formatTime12Hour(record.start_time, user?.timezone),
                        },
                        {
                            header: 'End Time',
                            cell: (record: any) => record.end_time ? formatTime12Hour(record.end_time, user?.timezone) : '-',
                        },
                        {
                            header: 'Duration',
                            cell: (record: any) => record.duration_minutes ? `${Math.round(record.duration_minutes)} mins` : '-',
                        },
                        {
                            header: 'Status',
                            cell: (record: any) => record.end_time ? (
                                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">Completed</span>
                            ) : (
                                <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-orange-900 dark:text-orange-300">Ongoing</span>
                            ),
                        },
                    ]}
                    loading={isLoading}
                    emptyMessage="No break records found for this date."
                />
            </div>
        </Card>
    );
};
