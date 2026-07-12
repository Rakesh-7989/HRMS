import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendance.service';
import { Card } from '@/components/ui/Card';
import { Loader2, RefreshCw, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatTime12Hour } from '@/utils/timeFormat';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/ui/DataTable';

export const CurrentBreaksContent: React.FC = () => {
    const { user } = useAuth();
    const { data: breaks, isLoading, refetch } = useQuery({
        queryKey: ['current-breaks'],
        queryFn: attendanceService.getCurrentBreaks,
    });

    // Force re-render every minute to update the "duration" calculation
    const [_, setTick] = React.useState(0);
    React.useEffect(() => {
        const timer = setInterval(() => {
            setTick(t => t + 1);
        }, 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
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

                <DataTable
                    data={breaks || []}
                    columns={[
                        {
                            header: 'Employee',
                            cell: (item: any) => (
                                <div>
                                    <div>{item.first_name} {item.last_name}</div>
                                    <div className="text-xs text-gray-500">{item.email}</div>
                                </div>
                            ),
                        },
                        {
                            header: 'Department',
                            cell: (item: any) => (
                                <div>
                                    <div>{item.department_name || '-'}</div>
                                    <div className="text-xs text-gray-500">{item.designation_name || '-'}</div>
                                </div>
                            ),
                        },
                        {
                            header: 'Break Start',
                            cell: (item: any) => formatTime12Hour(item.start_time, user?.timezone),
                        },
                        {
                            header: 'Duration (Approx)',
                            cell: (item: any) => {
                                const startTime = new Date(item.start_time);
                                let diffMinutes = 0;
                                if (!isNaN(startTime.getTime())) {
                                    diffMinutes = Math.floor((new Date().getTime() - startTime.getTime()) / 60000);
                                }
                                if (diffMinutes < 0) diffMinutes = 0;
                                return (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${diffMinutes > 60 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                                        {diffMinutes} mins
                                    </span>
                                );
                            },
                        },
                    ]}
                    loading={isLoading}
                    emptyMessage="No one is currently on break."
                />
            </div>
        </Card>
    );
};
