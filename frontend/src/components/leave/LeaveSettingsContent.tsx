import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { leaveService, LeaveType, LeavePolicy, CreateLeaveTypeData, CreatePolicyData, CreateHolidayData } from '@/services/leave.service';
import { cn } from '@/utils/cn';
import { Plus, Pencil, Trash2, Check, X, Calendar, FileText, ClipboardList, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

type TabType = 'types' | 'policies' | 'holidays';

export const LeaveSettingsContent: React.FC = () => {
    const queryClient = useQueryClient();
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
        default_accrual_rate: 0,
        default_max_balance: 0,
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
        mutationFn: ({ id, data }: { id: string; data: Partial<CreatePolicyData> }) =>
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
            alert(`Allocation completed! Processed ${data.accruals_processed} employee records.`);
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to run allocation');
        },
    });

    const handleRunAccrual = () => {
        if (window.confirm('Run monthly leave allocation for all employees? This will credit leaves based on policies.')) {
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
            default_accrual_rate: 0,
            default_max_balance: 0,
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

    const handleDeleteType = (id: string) => {
        if (window.confirm('Are you sure you want to delete this leave type? This action cannot be undone.')) {
            deleteTypeMutation.mutate(id);
        }
    };

    const handleDeletePolicy = (id: string) => {
        if (window.confirm('Are you sure you want to delete this leave policy? This action cannot be undone.')) {
            deletePolicyMutation.mutate(id);
        }
    };

    const handleDeleteHoliday = (id: string) => {
        if (window.confirm('Are you sure you want to delete this holiday?')) {
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
        <div className="space-y-6">
            {/* Error Alert */}
            {errorMessage && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <p className="text-red-700 dark:text-red-400 text-sm">{errorMessage}</p>
                    <button
                        onClick={() => setErrorMessage(null)}
                        className="ml-auto text-red-500 hover:text-red-700"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Tabs */}
            <Card className="p-0 overflow-hidden">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 -mb-px',
                                activeTab === tab.id
                                    ? 'border-primary text-primary bg-primary/5'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            )}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </Card>

            {/* Leave Types Tab */}
            {activeTab === 'types' && (
                <Card>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Leave Types</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Configure different types of leaves available in your organization
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => refetchTypes()}>
                                <RefreshCw size={16} className="mr-1" />
                                Refresh
                            </Button>
                            <Button size="sm" onClick={() => handleOpenTypeDialog()}>
                                <Plus size={16} className="mr-1" />
                                Add Leave Type
                            </Button>
                        </div>
                    </div>

                    {typesLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
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
                                    <TableHead>Approval</TableHead>
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
                                            {type.requires_approval !== false ? (
                                                <Check size={16} className="text-green-500" />
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
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Define leave entitlements and rules for different employee groups
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRunAccrual}
                                disabled={runAccrualMutation.isPending}
                                className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                            >
                                <RefreshCw size={16} className={cn("mr-1", runAccrualMutation.isPending && "animate-spin")} />
                                Run Allocation
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
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
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
                                    <TableHead>Policy Name</TableHead>
                                    <TableHead>Leave Type</TableHead>
                                    <TableHead>Accrual Rate</TableHead>
                                    <TableHead>Accrual Type</TableHead>
                                    <TableHead>Probation Eligible</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {policies.map((policy) => (
                                    <TableRow key={policy.id}>
                                        <TableCell className="font-medium">{policy.name}</TableCell>
                                        <TableCell>{policy.leave_type?.name || policy.leave_type_id}</TableCell>
                                        <TableCell>{policy.accrual_rate} days</TableCell>
                                        <TableCell>
                                            <span className="capitalize">{policy.accrual_type.toLowerCase()}</span>
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
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
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
                                            <div className="flex flex-col items-center justify-center w-14 h-14 bg-primary/10 rounded-lg">
                                                <span className="text-xs text-primary font-medium">
                                                    {format(new Date(holiday.date), 'MMM')}
                                                </span>
                                                <span className="text-lg font-bold text-primary">
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
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Paid Leave</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={typeForm.requires_approval}
                                    onChange={(e) => setTypeForm({ ...typeForm, requires_approval: e.target.checked })}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Requires Approval</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={typeForm.requires_attachment}
                                    onChange={(e) => setTypeForm({ ...typeForm, requires_attachment: e.target.checked })}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
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
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="type-default-accrual" className="block mb-1.5 text-blue-600 dark:text-blue-400">Monthly Quota (Days/Month)</Label>
                                <Input
                                    id="type-default-accrual"
                                    type="number"
                                    step="0.5"
                                    value={(typeForm as any).default_accrual_rate || 0}
                                    onChange={(e) => setTypeForm({ ...typeForm, default_accrual_rate: Number(e.target.value) } as any)}
                                    min={0}
                                    placeholder="e.g. 1.5"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Days credited per month</p>
                            </div>
                            <div>
                                <Label htmlFor="type-default-balance" className="block mb-1.5">Max Balance Cap</Label>
                                <Input
                                    id="type-default-balance"
                                    type="number"
                                    value={(typeForm as any).default_max_balance || 0}
                                    onChange={(e) => setTypeForm({ ...typeForm, default_max_balance: Number(e.target.value) } as any)}
                                    min={0}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={handleCloseTypeDialog}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={createTypeMutation.isPending || updateTypeMutation.isPending}>
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
                className="max-w-2xl"
            >
                <form onSubmit={handleSubmitPolicy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Label htmlFor="policy-name" className="block mb-1.5">Policy Name *</Label>
                            <Input
                                id="policy-name"
                                value={policyForm.name}
                                onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                                placeholder="e.g., Standard Annual Leave Policy"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="policy-description" className="block mb-1.5">Description</Label>
                            <Input
                                id="policy-description"
                                value={policyForm.description}
                                onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
                                placeholder="Description of the policy"
                            />
                        </div>
                        <div>
                            <Label htmlFor="policy-type" className="block mb-1.5">Leave Type *</Label>
                            <select
                                id="policy-type"
                                value={policyForm.leave_type_id}
                                onChange={(e) => setPolicyForm({ ...policyForm, leave_type_id: e.target.value })}
                                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            >
                                <option value="">Select Leave Type</option>
                                {leaveTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="policy-accrual-type" className="block mb-1.5">Accrual Type</Label>
                            <select
                                id="policy-accrual-type"
                                value={policyForm.accrual_type}
                                onChange={(e) => setPolicyForm({ ...policyForm, accrual_type: e.target.value as any })}
                                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="MONTHLY">Monthly</option>
                                <option value="ANNUAL">Annual (Lump Sum)</option>
                                <option value="QUARTERLY">Quarterly</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="policy-rate" className="block mb-1.5">Accrual Rate (days) *</Label>
                            <Input
                                id="policy-rate"
                                type="number"
                                step="0.5"
                                value={policyForm.accrual_rate}
                                onChange={(e) => setPolicyForm({ ...policyForm, accrual_rate: Number(e.target.value) })}
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Days accrued per period (e.g., 1.5 days/month)
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="policy-max-balance" className="block mb-1.5">Max Balance Cap</Label>
                            <Input
                                id="policy-max-balance"
                                type="number"
                                value={policyForm.max_balance || ''}
                                onChange={(e) => setPolicyForm({ ...policyForm, max_balance: e.target.value ? Number(e.target.value) : null })}
                                placeholder="No limit"
                            />
                        </div>
                        <div>
                            <Label htmlFor="policy-min-tenure" className="block mb-1.5">Min Tenure (Months)</Label>
                            <Input
                                id="policy-min-tenure"
                                type="number"
                                value={policyForm.min_tenure_months}
                                onChange={(e) => setPolicyForm({ ...policyForm, min_tenure_months: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="policy-year-start" className="block mb-1.5">Cycle Start Month</Label>
                            <select
                                id="policy-year-start"
                                value={policyForm.year_start_month}
                                onChange={(e) => setPolicyForm({ ...policyForm, year_start_month: Number(e.target.value) })}
                                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                    <option key={m} value={m}>
                                        {format(new Date(2000, m - 1, 1), 'MMMM')}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={policyForm.is_probation_eligible}
                                    onChange={(e) => setPolicyForm({ ...policyForm, is_probation_eligible: e.target.checked })}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    Eligible during probation period
                                </span>
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={handleClosePolicyDialog}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={createPolicyMutation.isPending || updatePolicyMutation.isPending}>
                            {editingPolicy ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Dialog>

            {/* Holiday Dialog */}
            <Dialog
                open={holidayDialogOpen}
                onOpenChange={handleCloseHolidayDialog}
                title="Add Public Holiday"
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
                                placeholder="Optional description"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={holidayForm.is_optional}
                                    onChange={(e) => setHolidayForm({ ...holidayForm, is_optional: e.target.checked })}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Restricted/Optional Holiday</span>
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={handleCloseHolidayDialog}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={createHolidayMutation.isPending}>
                            Create Holiday
                        </Button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
};
