import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { leaveService, LeaveType, LeavePolicy, CreateLeaveTypeData, CreatePolicyData, UpdatePolicyData, CreateHolidayData } from '@/services/leave.service';
import { cn } from '@/utils/cn';
import { Skeleton } from '@/components/ui/Skeleton';
import { Plus, Pencil, Trash2, Check, X, Calendar, FileText, ClipboardList, RefreshCw, AlertCircle, Power } from 'lucide-react';
import { format } from 'date-fns';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useTranslation } from 'react-i18next';

type TabType = 'types' | 'policies' | 'holidays';

export const LeaveSettingsPage: React.FC = () => {
  const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { confirm, alert: showAlert } = useConfirm();
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
        min_tenure_months: 0,
        max_balance: null,
        year_start_month: 1,
        priority: 100,
    });

    // Holidays State
    const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
    const [holidayForm, setHolidayForm] = useState<CreateHolidayData>({
        name: '',
        date: '',
        description: '',
        is_optional: false,
        is_paid: true,
    });
    const [holidayYear, setHolidayYear] = useState(new Date().getFullYear());

    // Queries
    const { data: leaveTypes = [], isLoading: typesLoading, refetch: refetchTypes } = useQuery({
        queryKey: ['leave-types'],
        queryFn: () => leaveService.getLeaveTypes(),
    });

    const { data: policies = [], isLoading: policiesLoading, refetch: refetchPolicies } = useQuery({
        queryKey: ['leave-policies'],
        queryFn: () => leaveService.getPolicies(),
    });

    const { data: holidays = [], isLoading: holidaysLoading, refetch: refetchHolidays } = useQuery({
        queryKey: ['holidays', holidayYear],
        queryFn: () => leaveService.getPublicHolidays({ year: holidayYear }),
    });

    // Leave Type Mutations
    const createTypeMutation = useMutation({
        mutationFn: (data: CreateLeaveTypeData) => leaveService.createLeaveType(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-types'] });
            setTypeDialogOpen(false);
            resetTypeForm();
            setErrorMessage(null);
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to create leave type');
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
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to update leave type');
        },
    });

    const deleteTypeMutation = useMutation({
        mutationFn: (id: string) => leaveService.deleteLeaveType(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-types'] });
            setErrorMessage(null);
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to delete leave type');
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
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to create policy');
        },
    });

    const updatePolicyMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdatePolicyData }) =>
            leaveService.updatePolicy(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-policies'] });
            setPolicyDialogOpen(false);
            setEditingPolicy(null);
            resetPolicyForm();
            setErrorMessage(null);
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to update policy');
        },
    });

    const deletePolicyMutation = useMutation({
        mutationFn: (id: string) => leaveService.deletePolicy(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-policies'] });
            setErrorMessage(null);
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to delete policy');
        },
    });

    // Holiday Mutations
    const createHolidayMutation = useMutation({
        mutationFn: (data: CreateHolidayData) => leaveService.createPublicHoliday(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
            setHolidayDialogOpen(false);
            resetHolidayForm();
            setErrorMessage(null);
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to create holiday');
        },
    });

    const deleteHolidayMutation = useMutation({
        mutationFn: (id: string) => leaveService.deletePublicHoliday(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
            setErrorMessage(null);
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to delete holiday');
        },
    });

    // Run Accrual Mutation
    const runAccrualMutation = useMutation({
        mutationFn: () => leaveService.runAccrual(),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
            showAlert({
                title: 'Accrual Processed',
                message: `Accrual run successfully! Processed ${data.accruals_processed} records.`,
                confirmText: 'Great'
            });
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to run accrual');
        },
    });

    const handleRunAccrual = async () => {
        const result = await confirm({
            title: 'Run Leave Accrual',
            message: 'Are you sure you want to run monthly allocation for all employees? This will add leave credits based on policies.',
            confirmText: 'Run Now',
            cancelText: 'Cancel'
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
            min_tenure_months: 0,
            max_balance: null,
            year_start_month: 1,
            priority: 100,
        });
        setEditingPolicy(null);
    };

    const resetHolidayForm = () => {
        setHolidayForm({
            name: '',
            date: '',
            description: '',
            is_optional: false,
            is_paid: true,
        });
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
                min_tenure_months: policy.min_tenure_months,
                max_balance: policy.max_balance,
                year_start_month: policy.year_start_month,
                priority: policy.priority,
            });
        } else {
            resetPolicyForm();
        }
        setPolicyDialogOpen(true);
    };

    const handleOpenHolidayDialog = () => {
        setErrorMessage(null);
        resetHolidayForm();
        setHolidayDialogOpen(true);
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

    const handleSubmitHoliday = (e: React.FormEvent) => {
        e.preventDefault();
        if (!holidayForm.name.trim() || !holidayForm.date) {
            setErrorMessage('Holiday Name and Date are required');
            return;
        }
        createHolidayMutation.mutate(holidayForm);
    };

    const handleDeleteType = async (id: string) => {
        const type = leaveTypes.find(t => t.id === id);
        const result = await confirm({
            title: 'Delete Leave Type',
            message: `Are you sure you want to delete "${type?.name || 'this leave type'}"? This action cannot be undone and may affect existing leave records.`,
            type: 'destructive',
            confirmText: 'Delete',
            cancelText: 'Cancel'
        });
        if (result) {
            deleteTypeMutation.mutate(id);
        }
    };

    const handleDeletePolicy = async (id: string) => {
        const policy = policies.find(p => p.id === id);
        const result = await confirm({
            title: 'Delete Policy',
            message: `Are you sure you want to delete "${policy?.name || 'this policy'}"? This action cannot be undone.`,
            type: 'destructive',
            confirmText: 'Delete',
            cancelText: 'Cancel'
        });
        if (result) {
            deletePolicyMutation.mutate(id);
        }
    };

    const handleDeleteHoliday = async (id: string) => {
        const holiday = holidays.find(h => h.id === id);
        const result = await confirm({
            title: 'Delete Holiday',
            message: `Are you sure you want to delete "${holiday?.name || 'this holiday'}"?`,
            type: 'destructive',
            confirmText: 'Delete',
            cancelText: 'Cancel'
        });
        if (result) {
            deleteHolidayMutation.mutate(id);
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

    const handleCloseHolidayDialog = () => {
        setHolidayDialogOpen(false);
        resetHolidayForm();
        setErrorMessage(null);
    };

    const tabs = [
        { id: 'types' as TabType, label: 'Leave Types', icon: FileText },
        { id: 'policies' as TabType, label: 'Leave Policies', icon: ClipboardList },
        { id: 'holidays' as TabType, label: 'Holidays', icon: Calendar },
    ];

    return (
        <DashboardLayout
            title={t('leave.tabs.settings')}
            breadcrumbs={[
                { label: t('common.breadcrumbs.dashboard'), href: '/dashboard/organization' },
                { label: t('common.breadcrumbs.leave'), href: '/leave' },
                { label: t('common.breadcrumbs.settings') },
            ]}
        >
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
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Leave Types</h2>
                                <p className="text-sm text-gray-500">Define leave categories (Annual, Sick, etc.)</p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => refetchTypes()}>
                                    <RefreshCw size={16} className="mr-1" />
                                    Refresh
                                </Button>
                                <Button size="sm" onClick={() => handleOpenTypeDialog()}>
                                    <Plus size={16} className="mr-1" />
                                    Add Type
                                </Button>
                            </div>
                        </div>

                        {typesLoading ? (
                            <div className="space-y-3 py-6">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="flex gap-4 py-3 border-b border-gray-100 dark:border-gray-800">
                                        <Skeleton variant="text" width="20%" />
                                        <Skeleton variant="text" width="15%" />
                                        <Skeleton variant="text" width="15%" />
                                        <Skeleton variant="text" width="15%" />
                                    </div>
                                ))}
                            </div>
                        ) : leaveTypes.length === 0 ? (
                            <div className="text-center py-12">
                                <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No leave types</h3>
                                <p className="mt-1 text-sm text-gray-500">Get started by creating a new leave type.</p>
                                <Button className="mt-4" onClick={() => handleOpenTypeDialog()}>
                                    <Plus size={16} className="mr-1" />
                                    Add Leave Type
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Paid</TableHead>
                                        <TableHead>Notice</TableHead>
                                        <TableHead>Max Days</TableHead>
                                        <TableHead>Attachment</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
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
                                                    {type.is_active ? 'Active' : 'Inactive'}
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

                {/* Leave Policies Tab */}
                {activeTab === 'policies' && (
                    <Card>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Leave Policies</h2>
                                <p className="text-sm text-gray-500">Auto-accrual rules (monthly/yearly)</p>
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
                                    Run Accrual
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => refetchPolicies()}>
                                    <RefreshCw size={16} className="mr-1" />
                                    Refresh
                                </Button>
                                <Button size="sm" onClick={() => handleOpenPolicyDialog()} disabled={leaveTypes.length === 0}>
                                    <Plus size={16} className="mr-1" />
                                    Add Policy
                                </Button>
                            </div>
                        </div>

                        {leaveTypes.length === 0 && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                                <p className="text-yellow-700 dark:text-yellow-400 text-sm">
                                    You need to create at least one leave type before creating a policy.
                                </p>
                            </div>
                        )}

                        {policiesLoading ? (
                            <div className="space-y-3 py-6">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="flex gap-4 py-3 border-b border-gray-100 dark:border-gray-800">
                                        <Skeleton variant="text" width="25%" />
                                        <Skeleton variant="text" width="15%" />
                                        <Skeleton variant="text" width="15%" />
                                        <Skeleton variant="text" width="15%" />
                                    </div>
                                ))}
                            </div>
                        ) : policies.length === 0 ? (
                            <div className="text-center py-12">
                                <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No policies</h3>
                                <p className="mt-1 text-sm text-gray-500">Create leave policies to define entitlements.</p>
                                <Button className="mt-4" onClick={() => handleOpenPolicyDialog()} disabled={leaveTypes.length === 0}>
                                    <Plus size={16} className="mr-1" />
                                    Add Policy
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Policy</TableHead>
                                        <TableHead>Leave Type</TableHead>
                                        <TableHead>Accrual</TableHead>
                                        <TableHead>Max Balance</TableHead>
                                        <TableHead>Min Tenure</TableHead>
                                        <TableHead>Probation</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {policies.map((policy) => (
                                        <TableRow key={policy.id}>
                                            <TableCell className="font-medium">{policy.name}</TableCell>
                                            <TableCell>
                                                <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                                    {(policy as any).leave_type_name || policy.leave_type?.name || 'N/A'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-medium">{policy.accrual_rate}</span>
                                                <span className="text-xs text-gray-500 ml-1">
                                                    /{policy.accrual_type === 'MONTHLY' ? 'mo' : policy.accrual_type === 'YEARLY' ? 'yr' : 'fixed'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {policy.max_balance ? (
                                                    <span>{policy.max_balance}d</span>
                                                ) : (
                                                    <span className="text-gray-400">∞</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {policy.min_tenure_months ? (
                                                    <span>{policy.min_tenure_months}mo</span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
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
                                                    {policy.is_active ? 'Active' : 'Inactive'}
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
                                                        onClick={() => updatePolicyMutation.mutate({
                                                            id: policy.id,
                                                            data: { is_active: !policy.is_active }
                                                        })}
                                                        className={policy.is_active ? "text-orange-500 hover:text-orange-600" : "text-green-500 hover:text-green-600"}
                                                        disabled={updatePolicyMutation.isPending}
                                                        title={policy.is_active ? "Deactivate" : "Activate"}
                                                    >
                                                        <Power size={14} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeletePolicy(policy.id)}
                                                        className="text-red-500 hover:text-red-600"
                                                        disabled={deletePolicyMutation.isPending}
                                                        title="Delete Permanently"
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

                {/* Holidays Tab */}
                {activeTab === 'holidays' && (
                    <Card>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Public Holidays</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Manage public holidays for your organization
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={holidayYear}
                                    onChange={(e) => setHolidayYear(Number(e.target.value))}
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                                >
                                    {[...Array(5)].map((_, i) => {
                                        const year = new Date().getFullYear() + i - 1;
                                        return <option key={year} value={year}>{year}</option>;
                                    })}
                                </select>
                                <Button variant="outline" size="sm" onClick={() => refetchHolidays()}>
                                    <RefreshCw size={16} className="mr-1" />
                                    Refresh
                                </Button>
                                <Button size="sm" onClick={handleOpenHolidayDialog}>
                                    <Plus size={16} className="mr-1" />
                                    Add Holiday
                                </Button>
                            </div>
                        </div>

                        {holidaysLoading ? (
                            <div className="space-y-3 py-6">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 rounded-lg border bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                                        <Skeleton variant="rectangular" width={56} height={56} className="rounded-lg" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton variant="text" width="40%" />
                                            <Skeleton variant="text" width="60%" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : holidays.length === 0 ? (
                            <div className="text-center py-12">
                                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No holidays for {holidayYear}</h3>
                                <p className="mt-1 text-sm text-gray-500">Add public holidays for your organization.</p>
                                <Button className="mt-4" onClick={handleOpenHolidayDialog}>
                                    <Plus size={16} className="mr-1" />
                                    Add Holiday
                                </Button>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {holidays
                                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                    .map((holiday) => (
                                        <div
                                            key={holiday.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-center justify-center w-14 h-14 bg-brand-500/10 rounded-lg">
                                                    <span className="text-xs text-brand-500 font-medium">
                                                        {format(new Date(holiday.date), 'MMM')}
                                                    </span>
                                                    <span className="text-lg font-bold text-brand-500">
                                                        {format(new Date(holiday.date), 'dd')}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-gray-900 dark:text-white">{holiday.name}</h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {format(new Date(holiday.date), 'EEEE, MMMM d, yyyy')}
                                                    </p>
                                                    {holiday.description && (
                                                        <p className="text-xs text-gray-400 mt-1">{holiday.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {holiday.is_optional && (
                                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded text-xs">
                                                        Optional
                                                    </span>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteHoliday(holiday.id)}
                                                    className="text-red-500 hover:text-red-600"
                                                    disabled={deleteHolidayMutation.isPending}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </Card>
                )}

                {/* Leave Type Dialog */}
                <Dialog
                    open={typeDialogOpen}
                    onOpenChange={handleCloseTypeDialog}
                    title={editingType ? 'Edit Leave Type' : 'Add Leave Type'}
                    className="max-w-md"
                >
                    <form onSubmit={handleSubmitType}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="type-name" className="block mb-1.5">Name *</Label>
                                <Input
                                    id="type-name"
                                    value={typeForm.name}
                                    onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                                    placeholder="e.g., Annual Leave"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="type-code" className="block mb-1.5">Code *</Label>
                                <Input
                                    id="type-code"
                                    value={typeForm.code}
                                    onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })}
                                    placeholder="e.g., AL"
                                    className="uppercase"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="type-description" className="block mb-1.5">Description</Label>
                                <Input
                                    id="type-description"
                                    value={typeForm.description}
                                    onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                                    placeholder="Brief description of the leave type"
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
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Paid Leave</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={typeForm.requires_approval}
                                        onChange={(e) => setTypeForm({ ...typeForm, requires_approval: e.target.checked })}
                                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500/50"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Requires Approval</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={typeForm.requires_attachment}
                                        onChange={(e) => setTypeForm({ ...typeForm, requires_attachment: e.target.checked })}
                                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500/50"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Requires Attachment</span>
                                </label>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="type-min-notice" className="block mb-1.5">Min Days Notice</Label>
                                    <Input
                                        id="type-min-notice"
                                        type="number"
                                        value={typeForm.min_days_notice}
                                        onChange={(e) => setTypeForm({ ...typeForm, min_days_notice: Number(e.target.value) })}
                                        min={0}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="type-max-consecutive" className="block mb-1.5">Max Consecutive Days</Label>
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
                        <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                            <Button type="button" variant="ghost" onClick={handleCloseTypeDialog}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                isLoading={createTypeMutation.isPending || updateTypeMutation.isPending}
                            >
                                {editingType ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </Dialog>

                {/* Leave Policy Dialog */}
                <Dialog
                    open={policyDialogOpen}
                    onOpenChange={handleClosePolicyDialog}
                    title={editingPolicy ? 'Edit Leave Policy' : 'Add Leave Policy'}
                    className="max-w-lg"
                >
                    <form onSubmit={handleSubmitPolicy}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="policy-name" className="block mb-1.5">Policy Name *</Label>
                                <Input
                                    id="policy-name"
                                    value={policyForm.name}
                                    onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                                    placeholder="e.g., Standard Annual Leave Policy"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="policy-type" className="block mb-1.5">Leave Type *</Label>
                                <select
                                    id="policy-type"
                                    value={policyForm.leave_type_id}
                                    onChange={(e) => setPolicyForm({ ...policyForm, leave_type_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    required
                                >
                                    <option value="">Select a leave type</option>
                                    {leaveTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.name} ({type.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="policy-accrual-rate" className="block mb-1.5">Accrual Rate (days) *</Label>
                                    <Input
                                        id="policy-accrual-rate"
                                        type="number"
                                        step="0.01"
                                        value={policyForm.accrual_rate}
                                        onChange={(e) => setPolicyForm({ ...policyForm, accrual_rate: Number(e.target.value) })}
                                        min={0}
                                        required
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Days accrued per cycle (e.g. 1.5 per month)</p>
                                </div>
                                <div>
                                    <Label htmlFor="policy-accrual" className="block mb-1.5">Accrual Type</Label>
                                    <select
                                        id="policy-accrual"
                                        value={policyForm.accrual_type}
                                        onChange={(e) => setPolicyForm({ ...policyForm, accrual_type: e.target.value as 'YEARLY' | 'MONTHLY' | 'FIXED' })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    >
                                        <option value="YEARLY">Yearly</option>
                                        <option value="MONTHLY">Monthly</option>
                                        <option value="FIXED">Fixed</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="policy-tenure" className="block mb-1.5">Min Tenure (mo)</Label>
                                    <Input
                                        id="policy-tenure"
                                        type="number"
                                        value={policyForm.min_tenure_months}
                                        onChange={(e) => setPolicyForm({ ...policyForm, min_tenure_months: Number(e.target.value) })}
                                        min={0}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="policy-max-balance" className="block mb-1.5">Max Balance</Label>
                                    <Input
                                        id="policy-max-balance"
                                        type="number"
                                        value={policyForm.max_balance || ''}
                                        onChange={(e) => setPolicyForm({ ...policyForm, max_balance: e.target.value ? Number(e.target.value) : null })}
                                        placeholder="None"
                                        min={0}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="policy-priority" className="block mb-1.5">Priority</Label>
                                    <Input
                                        id="policy-priority"
                                        type="number"
                                        value={policyForm.priority}
                                        onChange={(e) => setPolicyForm({ ...policyForm, priority: Number(e.target.value) })}
                                        min={1}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="policy-start-month" className="block mb-1.5">Year Start Month</Label>
                                    <select
                                        id="policy-start-month"
                                        value={policyForm.year_start_month}
                                        onChange={(e) => setPolicyForm({ ...policyForm, year_start_month: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    >
                                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                                            <option key={m} value={idx + 1}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col justify-end">
                                    <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                                        <input
                                            type="checkbox"
                                            checked={policyForm.is_probation_eligible}
                                            onChange={(e) => setPolicyForm({ ...policyForm, is_probation_eligible: e.target.checked })}
                                            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500/50"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Probation Eligible</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="policy-description" className="block mb-1.5">Description</Label>
                                <Input
                                    id="policy-description"
                                    value={policyForm.description}
                                    onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
                                    placeholder="Brief description of the policy"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                            <Button type="button" variant="ghost" onClick={handleClosePolicyDialog}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                isLoading={createPolicyMutation.isPending || updatePolicyMutation.isPending}
                            >
                                {editingPolicy ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </Dialog>

                {/* Holiday Dialog */}
                <Dialog
                    open={holidayDialogOpen}
                    onOpenChange={handleCloseHolidayDialog}
                    title="Add Holiday"
                    className="max-w-md"
                >
                    <form onSubmit={handleSubmitHoliday}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="holiday-name" className="block mb-1.5">Holiday Name *</Label>
                                <Input
                                    id="holiday-name"
                                    value={holidayForm.name}
                                    onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                                    placeholder="e.g., New Year's Day"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="holiday-date" className="block mb-1.5">Date *</Label>
                                <Input
                                    id="holiday-date"
                                    type="date"
                                    value={holidayForm.date}
                                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="holiday-description" className="block mb-1.5">Description</Label>
                                <Input
                                    id="holiday-description"
                                    value={holidayForm.description}
                                    onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                                    placeholder="Brief description"
                                />
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={holidayForm.is_optional}
                                        onChange={(e) => setHolidayForm({ ...holidayForm, is_optional: e.target.checked })}
                                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500/50"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Optional Holiday</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={holidayForm.is_paid}
                                        onChange={(e) => setHolidayForm({ ...holidayForm, is_paid: e.target.checked })}
                                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500/50"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Paid Holiday</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                            <Button type="button" variant="ghost" onClick={handleCloseHolidayDialog}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                isLoading={createHolidayMutation.isPending}
                            >
                                Create
                            </Button>
                        </div>
                    </form>
                </Dialog>
            </div>
        </DashboardLayout>
    );
};

export default LeaveSettingsPage;
