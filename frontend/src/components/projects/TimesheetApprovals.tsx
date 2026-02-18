import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Check, X, Calendar, Clock, Loader2, CheckSquare, Square, Briefcase } from 'lucide-react';
import { useConfirm } from '@/contexts/ConfirmContext';
import { toast } from 'react-hot-toast';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { WeeklyTimesheetEntry } from '@/components/timesheets/WeeklyTimesheetEntry';
import { timesheetService } from '@/services/timesheet.service';
import { cn } from '@/utils/cn';

interface TimesheetEntry {
    id: string;
    work_date: string;
    hours: number;
    notes?: string;
    project_name?: string;
    task_title?: string;
    project_id?: string;
    task_id?: string;
}

interface WeekTimesheet {
    id: string;
    week_start_date: string;
    week_end_date: string;
    total_hours: number;
    status: string;
    submitted_at: string;
    project_name?: string;
    employee: {
        id: string;
        first_name: string;
        last_name: string;
        email?: string;
        role?: string;
        shift_week_offs?: string[];
    };
    entries: TimesheetEntry[];
}

export const TimesheetApprovals: React.FC = () => {
    const queryClient = useQueryClient();
    const { confirm, alert: showAlert, prompt: showPrompt } = useConfirm();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedTimesheet, setSelectedTimesheet] = useState<WeekTimesheet | null>(null);



    // Fetch Pending Approvals (now returns week-level timesheets)
    const { data: rawData, isLoading } = useQuery({
        queryKey: ['timesheets', 'approvals'],
        queryFn: () => timesheetService.getPendingApprovals(),
    });
    const timesheets = (rawData || []) as unknown as WeekTimesheet[];

    // Approve Mutation
    const approveMutation = useMutation({
        mutationFn: timesheetService.approveTimesheet,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            setSelectedIds([]);
            setSelectedTimesheet(null); // Close modal if open
            toast.success('Timesheet approved');
        },
        onError: (error: any) => {
            showAlert({
                title: 'Operation Failed',
                message: error.message || 'Failed to approve timesheet',
                confirmText: 'Dismiss'
            });
        },
    });

    // Bulk Approve Mutation
    const bulkApproveMutation = useMutation({
        mutationFn: (ids: string[]) => timesheetService.bulkApproveTimesheets(ids),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            setSelectedIds([]);
            if (data.errors.length > 0) {
                showAlert({
                    title: 'Partial Success',
                    message: `Approved ${data.results.length} sheets. ${data.errors.length} errors occurred.`,
                    confirmText: 'Dismiss'
                });
            } else {
                toast.success(`Successfully approved ${data.results.length} entries`);
            }
        },
        onError: (error: any) => {
            showAlert({
                title: 'Bulk Processing Failed',
                message: error.message || 'Failed to process bulk approval',
                confirmText: 'Dismiss'
            });
        },
    });

    // Reject Mutation
    const rejectMutation = useMutation({
        mutationFn: (data: { id: string; reason: string }) => timesheetService.rejectTimesheet(data.id, data.reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            setSelectedIds([]);
            setSelectedTimesheet(null); // Close modal if open
            toast.success('Timesheet entry rejected');
        },
        onError: (error: any) => {
            showAlert({
                title: 'Operation Failed',
                message: error.message || 'Failed to reject timesheet',
                confirmText: 'Dismiss'
            });
        },
    });

    const handleApprove = async (id: string) => {
        const result = await confirm({
            title: 'Approve Timesheet',
            message: 'Are you sure you want to approve this timesheet?',
            confirmText: 'Approve',
            cancelText: 'Cancel'
        });
        if (result) {
            approveMutation.mutate({ timesheet_id: id });
        }
    };

    const handleReject = async (id: string) => {
        const reason = await showPrompt({
            title: 'Reject Timesheet',
            message: 'Please provide a justification for rejecting this timesheet.',
            placeholder: 'Reason for rejection...',
            confirmText: 'Reject',
            cancelText: 'Cancel'
        });
        if (reason) {
            rejectMutation.mutate({ id, reason });
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === timesheets.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(timesheets.map(t => t.id));
        }
    };

    const handleBulkApprove = async () => {
        if (selectedIds.length === 0) return;
        const result = await confirm({
            title: 'Approve Multiple Timesheets',
            message: `Are you sure you want to approve ${selectedIds.length} timesheets?`,
            confirmText: 'Approve All',
            cancelText: 'Cancel'
        });
        if (result) {
            bulkApproveMutation.mutate(selectedIds);
        }
    };

    const isMutating = approveMutation.isPending || rejectMutation.isPending || bulkApproveMutation.isPending;

    const handleViewDetails = (ts: WeekTimesheet) => {
        setSelectedTimesheet(ts);
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Bulk Actions Header */}
            {selectedIds.length > 0 && (
                <Card className="p-4 bg-primary/5 border-primary/20 shadow-lg animate-in slide-in-from-top-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black">
                                {selectedIds.length}
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Bulk Approval Mode</h4>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mt-1">
                                    {selectedIds.length} weekly timesheet{selectedIds.length !== 1 ? 's' : ''} selected
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedIds([])}
                                className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleBulkApprove}
                                isLoading={bulkApproveMutation.isPending}
                                className="bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl px-6 h-10 shadow-xl"
                            >
                                {bulkApproveMutation.isPending ? 'Processing...' : 'Approve Selected'}
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            <Card className="p-0 border-none shadow-sm ring-1 ring-black/5 overflow-hidden bg-white dark:bg-gray-800/50">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-800/50">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                            <Check size={20} className="stroke-[3px]" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Pending Approvals</h3>
                            <p className="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-widest opacity-60">Weekly timesheets awaiting review</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {timesheets.length > 0 && (
                            <button
                                onClick={toggleSelectAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors"
                            >
                                {selectedIds.length === timesheets.length && timesheets.length > 0 ? (
                                    <CheckSquare size={14} className="text-primary" />
                                ) : (
                                    <Square size={14} />
                                )}
                                Select All
                            </button>
                        )}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-full ring-1 ring-amber-500/20 text-[9px] font-black text-amber-600 uppercase tracking-widest">
                            Pending: {timesheets.length}
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center gap-3 py-24">
                        <Loader2 className="animate-spin text-primary" size={32} />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Loading Pending Timesheets...</p>
                    </div>
                ) : timesheets.length === 0 ? (
                    <div className="flex flex-col items-center py-24">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-100 dark:border-gray-800">
                            <Check size={24} className="text-gray-200" />
                        </div>
                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">All Clear</h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">No pending timesheets to review</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                        {timesheets.map((ts) => {
                            const isSelected = selectedIds.includes(ts.id);

                            return (
                                <div key={ts.id}>
                                    {/* Week-level row */}
                                    <div
                                        className={cn(
                                            "flex items-center gap-4 px-6 py-4 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer",
                                            isSelected && "bg-primary/5 hover:bg-primary/10"
                                        )}
                                        onClick={(e) => {
                                            // Prevent click when clicking checkbox or buttons
                                            if ((e.target as HTMLElement).closest('button')) return;
                                            handleViewDetails(ts);
                                        }}
                                    >
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => toggleSelect(ts.id)}
                                            className={cn(
                                                "transition-colors shrink-0",
                                                isSelected ? "text-primary" : "text-gray-300 group-hover:text-gray-400"
                                            )}
                                        >
                                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>

                                        {/* Main content */}
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            {/* Employee avatar */}
                                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-[10px] text-primary font-black shadow-sm ring-1 ring-primary/20 shrink-0">
                                                {(ts.employee?.first_name || 'U').charAt(0).toUpperCase()}
                                            </div>

                                            {/* Employee name + week range */}
                                            <div className="min-w-0 text-left">
                                                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm group-hover:text-primary transition-colors block truncate">
                                                    {ts.employee ? `${ts.employee.first_name} ${ts.employee.last_name}` : 'Unknown'}
                                                </span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1">
                                                        <Calendar size={10} strokeWidth={3} />
                                                        {format(parseISO(ts.week_start_date), 'MMM dd')} — {format(parseISO(ts.week_end_date), 'MMM dd, yyyy')}
                                                    </span>
                                                    {ts.project_name && (
                                                        <span className="text-[9px] text-gray-400 font-bold flex items-center gap-1">
                                                            <Briefcase size={9} /> {ts.project_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hours + entries count */}
                                        <div className="text-right shrink-0">
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={14} className="text-primary/60" />
                                                <span className="text-lg font-black text-gray-900 dark:text-white tabular-nums">{Number(ts.total_hours).toFixed(1)}</span>
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Hrs</span>
                                            </div>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                                {ts.entries?.length || 0} entries
                                            </p>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity shrink-0">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 font-black text-[9px] uppercase tracking-[0.2em] rounded-lg transition-all active:scale-[0.95] flex items-center gap-2 px-3 h-8"
                                                onClick={() => handleReject(ts.id)}
                                                disabled={isMutating}
                                            >
                                                <X size={12} className="stroke-[4px]" />
                                                Reject
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-slate-900 dark:bg-primary/20 dark:text-primary hover:bg-slate-800 dark:hover:bg-primary/30 text-white font-black text-[9px] uppercase tracking-[0.2em] rounded-lg shadow-sm transition-all active:scale-[0.95] flex items-center gap-2 px-3 h-8"
                                                onClick={() => handleApprove(ts.id)}
                                                disabled={isMutating}
                                            >
                                                <Check size={12} className="stroke-[4px]" />
                                                Approve
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Detailed Approval Modal */}
            <Dialog
                open={!!selectedTimesheet}
                onOpenChange={(open) => !open && setSelectedTimesheet(null)}
                title="Timesheet Approval"
                // size="4xl" // Dialog component doesn't seem to have size prop based on previous read, checking...
                // The Dialog component I read earlier uses className for size control: max-w-lg by default.
                // I should probably override className to make it wider.
                className="max-w-6xl w-full max-h-[90vh]"
            >
                {selectedTimesheet && (
                    <div className="p-1">
                        <div className="mb-4 flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {selectedTimesheet.employee?.first_name} {selectedTimesheet.employee?.last_name}
                                </h3>
                                <p className="text-xs text-gray-500 font-medium">
                                    {format(parseISO(selectedTimesheet.week_start_date), 'MMM dd')} - {format(parseISO(selectedTimesheet.week_end_date), 'MMM dd, yyyy')}
                                </p>
                            </div>

                        </div>

                        <WeeklyTimesheetEntry
                            preloadedTimesheet={selectedTimesheet as unknown as any}
                            isApprovalMode={true}
                            onApprove={async (id) => {
                                await handleApprove(id);
                            }}
                            onReject={async (id, reason) => {
                                // handleReject already prompts, but WeeklyTimesheetEntry might pass reason if it has its own prompt
                                if (reason) {
                                    rejectMutation.mutate({ id, reason });
                                } else {
                                    handleReject(id);
                                }
                            }}
                            onCancel={() => setSelectedTimesheet(null)}
                        />
                    </div>
                )}
            </Dialog>
        </div>
    );
};
