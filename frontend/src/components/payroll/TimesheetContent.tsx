import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, CheckCircle, AlertCircle, History, ListTodo, Send, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui/Table';
import { StatusBadge } from '@/components/projects/StatusBadge';
import { TimesheetEntryForm } from '@/components/projects/TimesheetEntryForm';
import { TimesheetApprovals } from '@/components/projects/TimesheetApprovals';
import { timesheetService } from '@/services/timesheet.service';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';

export const TimesheetContent: React.FC = () => {
    const { user } = useAuth();
    const canManage = ['ADMIN', 'MANAGER', 'HR'].includes(user?.role || '');

    const [activeTab, setActiveTab] = useState<'my' | 'approvals'>(canManage ? 'approvals' : 'my');

    const queryClient = useQueryClient();

    // Fetch My Timesheets
    const { data: timesheets = [], isLoading } = useQuery({
        queryKey: ['timesheets', 'my'],
        queryFn: () => timesheetService.getMyTimesheets(),
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
                    {/* Entry Form Section */}
                    <div className="max-w-4xl">
                        <TimesheetEntryForm />
                    </div>

                    {/* History Table */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <ListTodo size={16} className="text-primary" />
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Labor History</h3>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest ring-1 ring-emerald-500/20">
                                <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                                Real-time Status
                            </div>
                        </div>

                        <Card className="p-0 border-none shadow-sm ring-1 ring-black/5 overflow-hidden bg-white dark:bg-gray-800/50">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-gray-50/50 dark:bg-gray-950/20">
                                        <TableRow>
                                            <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 tracking-widest">Date</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 tracking-widest">Project & Task</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 tracking-widest">Duration</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 text-right tracking-widest">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-24">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Loader2 className="animate-spin text-primary" size={32} />
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Accessing Time Records...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : timesheets.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-24">
                                                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-100 dark:border-gray-800">
                                                        <AlertCircle size={24} className="text-gray-200" />
                                                    </div>
                                                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Vault Empty</h4>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Begin logging labor to populate your history.</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            timesheets.map((entry) => (
                                                <TableRow key={entry.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 border-gray-50 dark:border-gray-800 transition-colors group">
                                                    <TableCell className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                                                                <CalendarIcon size={14} />
                                                            </div>
                                                            <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                                                                {format(new Date(entry.work_date), 'MMM dd, yyyy')}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4">
                                                        <div>
                                                            <p className="text-[11px] font-black text-gray-800 dark:text-gray-200 uppercase tracking-tight leading-none mb-1">{entry.project?.name || 'Base Protocol'}</p>
                                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest opacity-60 italic">{entry.task?.title || 'Operational Work'}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-black text-gray-900 dark:text-white">{entry.hours}</span>
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Hrs</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 text-right">
                                                        <div className="flex flex-col items-end gap-2">
                                                            <div className="flex items-center gap-2">
                                                                {(entry.status === 'DRAFT' || (entry as any).status === 'REJECTED') && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-8 px-3 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 flex items-center gap-1.5 rounded-lg border border-primary/20"
                                                                        onClick={() => handleSubmitSheet((entry as any).timesheet_id)}
                                                                        isLoading={submitMutation.isPending}
                                                                    >
                                                                        <Send size={10} />
                                                                        Submit
                                                                    </Button>
                                                                )}
                                                                <StatusBadge type="timesheet" status={entry.status} />
                                                            </div>
                                                            {(entry as any).rejection_reason && (
                                                                <div className="flex items-center gap-2 p-2 bg-red-50/50 dark:bg-red-900/10 text-red-600 rounded-lg max-w-[220px] text-left border border-red-100 dark:border-red-900/20">
                                                                    <MessageSquare size={10} className="shrink-0" />
                                                                    <p className="text-[9px] font-bold leading-tight line-clamp-2 uppercase tracking-tight">
                                                                        {(entry as any).rejection_reason}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
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
