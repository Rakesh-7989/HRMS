import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Check, X, User, Calendar, Briefcase, ListTodo, Clock, Loader2, AlertCircle, CheckSquare, Square } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui/Table';

import { timesheetService } from '@/services/timesheet.service';
import { cn } from '@/utils/cn';

export const TimesheetApprovals: React.FC = () => {
    const queryClient = useQueryClient();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Fetch Pending Approvals
    const { data: timesheets = [], isLoading } = useQuery({
        queryKey: ['timesheets', 'approvals'],
        queryFn: () => timesheetService.getPendingApprovals(),
    });

    // Approve Mutation
    const approveMutation = useMutation({
        mutationFn: timesheetService.approveTimesheet,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            setSelectedIds([]);
        },
        onError: () => {
            alert('Failed to approve timesheet');
        },
    });

    // Bulk Approve Mutation
    const bulkApproveMutation = useMutation({
        mutationFn: (ids: string[]) => timesheetService.bulkApproveTimesheets(ids),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            setSelectedIds([]);
            if (data.errors.length > 0) {
                alert(`Approved ${data.results.length} sheets. ${data.errors.length} errors occurred.`);
            }
        },
        onError: () => {
            alert('Failed to process bulk approval');
        },
    });

    // Reject Mutation
    const rejectMutation = useMutation({
        mutationFn: (data: { id: string; reason: string }) => timesheetService.rejectTimesheet(data.id, data.reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            setSelectedIds([]);
        },
        onError: () => {
            alert('Failed to reject timesheet');
        },
    });

    const handleApprove = (id: string) => {
        if (window.confirm('Are you sure you want to approve this timesheet entry?')) {
            approveMutation.mutate({ timesheet_id: id });
        }
    };

    const handleReject = (id: string) => {
        const reason = window.prompt('Please enter a reason for rejection:');
        if (reason !== null) {
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

    const handleBulkApprove = () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Are you sure you want to approve ${selectedIds.length} timesheets?`)) {
            bulkApproveMutation.mutate(selectedIds);
        }
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
                                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Bulk Execution Mode</h4>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mt-1">Ready for high-speed labor verification</p>
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
                                {bulkApproveMutation.isPending ? 'Processing...' : 'Execute Bulk Commit'}
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
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Audit Request Queue</h3>
                            <p className="text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-widest opacity-60">Verification threshold: 100% Accuracy</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-full ring-1 ring-amber-500/20 text-[9px] font-black text-amber-600 uppercase tracking-widest">
                        Pending: {timesheets.length}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-gray-50/50 dark:bg-gray-950/20">
                            <TableRow>
                                <TableHead className="w-12 px-6">
                                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-primary transition-colors">
                                        {selectedIds.length === timesheets.length && timesheets.length > 0 ? (
                                            <CheckSquare size={18} className="text-primary" />
                                        ) : (
                                            <Square size={18} />
                                        )}
                                    </button>
                                </TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 tracking-widest">Employee / Identity</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 tracking-widest">Log Timestamp</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 tracking-widest">Scope / Task</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 tracking-widest">Delta</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 text-right tracking-widest">Operations</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-24">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="animate-spin text-primary" size={32} />
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Accessing Cryptographic Logs...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : timesheets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-24">
                                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-100 dark:border-gray-800">
                                            <Check size={24} className="text-gray-200" />
                                        </div>
                                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Queue Depleted</h4>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Zero pending labor hours detected in matrix.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                timesheets.map((entry) => (
                                    <TableRow
                                        key={entry.entry_id || entry.id}
                                        className={cn(
                                            "hover:bg-gray-50/80 dark:hover:bg-gray-800/50 border-gray-50 dark:border-gray-800 transition-colors group",
                                            selectedIds.includes(entry.id) && "bg-primary/5 hover:bg-primary/10"
                                        )}
                                    >
                                        <TableCell className="px-6 py-4">
                                            <button
                                                onClick={() => toggleSelect(entry.id)}
                                                className={cn(
                                                    "transition-colors",
                                                    selectedIds.includes(entry.id) ? "text-primary" : "text-gray-300 group-hover:text-gray-400"
                                                )}
                                            >
                                                {selectedIds.includes(entry.id) ? (
                                                    <CheckSquare size={18} />
                                                ) : (
                                                    <Square size={18} />
                                                )}
                                            </button>
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-[10px] text-primary font-black shadow-sm ring-1 ring-primary/20">
                                                    {(entry.employee?.first_name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-800 dark:text-gray-200 text-sm group-hover:text-primary transition-colors">
                                                        {entry.employee ? `${entry.employee.first_name} ${entry.employee.last_name}` : 'Unknown Entity'}
                                                    </span>
                                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                                        <User size={10} strokeWidth={3} /> {entry.employee?.role || 'Staff Member'}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                                <Calendar size={14} className="text-gray-400" />
                                                <span className="text-xs font-bold uppercase tracking-tighter">
                                                    {format(new Date(entry.work_date), 'MMM dd, yyyy')}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <div>
                                                <p className="text-[11px] font-black text-gray-700 dark:text-gray-200 uppercase tracking-tight flex items-center gap-1.5 leading-none">
                                                    <Briefcase size={12} className="text-gray-400" />
                                                    {entry.project?.name || 'Standard Protocol'}
                                                </p>
                                                <p className="text-[9px] text-gray-500 mt-1.5 font-bold uppercase tracking-widest flex items-center gap-1.5 opacity-70">
                                                    <ListTodo size={11} /> {entry.task?.title || 'Operational Work'}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-primary/60" />
                                                <span className="text-sm font-black text-gray-900 dark:text-white">{entry.hours}</span>
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Hrs</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 font-black text-[9px] uppercase tracking-[0.2em] rounded-lg transition-all active:scale-[0.95] flex items-center gap-2 px-3 h-8"
                                                    onClick={() => handleReject(entry.id)}
                                                    disabled={approveMutation.isPending || rejectMutation.isPending || bulkApproveMutation.isPending}
                                                >
                                                    <X size={12} className="stroke-[4px]" />
                                                    Reject
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="bg-slate-900 dark:bg-primary/20 dark:text-primary hover:bg-slate-800 dark:hover:bg-primary/30 text-white font-black text-[9px] uppercase tracking-[0.2em] rounded-lg shadow-sm transition-all active:scale-[0.95] flex items-center gap-2 px-3 h-8"
                                                    onClick={() => handleApprove(entry.id)}
                                                    disabled={approveMutation.isPending || rejectMutation.isPending || bulkApproveMutation.isPending}
                                                >
                                                    <Check size={12} className="stroke-[4px]" />
                                                    Commit
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="p-4 bg-gray-50/50 dark:bg-gray-950/30 border-t border-gray-100 dark:border-gray-800 flex justify-center">
                    <div className="flex items-center gap-2 text-[8px] font-black text-gray-400 uppercase tracking-[0.5em]">
                        <AlertCircle size={10} /> Certified Labor Identity Verification
                    </div>
                </div>
            </Card>
        </div>
    );
};
