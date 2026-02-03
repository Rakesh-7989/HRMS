import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/utils/cn';
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

    const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');

    const { data: pendingApprovals = [], isLoading: pendingLoading } = useQuery({
        queryKey: ['leaves', 'pending'],
        queryFn: () => leaveService.getPendingApprovals({ limit: 50, status: 'PENDING' }),
        enabled: canApprove,
    });

    const { data: requestHistory = [], isLoading: historyLoading } = useQuery({
        queryKey: ['leaves', 'history', rangeFrom, rangeTo],
        queryFn: () => leaveService.getPendingApprovals({ limit: 50, status: 'APPROVED,REJECTED,CANCELLED', from_date: rangeFrom, to_date: rangeTo }),
        enabled: canApprove && activeTab === 'HISTORY',
    });

    const { data: leaveSummary } = useQuery({
        queryKey: ['leaves', 'summary', rangeFrom, rangeTo],
        queryFn: () => leaveService.getLeaveSummary({ from_date: rangeFrom, to_date: rangeTo }),
        enabled: canApprove,
    });

    const isLoading = activeTab === 'PENDING' ? pendingLoading : historyLoading;
    const currentList = activeTab === 'PENDING' ? pendingApprovals : requestHistory;

    const approveMutation = useMutation({
        mutationFn: (id: string) => leaveService.approveLeave(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            queryClient.invalidateQueries({ queryKey: ['leaves', 'summary'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => leaveService.rejectLeave(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            queryClient.invalidateQueries({ queryKey: ['leaves', 'summary'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });

    const filteredList = useMemo(() => {
        return currentList.filter((leave) => {
            const emp = leave.employee || (leave as any).user || (leave as any);
            const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
            const leaveTypeName = ((leave as any).leave_type_name || leave.leave_type || '').toLowerCase();

            const matchesSearch = searchTerm === '' ||
                fullName.includes(searchTerm.toLowerCase()) ||
                leaveTypeName.includes(searchTerm.toLowerCase()) ||
                leave.reason?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = typeFilter === 'ALL' ||
                leave.leave_type === typeFilter ||
                (leave as any).leave_type_name === typeFilter;

            return matchesSearch && matchesType;
        });
    }, [currentList, searchTerm, typeFilter]);

    if (!canApprove) return <div className="p-8 text-center bg-red-50 text-red-600 rounded-lg">Access Denied: Insufficient permissions</div>;

    return (
        <div className="space-y-6">
            {/* Analytics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total (30d)', value: leaveSummary?.total_applications || 0, accent: 'text-primary' },
                    { label: 'Pending', value: leaveSummary?.pending || 0, accent: 'text-yellow-500' },
                    { label: 'Approved (30d)', value: leaveSummary?.approved || 0, accent: 'text-accent-green' },
                    { label: 'Rejected (30d)', value: leaveSummary?.rejected || 0, accent: 'text-red-500' },
                ].map((card) => (
                    <Card key={card.label} className="p-4 border-l-4 border-l-primary/20 hover:shadow-md transition-shadow">
                        <p className="text-sm font-medium text-gray-500 dark:text-muted">{card.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${card.accent}`}>{card.value}</p>
                    </Card>
                ))}
            </div>

            <Card className="overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-1">
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab('PENDING')}
                            className={cn(
                                "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                                activeTab === 'PENDING'
                                    ? "bg-white dark:bg-gray-800 text-primary shadow-sm"
                                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            )}
                        >
                            Pending Approvals
                            {pendingApprovals.length > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-yellow-500 text-white rounded-full">
                                    {pendingApprovals.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('HISTORY')}
                            className={cn(
                                "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                                activeTab === 'HISTORY'
                                    ? "bg-white dark:bg-gray-800 text-primary shadow-sm"
                                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            )}
                        >
                            Request History
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {activeTab === 'PENDING' ? 'Action Required' : 'Processed Requests'}
                        </h3>

                        {/* Filters */}
                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by name or reason..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
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
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/20 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800">
                            <p className="text-gray-500 dark:text-muted">
                                {searchTerm || typeFilter !== 'ALL'
                                    ? 'No requests match your current filters'
                                    : activeTab === 'PENDING' ? 'Great! No pending leave requests' : 'No processed requests found'}
                            </p>
                        </div>
                    ) : (
                        <div className="relative overflow-hidden rounded-lg border border-gray-100 dark:border-gray-800">
                            <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                                <table className="w-full border-collapse">
                                    <thead className="sticky top-0 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-md z-20 shadow-sm">
                                        <tr className="border-b border-light-border dark:border-dark-border text-left">
                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration/Dates</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Approver</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                                            {activeTab === 'HISTORY' && (
                                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                            )}
                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {filteredList.map((leave) => {
                                            const emp = leave.employee || (leave as any).user || (leave as any);
                                            return (
                                                <tr key={leave.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                    <td className="py-4 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                                {(emp.first_name?.[0] || '') + (emp.last_name?.[0] || '')}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-900 dark:text-white">
                                                                    {emp.first_name} {emp.last_name}
                                                                </p>
                                                                <p className="text-[10px] text-gray-500">{emp.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-muted">
                                                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                                                            {(leave as any).leave_type_name || leave.leave_type}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-muted">
                                                        <div className="font-medium">{leave.days_count} days</div>
                                                        <div className="text-[10px]">
                                                            {format(new Date(leave.start_date), 'MMM dd')} - {format(new Date(leave.end_date), 'MMM dd, yyyy')}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-sm">
                                                        {(leave as any).manager_first_name ? (
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                                                    {(leave as any).manager_first_name} {(leave as any).manager_last_name}
                                                                </span>
                                                                <span className="text-[9px] text-muted uppercase tracking-tighter italic">Reporting Manager</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs italic">No Manager</span>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-muted max-w-xs">
                                                        <div className="truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all">
                                                            {leave.reason || '-'}
                                                        </div>
                                                    </td>
                                                    {activeTab === 'HISTORY' && (
                                                        <td className="py-4 px-4">
                                                            <span className={cn(
                                                                "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                                                leave.status === 'APPROVED' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                                    leave.status === 'REJECTED' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                                                        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                                            )}>
                                                                {leave.status}
                                                            </span>
                                                        </td>
                                                    )}
                                                    <td className="py-4 px-4 text-right">
                                                        {leave.status === 'PENDING' ? (
                                                            <div className="flex gap-1 justify-end">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    disabled={!(leave as any).can_approve || approveMutation.isPending}
                                                                    className={cn(
                                                                        "h-8 w-8 p-0",
                                                                        (leave as any).can_approve ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" : "opacity-30 cursor-not-allowed text-gray-400"
                                                                    )}
                                                                    onClick={() => approveMutation.mutate(leave.id)}
                                                                    isLoading={approveMutation.isPending}
                                                                    title={(leave as any).can_approve ? "Approve" : "Only the direct Reporting Manager can approve this leave."}
                                                                >
                                                                    <CheckCircle size={18} />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    disabled={!(leave as any).can_approve || rejectMutation.isPending}
                                                                    className={cn(
                                                                        "h-8 w-8 p-0",
                                                                        (leave as any).can_approve ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" : "opacity-30 cursor-not-allowed text-gray-400"
                                                                    )}
                                                                    onClick={() => {
                                                                        const reason = prompt('Enter rejection reason:');
                                                                        if (reason) rejectMutation.mutate({ id: leave.id, reason });
                                                                    }}
                                                                    isLoading={rejectMutation.isPending}
                                                                    title={(leave as any).can_approve ? "Reject" : "Only the direct Reporting Manager can reject this leave."}
                                                                >
                                                                    <XCircle size={18} />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 font-medium italic">
                                                                {format(new Date(leave.updated_at || leave.created_at), 'MMM dd')}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};
