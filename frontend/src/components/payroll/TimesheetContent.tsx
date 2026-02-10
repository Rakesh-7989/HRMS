import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { Calendar as CalendarIcon, Clock, CheckCircle, History, Send, MessageSquare, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TimesheetApprovals } from '@/components/projects/TimesheetApprovals';
import { TimesheetDashboard } from '@/components/timesheets/TimesheetDashboard';
import { timesheetService } from '@/services/timesheet.service';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';
import type { Timesheet } from '@/types/project.types';

// Group entries by week_start_date or derived week
interface WeekGroup {
    weekStart: string;
    weekEnd: string;
    status: string;
    timesheetId: string;
    totalHours: number;
    entries: Timesheet[];
    rejectionReason?: string;
}

function groupEntriesByWeek(entries: Timesheet[]): WeekGroup[] {
    const weekMap = new Map<string, WeekGroup>();

    entries.forEach(entry => {
        // Use week_start_date from the response, or derive from work_date
        const weekStart = entry.week_start_date
            || format(startOfWeek(parseISO(entry.work_date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const weekEnd = entry.week_end_date
            || format(endOfWeek(parseISO(entry.work_date), { weekStartsOn: 1 }), 'yyyy-MM-dd');

        if (!weekMap.has(weekStart)) {
            weekMap.set(weekStart, {
                weekStart,
                weekEnd,
                status: entry.status || 'DRAFT',
                timesheetId: entry.timesheet_id || entry.id,
                totalHours: 0,
                entries: [],
                rejectionReason: entry.rejection_reason,
            });
        }

        const group = weekMap.get(weekStart)!;
        group.entries.push(entry);
        group.totalHours += Number(entry.hours) || 0;
    });

    // Sort by weekStart descending
    return Array.from(weekMap.values()).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

export const TimesheetContent: React.FC = () => {
    const { user } = useAuth();
    const canManage = ['ADMIN', 'MANAGER', 'HR'].includes(user?.role || '');

    const [activeTab, setActiveTab] = useState<'my' | 'approvals'>(canManage ? 'approvals' : 'my');
    const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

    const queryClient = useQueryClient();

    // Fetch My Timesheets
    const { data: timesheets = [], isLoading } = useQuery({
        queryKey: ['timesheets', 'my'],
        queryFn: () => timesheetService.getMyTimesheets({ limit: 100 }),
    });

    // Submit Mutation
    const submitMutation = useMutation({
        mutationFn: timesheetService.submitTimesheet,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
        },
        onError: () => {
            alert('Failed to submit timesheet');
        },
    });

    const handleSubmitSheet = (id: string | undefined) => {
        if (!id) return;
        if (window.confirm('Are you sure you want to submit this timesheet for approval?')) {
            submitMutation.mutate(id);
        }
    };

    const toggleWeekExpand = (weekStart: string) => {
        setExpandedWeeks(prev => {
            const next = new Set(prev);
            if (next.has(weekStart)) {
                next.delete(weekStart);
            } else {
                next.add(weekStart);
            }
            return next;
        });
    };

    const weekGroups = groupEntriesByWeek(timesheets);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20';
            case 'SUBMITTED': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
            case 'REJECTED': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
            default: return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20';
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header section with Tabs */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 dark:border-gray-800 pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-sm">
                            <Clock size={22} className="stroke-[2.5px]" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                            Time Portal
                        </h1>
                    </div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-[0.2em] opacity-60">High-fidelity labor auditing & logging</p>
                </div>

                {canManage && (
                    <div className="flex items-center gap-1 p-1 bg-gray-100/50 dark:bg-gray-950/40 rounded-xl border border-gray-100 dark:border-gray-800">
                        <button
                            onClick={() => setActiveTab('my')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                                activeTab === 'my'
                                    ? "bg-white dark:bg-gray-800 text-primary shadow-sm ring-1 ring-black/5"
                                    : "text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            )}
                        >
                            <History size={14} />
                            My Log
                        </button>
                        <button
                            onClick={() => setActiveTab('approvals')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                                activeTab === 'approvals'
                                    ? "bg-white dark:bg-gray-800 text-primary shadow-sm ring-1 ring-black/5"
                                    : "text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                            )}
                        >
                            <CheckCircle size={14} />
                            Audit Queue
                        </button>
                    </div>
                )}
            </div>

            {activeTab === 'my' ? (
                <div className="grid grid-cols-1 gap-12">
                    {/* Dashboard Section */}
                    <div className="w-full">
                        <TimesheetDashboard />
                    </div>

                    {/* History Table — Grouped by Week */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Labor History</h3>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest ring-1 ring-emerald-500/20">
                                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                                {weekGroups.length} Week{weekGroups.length !== 1 ? 's' : ''}
                            </div>
                        </div>

                        <Card className="p-0 border-none shadow-sm ring-1 ring-black/5 overflow-hidden bg-white dark:bg-gray-800/50">
                            {isLoading ? (
                                <div className="flex flex-col items-center gap-3 py-24">
                                    <Loader2 className="animate-spin text-primary" size={32} />
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Accessing Time Records...</p>
                                </div>
                            ) : weekGroups.length === 0 ? (
                                <div className="flex flex-col items-center py-24">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-100 dark:border-gray-800">
                                        <CalendarIcon size={24} className="text-gray-200" />
                                    </div>
                                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Vault Empty</h4>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Begin logging labor to populate your history.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {weekGroups.map(week => {
                                        const isExpanded = expandedWeeks.has(week.weekStart);
                                        return (
                                            <div key={week.weekStart}>
                                                {/* Week Header Row */}
                                                <button
                                                    onClick={() => toggleWeekExpand(week.weekStart)}
                                                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-gray-400 group-hover:text-primary transition-colors">
                                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                        </div>
                                                        <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                                                            <CalendarIcon size={14} />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-xs font-black text-gray-800 dark:text-gray-200">
                                                                {format(parseISO(week.weekStart), 'MMM dd')} — {format(parseISO(week.weekEnd), 'MMM dd, yyyy')}
                                                            </p>
                                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                                                {week.entries.length} entr{week.entries.length !== 1 ? 'ies' : 'y'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right mr-2">
                                                            <span className="text-lg font-black text-gray-900 dark:text-white tabular-nums">{week.totalHours.toFixed(1)}</span>
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Hrs</span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {(week.status === 'DRAFT' || week.status === 'REJECTED') && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 px-3 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 flex items-center gap-1.5 rounded-lg border border-primary/20"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleSubmitSheet(week.timesheetId);
                                                                    }}
                                                                    isLoading={submitMutation.isPending}
                                                                >
                                                                    <Send size={10} />
                                                                    Submit
                                                                </Button>
                                                            )}
                                                            <span className={cn(
                                                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                                getStatusColor(week.status)
                                                            )}>
                                                                {week.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </button>

                                                {/* Expanded Entries */}
                                                {isExpanded && (
                                                    <div className="bg-gray-50/50 dark:bg-gray-950/20 border-t border-gray-100 dark:border-gray-800">
                                                        {week.rejectionReason && (
                                                            <div className="flex items-center gap-2 mx-6 mt-3 p-3 bg-red-50/80 dark:bg-red-900/10 text-red-600 rounded-xl border border-red-100 dark:border-red-900/20">
                                                                <MessageSquare size={12} className="shrink-0" />
                                                                <p className="text-[10px] font-bold uppercase tracking-tight">
                                                                    Rejection reason: {week.rejectionReason}
                                                                </p>
                                                            </div>
                                                        )}
                                                        <div className="px-6 py-3 space-y-1">
                                                            {week.entries.map((entry, idx) => (
                                                                <div
                                                                    key={entry.id || idx}
                                                                    className="flex items-center justify-between py-2.5 px-4 rounded-lg hover:bg-white dark:hover:bg-gray-800/50 transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                                                        <div>
                                                                            <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 tabular-nums">
                                                                                {format(parseISO(entry.work_date), 'EEE, MMM d')}
                                                                            </span>
                                                                            <span className="mx-2 text-gray-300">·</span>
                                                                            <span className="text-[11px] font-black text-gray-800 dark:text-gray-200 uppercase tracking-tight">
                                                                                {entry.project?.name || entry.project_name || 'Standard Work'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        {entry.notes && (
                                                                            <span className="text-[9px] text-gray-400 font-medium italic max-w-[200px] truncate">{entry.notes}</span>
                                                                        )}
                                                                        <span className="text-xs font-black text-gray-900 dark:text-white tabular-nums w-16 text-right">
                                                                            {Number(entry.hours).toFixed(1)} hrs
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="animate-fadeIn">
                    <TimesheetApprovals />
                </div>
            )}
        </div>
    );
};
