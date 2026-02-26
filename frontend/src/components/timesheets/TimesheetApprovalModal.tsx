import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';
import { WeeklyTimesheetEntry } from './WeeklyTimesheetEntry';
import { Timesheet } from '@/types/project.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { timesheetService } from '@/services/employee/timesheet.service';
import { toast } from 'react-hot-toast';


interface TimesheetApprovalModalProps {
    isOpen: boolean;
    onClose: () => void;
    timesheet: Timesheet | null;
}

export const TimesheetApprovalModal: React.FC<TimesheetApprovalModalProps> = ({
    isOpen,
    onClose,
    timesheet
}) => {
    const queryClient = useQueryClient();

    const approveMutation = useMutation({
        mutationFn: timesheetService.approveTimesheet,
        onSuccess: () => {
            toast.success("Timesheet approved successfully");
            queryClient.invalidateQueries({ queryKey: ['timesheets', 'pending-approvals'] });
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to approve timesheet");
        }
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            timesheetService.rejectTimesheet(id, reason),
        onSuccess: () => {
            toast.success("Timesheet rejected");
            queryClient.invalidateQueries({ queryKey: ['timesheets', 'pending-approvals'] });
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to reject timesheet");
        }
    });

    const handleApprove = async (id: string, notes?: string) => {
        // Optional: Add confirmation dialog here if desired, 
        // though the button in WeeklyTimesheetEntry is explicit enough.
        // But for consistency with previous flow:
        /*
        const result = await confirm({
            title: 'Approve Timesheet',
            message: 'Are you sure you want to approve this timesheet?',
            confirmText: 'Approve'
        });
        if (!result) return;
        */
        approveMutation.mutate({ timesheet_id: id, notes });
    };

    const handleReject = async (id: string, reason: string) => {
        // If reason is empty, prompt for it
        let finalReason = reason;
        if (!finalReason) {
            // We can rely on WeeklyTimesheetEntry to pass it, or prompt here
            // WeeklyTimesheetEntry passes "" currently on button click
            // So we might want to show a prompt here.
            // But standard prompt logic might be better handled inside the component or here.

            // Let's use a simple prompt if no reason provided
            const input = window.prompt("Please provide a reason for rejection:");
            if (input === null) return; // Cancelled
            if (!input.trim()) {
                toast.error("Rejection reason is required");
                return;
            }
            finalReason = input;
        }

        rejectMutation.mutate({ id, reason: finalReason });
    };

    if (!timesheet) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[1200px] h-[90vh] flex flex-col p-0 gap-0 bg-transparent shadow-none border-none">
                {/* 
                   We want the WeeklyTimesheetEntry to handle the layout.
                   It has its own Card, so we might want to strip that or just let it be.
                   WeeklyTimesheetEntry has a Card with background.
                   DialogContent default has background.
                */}
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50">
                        <div>
                            <DialogTitle>Review Timesheet</DialogTitle>
                            <p className="text-sm text-gray-500 mt-1">
                                {timesheet.employee?.first_name} {timesheet.employee?.last_name} • {timesheet.project?.name || 'General'}
                            </p>
                        </div>
                        {/* Close button is handled by DialogContent usually, but we can add explicit one if needed */}
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <WeeklyTimesheetEntry
                            preloadedTimesheet={timesheet}
                            isApprovalMode={true}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            onCancel={onClose}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
