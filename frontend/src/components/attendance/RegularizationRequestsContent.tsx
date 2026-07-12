import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { attendanceService, RegularizationRequest } from '@/services/attendance.service';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { usePermissions } from '@/contexts/PermissionsContext';
import { CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';

export const RegularizationRequestsContent: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const { hasPermission } = usePermissions();
    const canManage = hasPermission('attendance', 'manage');
    const canApprove = hasPermission('attendance', 'approve') || canManage;
    const canReview = canApprove || canManage;

    const subTabParam = searchParams.get('subTab') as 'my' | 'team' | null;

    const [activeTab, setActiveTab] = useState<'my' | 'team'>(() => {
        if (subTabParam === 'team' && canReview) {
            return 'team';
        }
        return 'my';
    });
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<RegularizationRequest | null>(null);
    const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED' | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [overrideCheckIn, setOverrideCheckIn] = useState('');
    const [overrideCheckOut, setOverrideCheckOut] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        date: '',
        check_in_time: '',
        check_out_time: '',
        reason: '',
    });

    // Queries
    const { data: myRequests = [], isLoading: myLoading } = useQuery({
        queryKey: ['regularization', 'my'],
        queryFn: attendanceService.getMyRegularizations,
    });

    const { data: teamRequests = [], isLoading: teamLoading } = useQuery({
        queryKey: ['regularization', 'team'],
        enabled: activeTab === 'team' && canReview,
        queryFn: () => attendanceService.getPendingRegularizations(),
    });

    // Mutations
    const applyMutation = useMutation({
        mutationFn: attendanceService.createRegularization,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['regularization'] });
            setIsApplyModalOpen(false);
            setFormData({ date: '', check_in_time: '', check_out_time: '', reason: '' });
        },
        onError: (error: any) => {
            alert(error.message || 'Failed to submit request');
        }
    });

    const reviewMutation = useMutation({
        mutationFn: ({ id, status, reason, check_in_time, check_out_time }: { id: string, status: 'APPROVED' | 'REJECTED', reason?: string, check_in_time?: string, check_out_time?: string }) =>
            attendanceService.reviewRegularization(id, { status, rejection_reason: reason, check_in_time, check_out_time }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['regularization'] });
            queryClient.invalidateQueries({ queryKey: ['attendance'] }); // Refresh attendance logs too
            setReviewAction(null);
            setSelectedRequest(null);
            setRejectionReason('');
            setOverrideCheckIn('');
            setOverrideCheckOut('');
        },
        onError: (error: any) => {
            alert(error.message || 'Failed to review request');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyMutation.mutate(formData);
    };

    const handleReview = () => {
        if (!selectedRequest || !reviewAction) return;
        reviewMutation.mutate({
            id: selectedRequest.id,
            status: activeTab === 'team' ? reviewAction : 'APPROVED', // Should only happen in team tab anyway
            reason: reviewAction === 'REJECTED' ? rejectionReason : undefined,
            check_in_time: reviewAction === 'APPROVED' ? (overrideCheckIn || undefined) : undefined,
            check_out_time: reviewAction === 'APPROVED' ? (overrideCheckOut || undefined) : undefined,
        });
    };

    // canReview already defined above

    return (
        <div className="space-y-6">
            {/* Header controls */}
            {/* Header controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="flex gap-4 border-b border-gray-100 dark:border-gray-800 pb-px sm:border-0 sm:pb-0">
                     <Button variant="ghost" 
                        onClick={() => setActiveTab('my')}
                        className={`text-sm font-medium pb-2 sm:pb-1 border-b-2 transition-colors ${activeTab === 'my' ? 'border-brand-500 text-brand-500' : 'border-transparent text-muted'} flex-1 sm:flex-none text-center sm:text-left`}
                    >
                        My Requests
                    </Button>
                    {canReview && (
                         <Button variant="ghost" 
                            onClick={() => setActiveTab('team')}
                            className={`text-sm font-medium pb-2 sm:pb-1 border-b-2 transition-colors ${activeTab === 'team' ? 'border-brand-500 text-brand-500' : 'border-transparent text-muted'} flex-1 sm:flex-none text-center sm:text-left`}
                        >
                            Start Review ({teamRequests.length || 0})
                        </Button>
                    )}
                </div>

                {activeTab === 'my' && (
                    <Button onClick={() => setIsApplyModalOpen(true)} size="sm" className="w-full sm:w-auto">
                        <Clock className="mr-2" size={16} />
                        Regularize Attendance
                    </Button>
                )}
            </div>

            {/* Content */}
            <Card>
                {activeTab === 'my' ? (
                    <DataTable
                        columns={[
                            { header: 'Date', accessor: (row) => format(new Date(row.date), 'MMM dd, yyyy'), sortKey: 'date' },
                            {
                                header: 'Time',
                                accessor: (row) => (
                                    <>
                                        In: {row.check_in_time}<br />
                                        Out: {row.check_out_time || '-'}
                                    </>
                                ),
                                sortKey: 'check_in_time',
                            },
                            { header: 'Reason', accessor: (row) => row.reason },
                            {
                                header: 'Status',
                                accessor: (row) => (
                                    <div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            row.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            }`}>
                                            {row.status}
                                        </span>
                                        {row.rejection_reason && <div className="text-xs text-red-500 mt-1">{row.rejection_reason}</div>}
                                    </div>
                                ),
                                sortKey: 'status',
                            },
                        ]}
                        data={myRequests}
                        isLoading={myLoading}
                        emptyMessage="No regularization requests found."
                        pageSize={10}
                    />
                ) : (
                    <DataTable
                        columns={[
                            {
                                header: 'Employee',
                                accessor: (row) => (
                                    <div>
                                        <div className="font-medium">{row.first_name} {row.last_name}</div>
                                        <div className="text-xs text-muted">{row.designation_name || row.email}</div>
                                    </div>
                                ),
                                sortKey: 'first_name',
                            },
                            {
                                header: 'Date/Time',
                                accessor: (row) => (
                                    <div>
                                        <div className="flex items-center gap-1"><Calendar size={12} /> {format(new Date(row.date), 'MMM dd')}</div>
                                        <div className="text-xs text-muted mt-0.5">
                                            In: {row.check_in_time} | Out: {row.check_out_time || '-'}
                                        </div>
                                    </div>
                                ),
                                sortKey: 'date',
                            },
                            { header: 'Reason', accessor: (row) => row.reason },
                            {
                                header: 'Actions',
                                accessor: (row) => (
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => { setSelectedRequest(row); setReviewAction('APPROVED'); setOverrideCheckIn(row.check_in_time || ''); setOverrideCheckOut(row.check_out_time || ''); }}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            <CheckCircle size={14} className="mr-1" /> Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => { setSelectedRequest(row); setReviewAction('REJECTED'); }}
                                        >
                                            <XCircle size={14} className="mr-1" /> Reject
                                        </Button>
                                    </div>
                                ),
                            },
                        ]}
                        data={teamRequests}
                        isLoading={teamLoading}
                        emptyMessage="No pending requests for your team."
                        pageSize={10}
                    />
                )}
            </Card>

            {/* Apply Modal */}
            <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Regularize Attendance</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                required
                                max={new Date().toISOString().split('T')[0]}
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="check_in_time">Check In Time</Label>
                                <Input
                                    id="check_in_time"
                                    type="time"
                                    required
                                    value={formData.check_in_time}
                                    onChange={e => setFormData({ ...formData, check_in_time: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="check_out_time">Check Out Time</Label>
                                <Input
                                    id="check_out_time"
                                    type="time"
                                    value={formData.check_out_time}
                                    onChange={e => setFormData({ ...formData, check_out_time: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="reason">Reason</Label>
                            <Textarea
                                id="reason"
                                required
                                placeholder="Reason for regularization request..."
                                value={formData.reason}
                                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-50 border-gray-200 dark:border-gray-800"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsApplyModalOpen(false)}>Cancel</Button>
                            <Button type="submit" isLoading={applyMutation.isPending}>Submit Request</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Review Confirmation Modal */}
            <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{reviewAction === 'APPROVED' ? 'Approve Request' : 'Reject Request'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Are you sure you want to {reviewAction?.toLowerCase()} the regularization request for <b>{selectedRequest?.first_name}</b> on <b>{selectedRequest?.date ? format(new Date(selectedRequest.date), 'MMM dd, yyyy') : ''}</b>?
                        </p>
                        {reviewAction === 'APPROVED' && (
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div>
                                    <Label>Check In Time</Label>
                                    <Input
                                        type="time"
                                        value={overrideCheckIn}
                                        onChange={e => setOverrideCheckIn(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Check Out Time</Label>
                                    <Input
                                        type="time"
                                        value={overrideCheckOut}
                                        onChange={e => setOverrideCheckOut(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                        {reviewAction === 'REJECTED' && (
                            <div className="mt-2">
                                <Label>Rejection Reason</Label>
                                <Textarea
                                    value={rejectionReason}
                                    onChange={e => setRejectionReason(e.target.value)}
                                    placeholder="Explain why this request is being rejected..."
                                    className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-50 border-gray-200 dark:border-gray-800"
                                />
                            </div>
                        )}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => { setSelectedRequest(null); setOverrideCheckIn(''); setOverrideCheckOut(''); }}>Cancel</Button>
                            <Button
                                variant={reviewAction === 'REJECTED' ? 'destructive' : 'primary'}
                                onClick={handleReview}
                                isLoading={reviewMutation.isPending}
                                disabled={reviewAction === 'REJECTED' && rejectionReason.length < 5}
                            >
                                Confirm {reviewAction === 'APPROVED' ? 'Approval' : 'Rejection'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
