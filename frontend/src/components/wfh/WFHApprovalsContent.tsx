import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { wfhService, WFHRequest } from '@/services/wfh.service';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Calendar, User } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/Dialog';

export const WFHApprovalsContent: React.FC = () => {
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

    return (
        <div className="space-y-6">
            <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Pending WFH Requests
                </h3>

                {isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    </div>
                ) : pendingRequests.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-muted">
                        No pending WFH requests
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Employee
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Reason
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Requested
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {pendingRequests.map((request) => (
                                    <tr
                                        key={request.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                                    >
                                        <td className="py-3 px-4">
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
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-gray-400" />
                                                <span className="text-sm text-gray-900 dark:text-white">
                                                    {format(new Date(request.request_date), 'MMM dd, yyyy')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                                            {request.reason}
                                        </td>
                                        <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                                            {format(new Date(request.created_at), 'MMM dd, hh:mm a')}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={() => handleApprove(request)}
                                                >
                                                    <CheckCircle size={14} className="mr-1" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleReject(request)}
                                                >
                                                    <XCircle size={14} className="mr-1" />
                                                    Reject
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>



            <Dialog
                open={showApproveDialog}
                onOpenChange={setShowApproveDialog}
                title="Approve WFH Request"
                className="max-w-md"
            >
                {selectedRequest && (
                    <div className="flex flex-col">
                        <DialogContent className="py-6 px-6">
                            {capacityStats && capacityStats.totalTeamSize > 0 &&
                                ((capacityStats.approvedWFHCount + capacityStats.approvedLeaveCount) / capacityStats.totalTeamSize) >= 0.5 && (
                                    <div className="mb-4 bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r shadow-sm">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-orange-800">
                                                    High Absence Warning
                                                </h3>
                                                <div className="mt-1 text-sm text-orange-700">
                                                    <p>
                                                        {capacityStats.approvedWFHCount} WFH + {capacityStats.approvedLeaveCount} Leave
                                                        out of {capacityStats.totalTeamSize} team members.
                                                        {(
                                                            ((capacityStats.approvedWFHCount + capacityStats.approvedLeaveCount) / capacityStats.totalTeamSize) * 100
                                                        ).toFixed(0)}% of the team is away/remote.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <p className="text-sm text-blue-900 dark:text-blue-300">
                                    <strong>{selectedRequest.first_name} {selectedRequest.last_name}</strong> has
                                    requested to work from home on{' '}
                                    <strong>{format(new Date(selectedRequest.request_date), 'MMMM dd, yyyy')}</strong>
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                                    Reason: {selectedRequest.reason}
                                </p>
                            </div>

                            <div className="mt-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Comment (Optional)
                                </label>
                                <textarea
                                    value={approvalComment}
                                    onChange={(e) => setApprovalComment(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
                                    placeholder="Add a comment (optional)..."
                                />
                            </div>
                        </DialogContent>

                        <DialogFooter className="px-6 pb-6 pt-0 border-t-0">
                            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={confirmApprove} isLoading={approveMutation.isPending}>
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
                        <DialogContent className="py-6 px-6">
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <p className="text-sm text-red-900 dark:text-red-300">
                                    You are about to reject <strong>{selectedRequest.first_name}'s</strong> WFH request for{' '}
                                    <strong>{format(new Date(selectedRequest.request_date), 'MMMM dd, yyyy')}</strong>
                                </p>
                            </div>

                            <div className="mt-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Rejection Reason *
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
                                    placeholder="Please provide a reason for rejection (minimum 5 characters)..."
                                />
                                {rejectionReason.length > 0 && rejectionReason.length < 5 && (
                                    <p className="mt-1 text-sm text-red-600">
                                        Reason must be at least 5 characters
                                    </p>
                                )}
                            </div>
                        </DialogContent>

                        <DialogFooter className="px-6 pb-6 pt-0 border-t-0">
                            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmReject}
                                isLoading={rejectMutation.isPending}
                                disabled={rejectionReason.trim().length < 5}
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
