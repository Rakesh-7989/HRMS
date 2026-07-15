import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/utils/toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { leaveService, LeaveType, LeavePolicy, CreateLeaveTypeData, CreatePolicyData } from '@/services/leave.service';
import { cn } from '@/utils/cn';
import { Plus, Pencil, Trash2, Check, X, RefreshCw, AlertCircle, FileText, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useTranslation } from 'react-i18next';

type TabType = 'types' | 'policies';

export const LeaveSettingsContent: React.FC = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { confirm } = useConfirm();
    const [activeTab, setActiveTab] = useState<TabType>('types');

    // Error state for displaying API errors
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Leave Types State
    const [typeDialogOpen, setTypeDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<LeaveType | null>(null);
    const [typeForm, setTypeForm] = useState<CreateLeaveTypeData>({
        name: '',
        code: '',
        description: '',
        is_paid: true,
        requires_approval: true,
        requires_attachment: false,
        min_days_notice: 0,
        max_consecutive_days: 0,
    });

    // Leave Policies State
    const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
    const [policyForm, setPolicyForm] = useState<CreatePolicyData>({
        name: '',
        description: '',
        leave_type_id: '',
        accrual_type: 'MONTHLY',
        accrual_rate: 0,
        is_probation_eligible: false,
        year_start_month: 1,
        priority: 100,
        carry_forward_enabled: false,
        max_carry_forward: 0,
    });

    // Queries
    const { data: leaveTypes = [], isLoading: typesLoading, refetch: refetchTypes } = useQuery({
        queryKey: ['leave-types'],
        queryFn: () => leaveService.getLeaveTypes(),
    });

    const { data: policies = [], isLoading: policiesLoading, refetch: refetchPolicies } = useQuery({
        queryKey: ['leave-policies'],
        queryFn: () => leaveService.getPolicies(),
    });

    // Leave Type Mutations
    const createTypeMutation = useMutation({
        mutationFn: (data: CreateLeaveTypeData) => leaveService.createLeaveType(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-types'] });
            setTypeDialogOpen(false);
            resetTypeForm();
            setErrorMessage(null);
            showToast.success(t('leaveSettings.leaveTypeCreated'));
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to create leave type');
            showToast.error(error.message || 'Failed to create leave type');
        },
    });

    const updateTypeMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreateLeaveTypeData> }) =>
            leaveService.updateLeaveType(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-types'] });
            setTypeDialogOpen(false);
            setEditingType(null);
            resetTypeForm();
            setErrorMessage(null);
            showToast.success(t('leaveSettings.leaveTypeUpdated'));
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to update leave type');
            showToast.error(error.message || 'Failed to update leave type');
        },
    });

    const deleteTypeMutation = useMutation({
        mutationFn: (id: string) => leaveService.deleteLeaveType(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-types'] });
            setErrorMessage(null);
            showToast.success(t('leaveSettings.leaveTypeDeleted'));
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to delete leave type');
            showToast.error(error.message || 'Failed to delete leave type');
        },
    });

    // Leave Policy Mutations
    const createPolicyMutation = useMutation({
        mutationFn: (data: CreatePolicyData) => leaveService.createPolicy(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-policies'] });
            setPolicyDialogOpen(false);
            resetPolicyForm();
            setErrorMessage(null);
            showToast.success(t('leaveSettings.policyCreated'));
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to create policy');
            showToast.error(error.message || 'Failed to create policy');
        },
    });

    const updatePolicyMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreatePolicyData> }) =>
            leaveService.updatePolicy(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-policies'] });
            setPolicyDialogOpen(false);
            setEditingPolicy(null);
            resetPolicyForm();
            setErrorMessage(null);
            showToast.success(t('leaveSettings.policyUpdated'));
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to update policy');
            showToast.error(error.message || 'Failed to update policy');
        },
    });

    const deletePolicyMutation = useMutation({
        mutationFn: (id: string) => leaveService.deletePolicy(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-policies'] });
            setErrorMessage(null);
            showToast.success(t('leaveSettings.policyDeleted'));
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to delete policy');
            showToast.error(error.message || 'Failed to delete policy');
        },
    });

    // Run Accrual Mutation
    const runAccrualMutation = useMutation({
        mutationFn: () => leaveService.runAccrual(),
        onSuccess: (data: { accruals_processed?: number }) => {
            queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            showToast.success(t('leaveSettings.allocationCompleted', { count: data.accruals_processed }));
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to run allocation');
            showToast.error(error.message || 'Failed to run allocation');
        },
    });

    const handleRunAccrual = async () => {
        const result = await confirm({
            title: t('leaveSettings.runAccrualConfirmTitle'),
            message: t('leaveSettings.runAccrualConfirmMessage'),
            type: 'destructive',
            confirmText: t('leaveSettings.runNow'),
            cancelText: t('leaveSettings.cancel')
        });
        if (result) {
            runAccrualMutation.mutate();
        }
    };

    // Form Reset Functions
    const resetTypeForm = () => {
        setTypeForm({
            name: '',
            code: '',
            description: '',
            is_paid: true,
            requires_approval: true,
            requires_attachment: false,
            min_days_notice: 0,
            max_consecutive_days: 0,
        });
        setEditingType(null);
    };

    const resetPolicyForm = () => {
        setPolicyForm({
            name: '',
            description: '',
            leave_type_id: '',
            accrual_type: 'MONTHLY',
            accrual_rate: 0,
            is_probation_eligible: false,
            year_start_month: 1,
            priority: 100,
            carry_forward_enabled: false,
            max_carry_forward: 0,
        });
        setEditingPolicy(null);
    };

    // Form Handlers
    const handleOpenTypeDialog = (type?: LeaveType) => {
        setErrorMessage(null);
        if (type) {
            setEditingType(type);
            setTypeForm({
                name: type.name,
                code: type.code,
                description: type.description || '',
                is_paid: type.is_paid,
                requires_approval: type.requires_approval !== false,
                requires_attachment: type.requires_attachment === true,
                min_days_notice: type.min_days_notice || 0,
                max_consecutive_days: type.max_consecutive_days || 0,
            });
        } else {
            resetTypeForm();
        }
        setTypeDialogOpen(true);
    };

    const handleOpenPolicyDialog = (policy?: LeavePolicy) => {
        setErrorMessage(null);
        if (policy) {
            setEditingPolicy(policy);
            setPolicyForm({
                name: policy.name,
                description: policy.description || '',
                leave_type_id: policy.leave_type_id,
                accrual_type: policy.accrual_type,
                accrual_rate: policy.accrual_rate,
                is_probation_eligible: policy.is_probation_eligible,
                year_start_month: policy.year_start_month,
                priority: policy.priority,
                carry_forward_enabled: policy.carry_forward_enabled,
                max_carry_forward: policy.max_carry_forward,
            });
        } else {
            resetPolicyForm();
        }
        setPolicyDialogOpen(true);
    };

    const handleSubmitType = (e: React.FormEvent) => {
        e.preventDefault();
        if (!typeForm.name.trim() || !typeForm.code.trim()) {
            setErrorMessage('Name and Code are required');
            return;
        }
        if (editingType) {
            updateTypeMutation.mutate({ id: editingType.id, data: typeForm });
        } else {
            createTypeMutation.mutate(typeForm);
        }
    };

    const handleSubmitPolicy = (e: React.FormEvent) => {
        e.preventDefault();
        if (!policyForm.name.trim() || !policyForm.leave_type_id || policyForm.accrual_rate === undefined) {
            setErrorMessage('Name, Leave Type, and Accrual Rate are required');
            return;
        }
        if (editingPolicy) {
            updatePolicyMutation.mutate({ id: editingPolicy.id, data: policyForm });
        } else {
            createPolicyMutation.mutate(policyForm);
        }
    };

    const handleDeleteType = async (id: string) => {
        if (!id) return;
        const result = await confirm({
            title: t('leaveSettings.deleteTypeTitle'),
            message: t('leaveSettings.deleteTypeMessage'),
            type: 'destructive',
            confirmText: t('leaveSettings.deleteType'),
            cancelText: t('leaveSettings.cancel')
        });
        if (result) {
            deleteTypeMutation.mutate(id);
        }
    };

    const handleDeletePolicy = async (id: string) => {
        if (!id) return;
        const result = await confirm({
            title: t('leaveSettings.deletePolicyTitle'),
            message: t('leaveSettings.deletePolicyMessage'),
            type: 'destructive',
            confirmText: t('leaveSettings.deletePolicy'),
            cancelText: t('leaveSettings.cancel')
        });
        if (result) {
            deletePolicyMutation.mutate(id);
        }
    };

    const handleCloseTypeDialog = () => {
        setTypeDialogOpen(false);
        resetTypeForm();
        setErrorMessage(null);
    };

    const handleClosePolicyDialog = () => {
        setPolicyDialogOpen(false);
        resetPolicyForm();
        setErrorMessage(null);
    };

    const tabs = [
        { id: 'types' as TabType, label: t('leaveSettings.leaveTypes'), icon: FileText },
        { id: 'policies' as TabType, label: t('leaveSettings.leavePolicies'), icon: ClipboardList },
    ];

    return (
        <div className="space-y-6">
            {/* Error Alert */}
            {errorMessage && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <p className="text-red-700 dark:text-red-400 text-sm">{errorMessage}</p>
                     <Button variant="ghost" 
                        onClick={() => setErrorMessage(null)}
                        className="ml-auto text-red-500 hover:text-red-700"
                    >
                        <X size={16} />
                    </Button>
                </div>
            )}

            {/* Tabs */}
            <Card className="p-0 overflow-hidden">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    {tabs.map((tab) => (
                         <Button variant="ghost" 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 -mb-px',
                                activeTab === tab.id
                                    ? 'border-brand-500 text-brand-500 bg-brand-500/5'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            )}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </Button>
                    ))}
                </div>
            </Card>

            {/* Leave Types Tab */}
            {activeTab === 'types' && (
                <Card>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('leaveSettings.leaveTypes')}</h2>
                            <p className="text-sm text-gray-500">{t('leaveSettings.defineLeaveCategories')}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => refetchTypes()}>
                                <RefreshCw size={16} className="mr-1" />
                                {t('leave.refresh')}
                            </Button>
                            <Button size="sm" onClick={() => handleOpenTypeDialog()}>
                                <Plus size={16} className="mr-1" />
                                {t('leaveSettings.addType')}
                            </Button>
                        </div>
                    </div>

                    {typesLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
                        </div>
                    ) : leaveTypes.length === 0 ? (
                        <div className="text-center py-12">
                            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('leaveSettings.noLeaveTypes')}</h3>
                            <p className="mt-1 text-sm text-gray-500">{t('leaveSettings.getStartedCreatingType')}</p>
                            <Button className="mt-4" onClick={() => handleOpenTypeDialog()}>
                                <Plus size={16} className="mr-1" />
                                {t('leaveSettings.addLeaveType')}
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('leaveSettings.name')}</TableHead>
                                    <TableHead>{t('leaveSettings.code')}</TableHead>
                                    <TableHead>{t('leaveSettings.paid')}</TableHead>
                                    <TableHead>{t('leaveSettings.notice')}</TableHead>
                                    <TableHead>{t('leaveSettings.maxDays')}</TableHead>
                                    <TableHead>{t('leaveSettings.attachment')}</TableHead>
                                    <TableHead>{t('leaveSettings.status')}</TableHead>
                                    <TableHead className="text-right">{t('leaveSettings.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leaveTypes.map((type) => (
                                    <TableRow key={type.id}>
                                        <TableCell className="font-medium">{type.name}</TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                                                {type.code}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {type.is_paid ? (
                                                <Check size={16} className="text-green-500" />
                                            ) : (
                                                <X size={16} className="text-gray-400" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {type.min_days_notice ? (
                                                <span className="text-sm">{type.min_days_notice}d</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {type.max_consecutive_days ? (
                                                <span className="text-sm">{type.max_consecutive_days}d</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {type.requires_attachment ? (
                                                <Check size={16} className="text-coral-500" />
                                            ) : (
                                                <X size={16} className="text-gray-400" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={cn(
                                                    'px-2 py-1 rounded text-xs font-medium',
                                                    type.is_active
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                                )}
                                            >
                                                {type.is_active ? t('leaveSettings.active') : t('leaveSettings.inactive')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenTypeDialog(type)}>
                                                    <Pencil size={14} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteType(type.id)}
                                                    className="text-red-500 hover:text-red-600"
                                                    disabled={deleteTypeMutation.isPending}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            )}

            {activeTab === 'policies' && (
                <Card>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('leaveSettings.leavePolicies')}</h2>
                            <p className="text-sm text-gray-500">{t('leaveSettings.autoAccrualRules')}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRunAccrual}
                                disabled={runAccrualMutation.isPending || policies.length === 0}
                                className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                            >
                                <RefreshCw size={16} className={cn("mr-1", runAccrualMutation.isPending && "animate-spin")} />
                                {t('leaveSettings.runAccrual')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => refetchPolicies()}>
                                <RefreshCw size={16} className="mr-1" />
                                {t('leave.refresh')}
                            </Button>
                            <Button size="sm" onClick={() => handleOpenPolicyDialog()} disabled={leaveTypes.length === 0}>
                                <Plus size={16} className="mr-1" />
                                {t('leaveSettings.addPolicy')}
                            </Button>
                        </div>
                    </div>

                    {leaveTypes.length === 0 && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                            <p className="text-yellow-700 dark:text-yellow-400 text-sm">
                                {t('leaveSettings.createFirstTypeWarning')}
                            </p>
                        </div>
                    )}

                    {policiesLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
                        </div>
                    ) : policies.length === 0 ? (
                        <div className="text-center py-12">
                            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('leaveSettings.noPolicies')}</h3>
                            <p className="mt-1 text-sm text-gray-500">{t('leaveSettings.createPoliciesDescription')}</p>
                            <Button className="mt-4" onClick={() => handleOpenPolicyDialog()} disabled={leaveTypes.length === 0}>
                                <Plus size={16} className="mr-1" />
                                {t('leaveSettings.addPolicy')}
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('leaveSettings.policy')}</TableHead>
                                    <TableHead>{t('leaveSettings.leaveType')}</TableHead>
                                    <TableHead>{t('leaveSettings.accrual')}</TableHead>
                                    <TableHead>{t('leaveSettings.carryForward')}</TableHead>
                                    <TableHead>{t('leaveSettings.probation')}</TableHead>
                                    <TableHead>{t('leaveSettings.status')}</TableHead>
                                    <TableHead className="text-right">{t('leaveSettings.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {policies.map((policy) => (
                                    <TableRow key={policy.id}>
                                        <TableCell className="font-medium">{policy.name}</TableCell>
                                        <TableCell>
                                            <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                                {(policy as { leave_type_name?: string }).leave_type_name || policy.leave_type?.name || 'N/A'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium">{policy.accrual_rate}</span>
                                            <span className="text-xs text-gray-500 ml-1">
                                                /{policy.accrual_type === 'MONTHLY' ? t('leaveSettings.mo') : policy.accrual_type === 'YEARLY' ? t('leaveSettings.yr') : t('leaveSettings.fixed').toLowerCase()}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {policy.carry_forward_enabled ? (
                                                <div className="flex flex-col">
                                                    <span className="text-green-600 flex items-center gap-1">
                                                        <Check size={12} /> {t('leaveSettings.enabled')}
                                                    </span>
                                                    {policy.max_carry_forward > 0 && (
                                                        <span className="text-[10px] text-gray-500">{t('leaveSettings.max', { val: policy.max_carry_forward })}</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">{t('leaveSettings.disabled')}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {policy.is_probation_eligible ? (
                                                <Check size={16} className="text-green-500" />
                                            ) : (
                                                <X size={16} className="text-gray-400" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={cn(
                                                    'px-2 py-1 rounded text-xs font-medium',
                                                    policy.is_active
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                                )}
                                            >
                                                {policy.is_active ? t('leaveSettings.active') : t('leaveSettings.inactive')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenPolicyDialog(policy)}>
                                                    <Pencil size={14} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeletePolicy(policy.id)}
                                                    className="text-red-500 hover:text-red-600"
                                                    disabled={deletePolicyMutation.isPending}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            )}

            <Dialog
                open={typeDialogOpen}
                onOpenChange={handleCloseTypeDialog}
                title={editingType ? t('leaveSettings.editLeaveType') : t('leaveSettings.addLeaveType')}
                className="max-w-md"
            >
                <form onSubmit={handleSubmitType}>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="type-name" className="block mb-1.5">{t('leaveSettings.nameAsterisk')}</Label>
                            <Input
                                id="type-name"
                                value={typeForm.name}
                                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                                placeholder={t('leaveSettings.namePlaceholder')}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="type-code" className="block mb-1.5">{t('leaveSettings.codeAsterisk')}</Label>
                            <Input
                                id="type-code"
                                value={typeForm.code}
                                onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })}
                                placeholder={t('leaveSettings.codePlaceholder')}
                                className="uppercase"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="type-description" className="block mb-1.5">{t('leaveSettings.description')}</Label>
                            <Input
                                id="type-description"
                                value={typeForm.description}
                                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                                placeholder={t('leaveSettings.descriptionPlaceholder')}
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={typeForm.is_paid}
                                    onChange={(e) => setTypeForm({ ...typeForm, is_paid: e.target.checked })}
                                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500/50"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{t('leaveSettings.paidLeave')}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={typeForm.requires_approval}
                                    onChange={(e) => setTypeForm({ ...typeForm, requires_approval: e.target.checked })}
                                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500/50"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{t('leaveSettings.requiresApproval')}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={typeForm.requires_attachment}
                                    onChange={(e) => setTypeForm({ ...typeForm, requires_attachment: e.target.checked })}
                                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500/50"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{t('leaveSettings.requiresAttachment')}</span>
                            </label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="type-min-notice" className="block mb-1.5">{t('leaveSettings.minDaysNotice')}</Label>
                                <Input
                                    id="type-min-notice"
                                    type="number"
                                    value={typeForm.min_days_notice}
                                    onChange={(e) => setTypeForm({ ...typeForm, min_days_notice: Number(e.target.value) })}
                                    min={0}
                                />
                            </div>
                            <div>
                                <Label htmlFor="type-max-consecutive" className="block mb-1.5">{t('leaveSettings.maxConsecutiveDays')}</Label>
                                <Input
                                    id="type-max-consecutive"
                                    type="number"
                                    value={typeForm.max_consecutive_days}
                                    onChange={(e) => setTypeForm({ ...typeForm, max_consecutive_days: Number(e.target.value) })}
                                    min={0}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={handleCloseTypeDialog}>
                            {t('leaveSettings.cancel')}
                        </Button>
                        <Button type="submit" isLoading={createTypeMutation.isPending || updateTypeMutation.isPending}>
                            {editingType ? t('leaveSettings.update') : t('leaveSettings.create')}
                        </Button>
                    </div>
                </form>
            </Dialog>

            <Dialog
                open={policyDialogOpen}
                onOpenChange={handleClosePolicyDialog}
                title={editingPolicy ? t('leaveSettings.editLeavePolicy') : t('leaveSettings.addLeavePolicy')}
                className="max-w-2xl"
            >
                <form onSubmit={handleSubmitPolicy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Label htmlFor="policy-name" className="block mb-1.5">{t('leaveSettings.policyNameAsterisk')}</Label>
                            <Input
                                id="policy-name"
                                value={policyForm.name}
                                onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                                placeholder={t('leaveSettings.policyNamePlaceholder')}
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="policy-description" className="block mb-1.5">{t('leaveSettings.description')}</Label>
                            <Input
                                id="policy-description"
                                value={policyForm.description}
                                onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
                                placeholder={t('leaveSettings.policyDescPlaceholder')}
                            />
                        </div>
                        <div>
                            <Label htmlFor="policy-type" className="block mb-1.5">{t('leaveSettings.leaveTypeAsterisk')}</Label>
                            <select
                                id="policy-type"
                                value={policyForm.leave_type_id}
                                onChange={(e) => setPolicyForm({ ...policyForm, leave_type_id: e.target.value })}
                                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                required
                            >
                                <option value="">{t('leaveSettings.selectLeaveType')}</option>
                                {leaveTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="policy-accrual-type" className="block mb-1.5">{t('leaveSettings.accrualType')}</Label>
                            <select
                                id="policy-accrual-type"
                                value={policyForm.accrual_type}
                                onChange={(e) => setPolicyForm({ ...policyForm, accrual_type: e.target.value as 'MONTHLY' | 'YEARLY' | 'FIXED' })}
                                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                            >
                                <option value="MONTHLY">{t('leaveSettings.monthly')}</option>
                                <option value="YEARLY">{t('leaveSettings.yearly')}</option>
                                <option value="FIXED">{t('leaveSettings.fixed')}</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="policy-rate" className="block mb-1.5">{t('leaveSettings.accrualRate')}</Label>
                            <Input
                                id="policy-rate"
                                type="number"
                                step="0.5"
                                value={policyForm.accrual_rate}
                                onChange={(e) => setPolicyForm({ ...policyForm, accrual_rate: Number(e.target.value) })}
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {t('leaveSettings.accrualRateDesc')}
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="policy-year-start" className="block mb-1.5">{t('leaveSettings.cycleStartMonth')}</Label>
                            <select
                                id="policy-year-start"
                                value={policyForm.year_start_month}
                                onChange={(e) => setPolicyForm({ ...policyForm, year_start_month: Number(e.target.value) })}
                                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                    <option key={m} value={m}>
                                        {format(new Date(2000, m - 1, 1), 'MMMM')}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2 pt-2 space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={policyForm.is_probation_eligible}
                                    onChange={(e) => setPolicyForm({ ...policyForm, is_probation_eligible: e.target.checked })}
                                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500/50"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {t('leaveSettings.probationEligible')}
                                </span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={policyForm.carry_forward_enabled}
                                    onChange={(e) => setPolicyForm({ ...policyForm, carry_forward_enabled: e.target.checked })}
                                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500/50"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {t('leaveSettings.enableCarryForward')}
                                </span>
                            </label>
                        </div>
                        {policyForm.carry_forward_enabled && (
                            <div>
                                <Label htmlFor="policy-max-carry" className="block mb-1.5">{t('leaveSettings.maxCarryForward')}</Label>
                                <Input
                                    id="policy-max-carry"
                                    type="number"
                                    step="0.1"
                                    value={policyForm.max_carry_forward}
                                    onChange={(e) => setPolicyForm({ ...policyForm, max_carry_forward: Number(e.target.value) })}
                                    placeholder={t('leaveSettings.maxCarryForwardPlaceholder')}
                                />
                                <p className="text-[10px] text-gray-500 mt-1">{t('leaveSettings.maxCarryForwardDesc')}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={handleClosePolicyDialog}>
                            {t('leaveSettings.cancel')}
                        </Button>
                        <Button type="submit" isLoading={createPolicyMutation.isPending || updatePolicyMutation.isPending}>
                            {editingPolicy ? t('leaveSettings.update') : t('leaveSettings.create')}
                        </Button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
};
export default LeaveSettingsContent;
