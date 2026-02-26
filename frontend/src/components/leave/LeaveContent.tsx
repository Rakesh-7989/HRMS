import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { leaveService, LeaveType, LeaveBalance } from '@/services/employee/leave.service';
import { useAuth } from '@/contexts/AuthContext';
import { ApplyLeaveForm } from '@/components/forms/ApplyLeaveForm';
import { Plus, CheckCircle, XCircle, Search, Filter, Calendar, User, TrendingUp } from 'lucide-react';
import { format, subDays } from 'date-fns';

export const LeaveContent: React.FC = () => {
    const { hasPermission } = useAuth();
    const queryClient = useQueryClient();
    const [applyDialogOpen, setApplyDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');

    const canApply = hasPermission('request_leave');
    const canApprove = hasPermission('approve_leave');
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
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => leaveService.rejectLeave(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
        },
    });

    const cancelMutation = useMutation({
        mutationFn: (id: string) => leaveService.cancelMyLeave(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
        },
    });

    return (
        <div className="space-y-6">
            {/* Analytics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Requests', value: leaveSummary?.total_applications || 0, accent: 'text-primary' },
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
                            <TrendingUp className="h-5 w-5 text-primary" />
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
                                        <span className="text-xl font-bold text-primary">{balance.available}</span>
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
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex gap-2">
                            <Filter className="text-gray-400 mt-2" size={18} />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
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
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
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
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
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
                    {isLoading ? (
                        <div className="h-64 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                        </div>
                    ) : filteredMyLeaves.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-muted">
                            {myLeaves.length === 0 ? 'No leave applications found' : 'No applications match your filters'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Type</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Start Date</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">End Date</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {filteredMyLeaves.map((leave) => (
                                        <tr
                                            key={leave.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                                        >
                                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                                                {(leave as any).leave_type_name || leave.leave_type}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                                {format(new Date(leave.start_date), 'MMM dd, yyyy')}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                                {format(new Date(leave.end_date), 'MMM dd, yyyy')}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-xs font-medium ${leave.status === 'APPROVED'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : leave.status === 'REJECTED'
                                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                        }`}
                                                >
                                                    {leave.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {leave.status === 'PENDING' && (
                                                    <button
                                                        onClick={() => cancelMutation.mutate(leave.id)}
                                                        className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                                        disabled={cancelMutation.isPending}
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {/* Pending Approvals */}
            {canApprove && (
                <Card>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Pending Approvals</h3>
                    {filteredPendingApprovals.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-muted">
                            {pendingApprovals.length === 0 ? 'No pending approvals' : 'No approvals match your filters'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-light-border dark:border-dark-border">
                                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Employee</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Type</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Dates</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Reason</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPendingApprovals.map((leave) => (
                                        <tr
                                            key={leave.id}
                                            className="border-b border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-white/5"
                                        >
                                            <td className="py-3 px-4 text-gray-900 dark:text-white">
                                                {leave.employee?.first_name} {leave.employee?.last_name}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600 dark:text-muted">
                                                {(leave as any).leave_type_name || leave.leave_type}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600 dark:text-muted">
                                                {format(new Date(leave.start_date), 'MMM dd')} -{' '}
                                                {format(new Date(leave.end_date), 'MMM dd, yyyy')}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600 dark:text-muted">{leave.reason}</td>
                                            <td className="py-3 px-4">
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => approveMutation.mutate(leave.id)}
                                                        isLoading={approveMutation.isPending}
                                                    >
                                                        <CheckCircle className="text-green-600" size={16} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            const reason = prompt('Rejection reason:');
                                                            if (reason) rejectMutation.mutate({ id: leave.id, reason });
                                                        }}
                                                        isLoading={rejectMutation.isPending}
                                                    >
                                                        <XCircle className="text-red-600" size={16} />
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
            )}
        </div>
    );
};
