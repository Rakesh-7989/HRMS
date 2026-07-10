import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isSameDay } from 'date-fns';
import { Calendar, FileText, AlertCircle } from 'lucide-react';
import { timesheetService } from '@/services/timesheet.service';
import { cn } from '@/utils/cn';


interface TimesheetHistoryProps {
    excludeWeekStartDate?: Date;
    onWeekSelect?: (date: Date) => void;
}

export const TimesheetHistory = ({ excludeWeekStartDate, onWeekSelect }: TimesheetHistoryProps) => {

    // Fetch all my entries (flattened)
    // We'll group them by week on client side to match the design
    const { data: entriesData, isLoading } = useQuery({
        queryKey: ['my-timesheet-entries'],
        queryFn: () => timesheetService.getMyTimesheetEntries({ limit: 100 }) // Fetch reasonable amount
    });

    if (isLoading) {
        return <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-xs">Loading history...</div>;
    }

    const entries = entriesData?.entries || [];

    if (entries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-gray-400">
                <FileText className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs">No timesheet history found</span>
            </div>
        );
    }

    // Group by Week Start Date
    const grouped = entries.reduce((acc: any, entry: any) => {
        const key = entry.week_start_date;
        if (!acc[key]) {
            acc[key] = {
                weekStart: entry.week_start_date,
                weekEnd: entry.week_end_date,
                status: entry.status,
                rejection_reason: entry.rejection_reason || null,
                totalHours: 0,
                entries: []
            };
        }
        acc[key].entries.push(entry);
        acc[key].totalHours += Number(entry.hours);
        return acc;
    }, {} as Record<string, any>);

    // Sort weeks descending and filter excluded week
    const sortedWeeks = Object.values(grouped)
        .filter((week: any) => {
            if (!excludeWeekStartDate) return true;
            // Parse backend date (likely ISO string or YYYY-MM-DD)
            const weekDate = parseISO(week.weekStart);
            return !isSameDay(weekDate, excludeWeekStartDate);
        })
        .sort((a: any, b: any) =>
            new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
        );

    return (
        <div className="space-y-4">
            {sortedWeeks.map((week: any) => {
                const startDate = parseISO(week.weekStart);
                const endDate = parseISO(week.weekEnd);

                return (
                    <div key={week.weekStart} className="border border-gray-100 dark:border-dark-border rounded-xl overflow-hidden bg-white dark:bg-dark-card transition-colors">
                        {/* Week Header */}
                        <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                            onClick={() => onWeekSelect && onWeekSelect(startDate)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                                        <Calendar size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                            {format(startDate, 'MMM dd')} — {format(endDate, 'MMM dd, yyyy')}
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-medium">
                                            {week.entries.length} Entries
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex flex-col items-end">
                                    <span className="text-lg font-black text-gray-900 dark:text-white tabular-nums">
                                        {week.totalHours.toFixed(1)} <span className="text-[10px] text-gray-400 font-bold uppercase">HRS</span>
                                    </span>
                                </div>

                                <div className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border min-w-[100px] text-center",
                                    week.status === 'APPROVED' ? "bg-green-50 text-green-600 border-green-200" :
                                        week.status === 'SUBMITTED' ? "bg-violet-50 text-violet-600 border-violet-200" :
                                            week.status === 'REJECTED' ? "bg-red-50 text-red-600 border-red-200" :
                                                "bg-gray-50 text-gray-500 border-gray-200"
                                )}>
                                    {week.status}
                                </div>
                            </div>
                        </div>

                        {/* Rejection Reason */}
                        {week.status === 'REJECTED' && week.rejection_reason && (
                            <div className="flex items-start gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/10 border-t border-red-100 dark:border-red-900/20">
                                <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Reason for Rejection</span>
                                    <span className="text-xs text-red-600 dark:text-red-400 mt-0.5">{week.rejection_reason}</span>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
