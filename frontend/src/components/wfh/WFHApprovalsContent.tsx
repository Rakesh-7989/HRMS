import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { wfhService, WFHRequest } from '@/services/wfh.service';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Calendar, User } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/Dialog';
import { usePermissions } from '@/contexts/PermissionsContext';
import { DataTable } from '@/components/ui/DataTable';

export const WFHApprovalsContent: React.FC = () => {
    const { hasPermission } = usePermissions();
    const canApprove = hasPermission('wfh', 'approve');
    const queryClient = useQueryClient();
    const [selectedRequest, setSelectedRequest] = useState<WFHRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [approvalComment, setApprovalComment] = useState('');
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [showApproveDialog, setShowApproveDialog] = useState(false);

    const { data: pendingRequests = [], isLoading } = useQuery({
        queryKey: ['wfh-requests', 'pending'],
        queryFn: () => wfhService.getPendingRequests(),
    });

    const approveMutation = useMutation({
        mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
            wfhService.approveRequest(id, comment ? { comment } : undefined),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wfh-requests'] });
            setShowApproveDialog(false);
            setSelectedRequest(null);
            setApprovalComment('');
            setCapacityStats(null);
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            wfhService.rejectRequest(id, { reason }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wfh-requests'] });
            setShowRejectDialog(false);
            setSelectedRequest(null);
            setRejectionReason('');
        },
    });

    const [capacityStats, setCapacityStats] = useState<any>(null);

    const checkCapacity = async (request: WFHRequest) => {
        try {
            const stats = await wfhService.getTeamCapacityStats(request.request_date);
            setCapacityStats(stats);
        } catch (error) {
            console.error("Failed to check capacity", error);
        }
    };

    const handleApprove = (request: WFHRequest) => {
        setSelectedRequest(request);
        setCapacityStats(null); // Reset first
        checkCapacity(request);
        setShowApproveDialog(true);
    };


    const handleReject = (request: WFHRequest) => {
        setSelectedRequest(request);
        setShowRejectDialog(true);
    };

    const confirmApprove = () => {
        if (selectedRequest) {
            approveMutation.mutate({
                id: selectedRequest.id,
                comment: approvalComment || undefined,
            });
        }
    };

    const confirmReject = () => {
        if (selectedRequest && rejectionReason.trim().length >= 5) {
            rejectMutation.mutate({
                id: selectedRequest.id,
                reason: rejectionReason,
            });
        }
    };

    const columns = [
        {
            header: 'Employee',
            cell: (request: any) => (
                <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {request.first_name} {request.last_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {request.employee_code}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            header: 'Date',
            cell: (request: any) => (
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-900 dark:text-white">
                        {format(new Date(request.request_date), 'MMM dd, yyyy')}
                    </span>
                </div>
            ),
        },
        {
            header: 'Reason',
            cell: (request: any) => (
                <span className="max-w-xs truncate block">{request.reason}</span>
            ),
        },
        {
            header: 'Status',
            cell: (request: any) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${request.status === 'PENDING_HR'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                    {request.status === 'PENDING_HR' ? 'PENDING (HR)' : request.status}
                </span>
            ),
        },
        {
            header: 'Requested',
            cell: (request: any) => format(new Date(request.created_at), 'MMM dd, hh:mm a'),
        },
        {
            header: 'Actions',
            cell: (request: any) => (
                canApprove ? (
                    <div className="flex gap-2">
                        <Button size="sm" variant="primary" onClick={() => handleApprove(request)}>
                            <CheckCircle size={14} className="mr-1" />
                            Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(request)}>
                            <XCircle size={14} className="mr-1" />
                            Reject
                        </Button>
                    </div>
                ) : null
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Pending WFH Requests
                </h3>

                <DataTable
                    data={pendingRequests}
                    columns={columns}
                    loading={isLoading}
                    emptyMessage="No pending WFH requests"
                />
            </Card>



            <Dialog
                open={showApproveDialog}
                onOpenChange={setShowApproveDialog}
                title="Approve WFH Request"
                className="max-w-md"
            >
                {selectedRequest && (
                    <div className="flex flex-col">
                        <DialogContent className="py-2 px-0">
                            {capacityStats && capacityStats.totalTeamSize > 0 &&
                                ((capacityStats.approvedWFHCount + capacityStats.approvedLeaveCount) / capacityStats.totalTeamSize) >= 0.5 && (
                                    <div className="mb-4 bg-orange-50/50 dark:bg-orange-900/10 border-l-4 border-orange-500 p-3 rounded shadow-elev-1">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-xs font-semibold text-orange-800">
                                                    High Absence Warning
                                                </h3>
                                                <p className="mt-1 text-[11px] text-orange-700 leading-tight">
                                                    {capacityStats.approvedWFHCount} WFH + {capacityStats.approvedLeaveCount} Leave requests approved for this day.
                                                    <strong> {((((capacityStats.approvedWFHCount + capacityStats.approvedLeaveCount) / capacityStats.totalTeamSize) * 100)).toFixed(0)}%</strong> of the team will be away.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            <div className="bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/10 dark:border-brand-500/20 rounded-lg p-3">
                                <p className="text-xs text-brand-500-700 dark:text-brand-500-300">
                                    <strong>{selectedRequest.first_name} {selectedRequest.last_name}</strong> requested WFH for{' '}
                                    <strong>{format(new Date(selectedRequest.request_date), 'MMM dd, yyyy')}</strong>
                                </p>
                            </div>

                            <div className="mt-4">
                                <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Comment (Optional)
                                </label>
                                <textarea
                                    value={approvalComment}
                                    onChange={(e) => setApprovalComment(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm shadow-elev-1 transition-all"
                                    placeholder="Add a comment (optional)..."
                                />
                            </div>
                        </DialogContent>

                        <DialogFooter className="px-0 pb-2 pt-4 border-t-0 flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowApproveDialog(false)}
                                className="px-6 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmApprove}
                                isLoading={approveMutation.isPending}
                                className="px-6 bg-brand-500 hover:bg-brand-500-600 shadow-elev-3"
                            >
                                Confirm Approval
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </Dialog>

            <Dialog
                open={showRejectDialog}
                onOpenChange={setShowRejectDialog}
                title="Reject WFH Request"
                className="max-w-md"
            >
                {selectedRequest && (
                    <div className="flex flex-col">
                        <DialogContent className="py-2 px-0">
                            <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-3">
                                <p className="text-xs text-red-800 dark:text-red-400">
                                    You are about to reject <strong>{selectedRequest.first_name}'s</strong> WFH request for{' '}
                                    <strong>{format(new Date(selectedRequest.request_date), 'MMM dd, yyyy')}</strong>
                                </p>
                            </div>

                            <div className="mt-4">
                                <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Rejection Reason *
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm shadow-elev-1 transition-all"
                                    placeholder="Please provide a reason for rejection (minimum 5 characters)..."
                                />
                                {rejectionReason.length > 0 && rejectionReason.length < 5 && (
                                    <p className="mt-1 text-[11px] text-red-600 font-medium">
                                        Reason must be at least 5 characters
                                    </p>
                                )}
                            </div>
                        </DialogContent>

                        <DialogFooter className="px-0 pb-2 pt-4 border-t-0 flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowRejectDialog(false)}
                                className="px-6 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmReject}
                                isLoading={rejectMutation.isPending}
                                disabled={rejectionReason.trim().length < 5}
                                className="px-6 bg-red-500 hover:bg-red-600 shadow-elev-3"
                            >
                                Confirm Rejection
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </Dialog>
        </div>
    );
};
