import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { leaveService, LeaveType } from '@/services/leave.service';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, Search } from 'lucide-react';
import { format, subDays } from 'date-fns';

export const TeamLeaveContent: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const rangeTo = format(new Date(), 'yyyy-MM-dd');
    const rangeFrom = format(subDays(new Date(), 29), 'yyyy-MM-dd');

    const canApprove = user?.role === 'ADMIN' || user?.role === 'HR' || user?.role === 'MANAGER';

    // Fetch leave types dynamically
    const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
        queryKey: ['leave-types'],
        queryFn: () => leaveService.getLeaveTypes(),
    });

    const { data: pendingApprovals = [], isLoading } = useQuery({
        queryKey: ['leaves', 'pending'],
        queryFn: () => leaveService.getPendingApprovals({ limit: 50 }),
        enabled: canApprove,
    });

    const { data: leaveSummary } = useQuery({
        queryKey: ['leaves', 'summary', rangeFrom, rangeTo],
        queryFn: () => leaveService.getLeaveSummary({ from_date: rangeFrom, to_date: rangeTo }),
        enabled: canApprove,
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => leaveService.approveLeave(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            queryClient.invalidateQueries({ queryKey: ['leaves', 'summary'] });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => leaveService.rejectLeave(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            queryClient.invalidateQueries({ queryKey: ['leaves', 'summary'] });
        },
    });

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

    if (!canApprove) return <div>Access Denied</div>;

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

            <Card>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Approvals</h3>

                    {/* Filters */}
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                            />
                        </div>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
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

                {isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    </div>
                ) : filteredPendingApprovals.length === 0 ? (
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
                                        <td className="py-3 px-4 text-gray-600 dark:text-muted">{(leave as any).leave_type_name || leave.leave_type}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-muted">
                                            {format(new Date(leave.start_date), 'MMM dd')} -{' '}
                                            {format(new Date(leave.end_date), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-muted max-w-xs truncate">{leave.reason}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => approveMutation.mutate(leave.id)}
                                                    isLoading={approveMutation.isPending}
                                                    title="Approve"
                                                >
                                                    <CheckCircle className="text-green-600 hover:text-green-700" size={20} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        const reason = prompt('Rejection reason:');
                                                        if (reason) rejectMutation.mutate({ id: leave.id, reason });
                                                    }}
                                                    isLoading={rejectMutation.isPending}
                                                    title="Reject"
                                                >
                                                    <XCircle className="text-red-600 hover:text-red-700" size={20} />
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
        </div>
    );
};
