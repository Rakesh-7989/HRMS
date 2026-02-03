import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendance.service';
import { Card } from '@/components/ui/Card';
import { Loader2, RefreshCw, Coffee, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatTime12Hour } from '@/utils/timeFormat';

export const CurrentBreaksContent: React.FC = () => {
    const { data: breaks, isLoading, refetch } = useQuery({
        queryKey: ['current-breaks'],
        queryFn: attendanceService.getCurrentBreaks,
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <Card>
            <div className="p-6">
                <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-4 mb-6">
                    <h3 className="text-lg font-medium flex items-center gap-2 text-gray-900 dark:text-white">
                        <Coffee className="w-5 h-5 text-orange-500" />
                        On Break Now
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 w-full xs:w-auto">
                        <RefreshCw size={14} />
                        Refresh
                    </Button>
                </div>

                {!breaks || breaks.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p>No one is currently on break.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-3">Employee</th>
                                    <th className="px-6 py-3">Department</th>
                                    <th className="px-6 py-3">Break Start</th>
                                    <th className="px-6 py-3">Duration (Approx)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {breaks.map((item, index) => {
                                    const startTime = new Date(item.start_time);
                                    const diffMinutes = Math.floor((new Date().getTime() - startTime.getTime()) / 60000);

                                    return (
                                        <tr key={index} className="bg-white border-b dark:bg-gray-900 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                <div>
                                                    {item.first_name} {item.last_name}
                                                </div>
                                                <div className="text-xs text-gray-500">{item.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900 dark:text-white">{item.department_name || '-'}</div>
                                                <div className="text-xs text-gray-500">{item.designation_name || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} className="text-gray-400" />
                                                    {formatTime12Hour(item.start_time)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${diffMinutes > 60 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                                                    {diffMinutes} mins
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Card>
    );
};
