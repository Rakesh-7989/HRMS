import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { leaveService, LeaveType, LeaveBalance } from '@/services/employee/leave.service';
import { ApplyLeaveForm } from '@/components/forms/ApplyLeaveForm';
import { Plus, Search, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export const MyLeaveContent: React.FC = () => {
    const queryClient = useQueryClient();
    const [applyDialogOpen, setApplyDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');

    const canApply = true; // All authenticated users can apply for leave

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

    const cancelMutation = useMutation({
        mutationFn: (id: string) => leaveService.cancelMyLeave(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
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

    if (!canApply) return <div>Access Denied</div>;

    return (
        <div className="space-y-6">
            {/* Leave Balances */}
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

            {/* Actions Row */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search leaves..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>

                    {/* Filters Wrapper */}
                    <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
                        {/* Status Filter */}
                        <div className="w-full sm:w-auto">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                                <option value="ALL">All Status</option>
                                <option value="PENDING">Pending</option>
                                <option value="APPROVED">Approved</option>
                                <option value="REJECTED">Rejected</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>

                        {/* Type Filter */}
                        <div className="w-full sm:w-auto">
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
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
                </div>

                {/* Apply Button */}
                <div className="flex-shrink-0">
                    <Button onClick={() => setApplyDialogOpen(true)} size="md" className="w-full lg:w-auto">
                        <Plus className="mr-2" size={18} />
                        Request Leave / WFH
                    </Button>
                    <ApplyLeaveForm open={applyDialogOpen} onOpenChange={setApplyDialogOpen} />
                </div>
            </div>

            {/* My Leaves Table */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Leave History</h3>
                    <span className="text-sm text-gray-500 dark:text-muted">
                        Showing {filteredMyLeaves.length} records
                    </span>
                </div>

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
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Type</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Start Date</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">End Date</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider min-w-[150px]">Reason</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {filteredMyLeaves.map((leave) => (
                                    <tr
                                        key={leave.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                                    >
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white whitespace-nowrap">{(leave as any).leave_type_name || leave.leave_type}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                            {format(new Date(leave.start_date), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                            {format(new Date(leave.end_date), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]" title={leave.reason}>
                                            {leave.reason}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
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
                                        <td className="py-3 px-4 text-right">
                                            {leave.status === 'PENDING' && (
                                                <button
                                                    onClick={() => cancelMutation.mutate(leave.id)}
                                                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
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
        </div>
    );
};
