import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { leaveService, LeaveType, LeaveBalance } from '@/services/leave.service';
import { usePermissions } from '@/contexts/PermissionsContext';
import { ApplyLeaveForm } from '@/components/forms/ApplyLeaveForm';
import { Plus, CheckCircle, XCircle, Search, Filter, Calendar, User, TrendingUp } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/Dialog';
import { LeaveApplication } from '@/services/leave.service';
import { showToast } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/ui/DataTable';

export const LeaveContent: React.FC = () => {
    const { t } = useTranslation();
    const { hasPermission } = usePermissions();
    const queryClient = useQueryClient();
    const [applyDialogOpen, setApplyDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<LeaveApplication | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const canApply = hasPermission('leave', 'create');
    const canApprove = hasPermission('leave', 'approve');
    const rangeTo = format(new Date(), 'yyyy-MM-dd');
    const rangeFrom = format(subDays(new Date(), 29), 'yyyy-MM-dd');

    // Fetch leave types dynamically
    const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
        queryKey: ['leave-types'],
        queryFn: () => leaveService.getLeaveTypes(),
    });

    // Fetch leave balances for current user
    const { data: leaveBalances = [] } = useQuery<LeaveBalance[]>({
        queryKey: ['leave-balances', 'my'],
        queryFn: () => leaveService.getMyBalances(),
        enabled: canApply,
    });

    const { data: myLeaves = [], isLoading } = useQuery({
        queryKey: ['leaves', 'my'],
        queryFn: () => leaveService.getMyLeaves({ limit: 50 }),
        enabled: canApply,
    });

    const { data: pendingApprovals = [] } = useQuery({
        queryKey: ['leaves', 'pending'],
        queryFn: () => leaveService.getPendingApprovals({ limit: 50 }),
        enabled: canApprove,
    });

    const { data: leaveSummary } = useQuery({
        queryKey: ['leaves', 'summary', rangeFrom, rangeTo],
        queryFn: () => leaveService.getLeaveSummary({ from_date: rangeFrom, to_date: rangeTo }),
        enabled: canApprove || canApply,
    });

    // Filter leaves based on search and filters
    const filteredMyLeaves = useMemo(() => {
        return myLeaves.filter((leave) => {
            const matchesSearch = searchTerm === '' ||
                leave.leave_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                leave.reason?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'ALL' || leave.status === statusFilter;
            const matchesType = typeFilter === 'ALL' || leave.leave_type === typeFilter;

            return matchesSearch && matchesStatus && matchesType;
        });
    }, [myLeaves, searchTerm, statusFilter, typeFilter]);

    const filteredPendingApprovals = useMemo(() => {
        return pendingApprovals.filter((leave) => {
            const matchesSearch = searchTerm === '' ||
                leave.employee?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                leave.employee?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                leave.leave_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                leave.reason?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = typeFilter === 'ALL' || leave.leave_type === typeFilter;

            return matchesSearch && matchesType;
        });
    }, [pendingApprovals, searchTerm, typeFilter]);

    const approveMutation = useMutation({
        mutationFn: (id: string) => leaveService.approveLeave(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            showToast.success(t('common.leaveApproved', { defaultValue: 'Leave request approved' }));
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => leaveService.rejectLeave(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            showToast.success(t('common.leaveRejected', { defaultValue: 'Leave request rejected' }));
            setShowRejectDialog(false);
            setRejectionReason('');
            setSelectedLeave(null);
        },
    });

    const cancelMutation = useMutation({
        mutationFn: (id: string) => leaveService.cancelMyLeave(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            showToast.success(t('common.leaveCancelled', { defaultValue: 'Leave request cancelled' }));
        },
    });

    return (
        <div className="space-y-6">
            {/* Analytics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Requests', value: leaveSummary?.total_applications || 0, accent: 'text-brand-500' },
                    { label: 'Pending', value: leaveSummary?.pending || 0, accent: 'text-yellow-500' },
                    { label: 'Approved', value: leaveSummary?.approved || 0, accent: 'text-accent-green' },
                    { label: 'Rejected', value: leaveSummary?.rejected || 0, accent: 'text-red-500' },
                ].map((card) => (
                    <Card key={card.label} className="p-4">
                        <p className="text-sm text-muted">{card.label}</p>
                        <p className={`text-2xl font-bold mt-2 ${card.accent}`}>{card.value}</p>
                        <p className="text-xs text-gray-500 dark:text-muted mt-1">
                            Last 30 days
                        </p>
                    </Card>
                ))}
            </div>

            {/* Leave Balances */}
            {canApply && (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-brand-500" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Leave Balances</h3>
                        </div>
                    </div>
                    {leaveBalances.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No leave balances available</p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                            {leaveBalances.map((balance) => (
                                <div
                                    key={balance.id || `${balance.leave_type_id}-${balance.year}`}
                                    className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                                >
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                        {balance.leave_type?.name || 'Leave'}
                                    </p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-bold text-brand-500">{balance.available}</span>
                                        <span className="text-xs text-gray-400">/ {balance.entitled}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Used: {balance.used} | Pending: {balance.pending}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            {/* Search and Filter Section */}
            <Card>
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by employee name, leave type, or reason..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-brand-500/50 focus:border-transparent"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex gap-2">
                            <Filter className="text-gray-400 mt-2" size={18} />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/50 focus:border-transparent"
                            >
                                <option value="ALL">All Status</option>
                                <option value="PENDING">Pending</option>
                                <option value="APPROVED">Approved</option>
                                <option value="REJECTED">Rejected</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>

                        {/* Type Filter - Dynamic from backend */}
                        <div className="flex gap-2">
                            <Calendar className="text-gray-400 mt-2" size={18} />
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/50 focus:border-transparent"
                            >
                                <option value="ALL">All Types</option>
                                {leaveTypes.map((type) => (
                                    <option key={type.id} value={type.code || type.name}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Filter Summary */}
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                            <User size={14} />
                            Showing {canApply ? filteredMyLeaves.length : 0} my leaves
                            {canApprove && `, ${filteredPendingApprovals.length} pending approvals`}
                        </span>
                        {searchTerm && (
                            <span className="bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300 px-2 py-1 rounded">
                                Search: "{searchTerm}"
                            </span>
                        )}
                        {statusFilter !== 'ALL' && (
                            <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded">
                                Status: {statusFilter}
                            </span>
                        )}
                        {typeFilter !== 'ALL' && (
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                                Type: {typeFilter === 'ANNUAL' ? 'Annual Leave' :
                                    typeFilter === 'SICK' ? 'Sick Leave' :
                                        typeFilter === 'CASUAL' ? 'Casual Leave' :
                                            typeFilter === 'MATERNITY' ? 'Maternity Leave' :
                                                typeFilter === 'PATERNITY' ? 'Paternity Leave' :
                                                    typeFilter === 'UNPAID' ? 'Unpaid Leave' : typeFilter}
                            </span>
                        )}
                    </div>
                </div>
            </Card>

            {/* Apply Leave Section */}
            {canApply && (
                <Card>
                    <div className="flex items-center justify-between gap-3 flex-wrap md:flex-nowrap">
                        <div>
                            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">My Leave History</h3>
                            <p className="text-sm text-gray-600 dark:text-muted">
                                {filteredMyLeaves.length} of {myLeaves.length} applications
                            </p>
                        </div>
                        <>
                            <Button onClick={() => setApplyDialogOpen(true)} size="md">
                                <Plus className="mr-2" size={18} />
                                Apply for Leave
                            </Button>
                            <ApplyLeaveForm open={applyDialogOpen} onOpenChange={setApplyDialogOpen} />
                        </>
                    </div>
                </Card>
            )}

            {/* My Leaves */}
            {canApply && (
                <Card>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">My Leave History</h3>
                    <DataTable
                        columns={[
                            { header: 'Type', cell: (row: { leave_type_name?: string; leave_type: string }) => row.leave_type_name || row.leave_type, sortKey: 'leave_type' },
                            { header: 'Start Date', cell: (row: { start_date: string }) => format(new Date(row.start_date), 'MMM dd, yyyy'), sortKey: 'start_date' },
                            { header: 'End Date', cell: (row: { end_date: string }) => format(new Date(row.end_date), 'MMM dd, yyyy'), sortKey: 'end_date' },
                            {
                                header: 'Status',
                                cell: (row) => (
                                    <div className="flex flex-col gap-1 items-start">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.status === 'APPROVED'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : row.status === 'REJECTED'
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                : row.status === 'CANCELLED'
                                                    ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            }`}>
                                            {row.status}
                                        </span>
                                        {row.status === 'REJECTED' && row.rejection_reason && (
                                            <span className="text-[10px] text-red-600 dark:text-red-400 leading-tight max-w-[150px]">
                                                Reason: {row.rejection_reason}
                                            </span>
                                        )}
                                    </div>
                                ),
                                sortKey: 'status',
                            },
                            {
                                header: 'Actions',
                                cell: (row) => (
                                    row.status === 'PENDING' ? (
                                         <Button variant="ghost" 
                                            onClick={() => cancelMutation.mutate(row.id)}
                                            className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                            disabled={cancelMutation.isPending}
                                        >
                                            Cancel
                                        </Button>
                                    ) : null
                                ),
                            },
                        ]}
                        data={filteredMyLeaves}
                        loading={isLoading}
                        emptyMessage={myLeaves.length === 0 ? 'No leave applications found' : 'No applications match your filters'}
                        pageSize={10}
                    />
                </Card>
            )}

            {/* Pending Approvals */}
            {canApprove && (
                <Card>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Pending Approvals</h3>
                    <DataTable
                        columns={[
                            {
                                header: 'Employee',
                                cell: (row) => (
                                    <span className="text-gray-900 dark:text-white">
                                        {row.employee?.first_name} {row.employee?.last_name}
                                    </span>
                                ),
                                sortKey: 'employee',
                            },
                            { header: 'Type', cell: (row: { leave_type_name?: string; leave_type: string }) => row.leave_type_name || row.leave_type, sortKey: 'leave_type' },
                            {
                                header: 'Dates',
                                cell: (row) => `${format(new Date(row.start_date), 'MMM dd')} - ${format(new Date(row.end_date), 'MMM dd, yyyy')}`,
                                sortKey: 'start_date',
                            },
                            { header: 'Reason', cell: (row) => row.reason || '-' },
                            {
                                header: 'Actions',
                                cell: (row) => (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => approveMutation.mutate(row.id)}
                                            isLoading={approveMutation.isPending}
                                        >
                                            <CheckCircle className="text-green-600" size={16} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedLeave(row as unknown as LeaveApplication);
                                                setShowRejectDialog(true);
                                            }}
                                            isLoading={rejectMutation.isPending}
                                        >
                                            <XCircle className="text-red-600" size={16} />
                                        </Button>
                                    </div>
                                ),
                            },
                        ]}
                        data={filteredPendingApprovals}
                        emptyMessage={pendingApprovals.length === 0 ? 'No pending approvals' : 'No approvals match your filters'}
                        pageSize={10}
                    />
                </Card>
            )}

            <Dialog
                open={showRejectDialog}
                onOpenChange={setShowRejectDialog}
                title="Reject Leave Application"
                className="max-w-md"
            >
                {selectedLeave && (
                    <div className="flex flex-col">
                        <DialogContent className="py-2 px-0">
                            <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-3">
                                <p className="text-xs text-red-800 dark:text-red-400">
                                    You are about to reject the leave request for
                                    <strong> {selectedLeave.employee?.first_name || (selectedLeave as { first_name?: string }).first_name} {selectedLeave.employee?.last_name || (selectedLeave as { last_name?: string }).last_name}</strong>
                                </p>
                            </div>

                            <div className="mt-4">
                                <label htmlFor="rejection-reason" className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Rejection Reason *
                                </label>
                                <textarea
                                    id="rejection-reason"
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
                                onClick={() => {
                                    if (selectedLeave && rejectionReason.trim().length >= 5) {
                                        rejectMutation.mutate({ id: selectedLeave.id, reason: rejectionReason });
                                    }
                                }}
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
