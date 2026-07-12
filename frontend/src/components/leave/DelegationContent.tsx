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
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/ui/DataTable';

export const DelegationContent: React.FC = () => {
    const { t } = useTranslation();
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
                const users = res.data?.users || res.data?.data || res.data || [];
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
                    <Shield className="h-5 w-5 text-brand-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('delegation.whatAreDelegations')}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {t('delegation.delegationsDesc')}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Action Button */}
            <div className="flex justify-end">
                <Button onClick={() => setShowCreateDialog(true)} size="md">
                    <Plus className="mr-2" size={18} />
                    {t('delegation.createDelegation')}
                </Button>
            </div>

            {/* My Delegations (created by me) */}
            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <ArrowRight className="h-5 w-5 text-brand-500" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('delegation.myDelegations')}</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('delegation.myDelegationsDesc')}</span>
                </div>
                <DataTable
                    columns={[
                        {
                            header: t('delegation.delegate'),
                            accessor: (row: Delegation) => (
                                <div>
                                    <span className="text-gray-900 dark:text-white">
                                        {[(row as any).delegate_first_name, (row as any).delegate_last_name].filter(Boolean).join(' ') || t('delegation.unknown')}
                                    </span>
                                    {row.delegate_email && (
                                        <span className="block text-xs text-gray-500 dark:text-gray-400">{row.delegate_email}</span>
                                    )}
                                </div>
                            ),
                            sortKey: 'delegate_first_name',
                        },
                        {
                            header: t('delegation.period'),
                            accessor: (row: Delegation) => `${format(new Date(row.start_date), 'MMM dd')} — ${format(new Date(row.end_date), 'MMM dd, yyyy')}`,
                            sortKey: 'start_date',
                        },
                        { header: t('delegation.reason'), accessor: (row: Delegation) => row.reason || '—' },
                        {
                            header: t('delegation.status'),
                            accessor: (row: Delegation) => {
                                const isActive = row.is_active && new Date(row.end_date) >= new Date(todayStr);
                                return (
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${isActive
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                        }`}>
                                        {isActive ? t('delegation.active') : t('delegation.expired')}
                                    </span>
                                );
                            },
                            sortKey: 'is_active',
                        },
                        {
                            header: t('delegation.actions'),
                            accessor: (row: Delegation) => {
                                const isActive = row.is_active && new Date(row.end_date) >= new Date(todayStr);
                                return isActive ? (
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => revokeMutation.mutate(row.id)}
                                            disabled={revokeMutation.isPending}
                                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                                            title={t('delegation.revokeDelegation')}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ) : null;
                            },
                        },
                    ]}
                    data={myDelegations}
                    isLoading={loadingMine}
                    emptyMessage={t('delegation.noActiveDelegations')}
                    pageSize={10}
                />
            </Card>

            {/* Delegations To Me (given to me by others) */}
            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-accent-green" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('delegation.delegatedToMe')}</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('delegation.delegatedToMeDesc')}</span>
                </div>
                <DataTable
                    columns={[
                        {
                            header: t('delegation.delegatedBy'),
                            accessor: (row: Delegation) => (
                                <div>
                                    <span className="text-gray-900 dark:text-white">
                                        {[(row as any).delegator_first_name, (row as any).delegator_last_name].filter(Boolean).join(' ') || t('delegation.unknown')}
                                    </span>
                                    {row.delegator_email && (
                                        <span className="block text-xs text-gray-500 dark:text-gray-400">{row.delegator_email}</span>
                                    )}
                                </div>
                            ),
                            sortKey: 'delegator_first_name',
                        },
                        {
                            header: t('delegation.period'),
                            accessor: (row: Delegation) => `${format(new Date(row.start_date), 'MMM dd')} — ${format(new Date(row.end_date), 'MMM dd, yyyy')}`,
                            sortKey: 'start_date',
                        },
                        { header: t('delegation.reason'), accessor: (row: Delegation) => row.reason || '—' },
                        {
                            header: t('delegation.status'),
                            accessor: (row: Delegation) => {
                                const isActive = row.is_active && new Date(row.end_date) >= new Date(todayStr);
                                return (
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${isActive
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                        }`}>
                                        {isActive ? t('delegation.active') : t('delegation.expired')}
                                    </span>
                                );
                            },
                            sortKey: 'is_active',
                        },
                    ]}
                    data={delegationsToMe}
                    isLoading={loadingToMe}
                    emptyMessage={t('delegation.noOneDelegated')}
                    pageSize={10}
                />
            </Card>

            {/* Create Delegation Dialog */}
            <Dialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                title={t('delegation.createDelegation')}
                className="max-w-lg"
            >
                <div className="flex flex-col">
                    <DialogContent className="py-2 px-0">
                        {/* Info */}
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3 mb-4 flex items-start gap-2">
                            <AlertCircle size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-blue-800 dark:text-blue-400">
                                {t('delegation.dialogInfo')}
                            </p>
                        </div>

                        {/* Delegate Selector */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                {t('delegation.delegateToAsterisk')}
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
                                        {t('delegation.change')}
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder={t('delegation.searchDelegatePlaceholder')}
                                        value={delegateSearch}
                                        onChange={(e) => setDelegateSearch(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500/50 focus:border-transparent"
                                    />
                                    {filteredEmployees.length > 0 && (
                                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-elev-4 max-h-48 overflow-y-auto">
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
                                    {t('delegation.startDateAsterisk')}
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    min={todayStr}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500/50 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    {t('delegation.endDateAsterisk')}
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    min={startDate || todayStr}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500/50 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                {t('delegation.reasonOptional')}
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500/50 focus:border-transparent"
                                placeholder={t('delegation.reasonPlaceholder')}
                            />
                        </div>
                    </DialogContent>

                    <DialogFooter className="px-0 pb-2 pt-4 border-t-0 flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={resetForm}
                            className="px-6 border-gray-300 dark:border-gray-600"
                        >
                            {t('delegation.cancel')}
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
                            {t('delegation.createDelegation')}
                        </Button>
                    </DialogFooter>
                </div>
            </Dialog>
        </div>
    );
};
