import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { delegationService, Delegation } from '@/services/leave.service';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Plus, Trash2, ArrowRight, Users, Shield, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/Dialog';
import api from '@/services/api';
import type { User } from '@/services/users.service';



export const DelegationContent: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [delegateSearch, setDelegateSearch] = useState('');
    const [selectedDelegate, setSelectedDelegate] = useState<User | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    // Fetch delegations I created
    const { data: myDelegations = [], isLoading: loadingMine } = useQuery({
        queryKey: ['delegations', 'my'],
        queryFn: () => delegationService.getMyDelegations(),
    });

    // Fetch delegations assigned to me
    const { data: delegationsToMe = [], isLoading: loadingToMe } = useQuery({
        queryKey: ['delegations', 'to-me'],
        queryFn: () => delegationService.getDelegationsToMe(),
    });

    // Fetch users for delegate selection
    const { data: employees = [] } = useQuery<User[]>({
        queryKey: ['users-delegation'],
        queryFn: async () => {
            try {
                const res = await api.get('/users', { params: { limit: 200 } });
                console.log('[Delegation] Raw API response:', res.data);
                const users = res.data?.users || res.data?.data || res.data || [];
                console.log('[Delegation] Parsed users:', users.length, 'items');
                if (Array.isArray(users)) {
                    return users.filter((u: any) => u.id !== user?.id);
                }
                return [];
            } catch (err) {
                console.error('[Delegation] Error fetching users:', err);
                return [];
            }
        },
        enabled: showCreateDialog,
    });

    const createMutation = useMutation({
        mutationFn: (data: { delegate_id: string; start_date: string; end_date: string; reason?: string }) =>
            delegationService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delegations'] });
            resetForm();
        },
    });

    const revokeMutation = useMutation({
        mutationFn: (id: string) => delegationService.revoke(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delegations'] });
        },
    });

    const resetForm = () => {
        setShowCreateDialog(false);
        setSelectedDelegate(null);
        setDelegateSearch('');
        setStartDate('');
        setEndDate('');
        setReason('');
    };

    const filteredEmployees = employees.filter(
        (e) =>
            delegateSearch.length >= 1 &&
            (`${e.first_name || ''} ${e.last_name || ''}`.toLowerCase().includes(delegateSearch.toLowerCase()) ||
                e.email?.toLowerCase().includes(delegateSearch.toLowerCase()))
    );

    const canSubmit = selectedDelegate && startDate && endDate && new Date(endDate) >= new Date(startDate);

    const todayStr = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-6">
            {/* Explanation Card */}
            <Card>
                <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">What are Delegations?</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            When you're away (on vacation, sick leave, etc.), you can delegate your leave approval authority to another manager.
                            That person will then be able to approve or reject leave requests from your direct reports during the delegation period.
                        </p>
                    </div>
                </div>
            </Card>

            {/* Action Button */}
            <div className="flex justify-end">
                <Button onClick={() => setShowCreateDialog(true)} size="md">
                    <Plus className="mr-2" size={18} />
                    Create Delegation
                </Button>
            </div>

            {/* My Delegations (created by me) */}
            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <ArrowRight className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Delegations</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">(Approval authority I've given to others)</span>
                </div>

                {loadingMine ? (
                    <div className="h-32 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                    </div>
                ) : myDelegations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No active delegations. Create one when you're going to be away.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Delegate</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Period</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {myDelegations.map((d: Delegation) => {
                                    const isActive = d.is_active && new Date(d.end_date) >= new Date(todayStr);
                                    return (
                                        <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                                                {[(d as any).delegate_first_name, (d as any).delegate_last_name].filter(Boolean).join(' ') || 'Unknown'}
                                                {d.delegate_email && (
                                                    <span className="block text-xs text-gray-500 dark:text-gray-400">{d.delegate_email}</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                {format(new Date(d.start_date), 'MMM dd')} — {format(new Date(d.end_date), 'MMM dd, yyyy')}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                                                {d.reason || '—'}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${isActive
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                                    }`}>
                                                    {isActive ? 'Active' : 'Expired'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {isActive && (
                                                    <button
                                                        onClick={() => revokeMutation.mutate(d.id)}
                                                        disabled={revokeMutation.isPending}
                                                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                                                        title="Revoke delegation"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Delegations To Me (given to me by others) */}
            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-accent-green" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delegated To Me</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">(Approval authority given to me by other managers)</span>
                </div>

                {loadingToMe ? (
                    <div className="h-32 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                    </div>
                ) : delegationsToMe.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Shield className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No one has delegated their approval authority to you.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Delegated By</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Period</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {delegationsToMe.map((d: Delegation) => {
                                    const isActive = d.is_active && new Date(d.end_date) >= new Date(todayStr);
                                    return (
                                        <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                                                {[(d as any).delegator_first_name, (d as any).delegator_last_name].filter(Boolean).join(' ') || 'Unknown'}
                                                {d.delegator_email && (
                                                    <span className="block text-xs text-gray-500 dark:text-gray-400">{d.delegator_email}</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                {format(new Date(d.start_date), 'MMM dd')} — {format(new Date(d.end_date), 'MMM dd, yyyy')}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate">
                                                {d.reason || '—'}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${isActive
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                                    }`}>
                                                    {isActive ? 'Active' : 'Expired'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Create Delegation Dialog */}
            <Dialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                title="Create Delegation"
                className="max-w-lg"
            >
                <div className="flex flex-col">
                    <DialogContent className="py-2 px-0">
                        {/* Info */}
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3 mb-4 flex items-start gap-2">
                            <AlertCircle size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-blue-800 dark:text-blue-400">
                                The selected person will be able to approve/reject leave requests from your direct reports during this period.
                            </p>
                        </div>

                        {/* Delegate Selector */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Delegate To *
                            </label>
                            {selectedDelegate ? (
                                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {selectedDelegate.first_name} {selectedDelegate.last_name}
                                        </p>
                                        {selectedDelegate.email && (
                                            <p className="text-xs text-gray-500">{selectedDelegate.email}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => { setSelectedDelegate(null); setDelegateSearch(''); }}
                                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                                    >
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search for a manager or HR..."
                                        value={delegateSearch}
                                        onChange={(e) => setDelegateSearch(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                    {filteredEmployees.length > 0 && (
                                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {filteredEmployees.slice(0, 8).map((emp) => (
                                                <button
                                                    key={emp.id}
                                                    onClick={() => {
                                                        setSelectedDelegate(emp);
                                                        setDelegateSearch('');
                                                    }}
                                                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                                                >
                                                    <span className="text-gray-900 dark:text-white font-medium">
                                                        {emp.first_name} {emp.last_name}
                                                    </span>
                                                    {emp.email && (
                                                        <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">{emp.email}</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Start Date *
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    min={todayStr}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    End Date *
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    min={startDate || todayStr}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Reason (Optional)
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="e.g., On vacation, attending conference..."
                            />
                        </div>
                    </DialogContent>

                    <DialogFooter className="px-0 pb-2 pt-4 border-t-0 flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={resetForm}
                            className="px-6 border-gray-300 dark:border-gray-600"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (canSubmit) {
                                    createMutation.mutate({
                                        delegate_id: selectedDelegate!.id,
                                        start_date: startDate,
                                        end_date: endDate,
                                        reason: reason || undefined,
                                    });
                                }
                            }}
                            isLoading={createMutation.isPending}
                            disabled={!canSubmit}
                            className="px-6"
                        >
                            Create Delegation
                        </Button>
                    </DialogFooter>
                </div>
            </Dialog>
        </div>
    );
};
