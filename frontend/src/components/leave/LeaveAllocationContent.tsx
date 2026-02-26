import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { leaveService, LeaveType } from '@/services/employee/leave.service';
import { usersService, User } from '@/services/employee/users.service';
import { CheckCircle, AlertCircle, RefreshCw, Users, User as UserIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';
import { useConfirm } from '@/contexts/ConfirmContext';

export const LeaveAllocationContent: React.FC = () => {
    const queryClient = useQueryClient();
    const { confirm } = useConfirm();
    const currentYear = new Date().getFullYear();

    // Form State
    const [leaveTypeId, setLeaveTypeId] = useState('');
    const [days, setDays] = useState<number>(0);
    const [year, setYear] = useState(currentYear);
    const [target, setTarget] = useState<'all' | 'selected'>('all');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [reason, setReason] = useState('');
    const [result, setResult] = useState<{ success: boolean; processed: number; failed: number } | null>(null);

    // Queries
    const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
        queryKey: ['leave-types'],
        queryFn: () => leaveService.getLeaveTypes(),
    });

    const { data: employees = [], isLoading: loadingEmployees } = useQuery({
        queryKey: ['users', 'employees'],
        queryFn: () => usersService.getUsers({ role: 'EMPLOYEE' }),
        enabled: target === 'selected',
    });

    // Mutations
    const allocateMutation = useMutation({
        mutationFn: leaveService.bulkAllocate,
        onSuccess: (data) => {
            setResult({ success: true, processed: data.processed || 0, failed: data.failed || 0 });
            queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            toast.success(`Allocated to ${data.processed} employees`);
            resetForm();
        },
        onError: (error: Error) => {
            setResult({ success: false, processed: 0, failed: 0 });
            toast.error(error.message);
        },
    });

    const resetBalancesMutation = useMutation({
        mutationFn: leaveService.bulkReset,
        onSuccess: (data) => {
            setResult({ success: true, processed: data.processed || 0, failed: data.failed || 0 });
            queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            toast.success(`Reset ${data.processed} balances successfully`);
            resetForm();
        },
        onError: (error: Error) => {
            setResult({ success: false, processed: 0, failed: 0 });
            toast.error(error.message);
        },
    });

    const resetForm = () => {
        setLeaveTypeId('');
        setDays(0);
        setSelectedIds([]);
        setReason('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leaveTypeId || days <= 0) {
            toast.error('Select leave type and enter valid days');
            return;
        }
        if (target === 'selected' && selectedIds.length === 0) {
            toast.error('Select at least one employee');
            return;
        }

        const typeName = leaveTypes.find((t: LeaveType) => t.id === leaveTypeId)?.name;
        const msg = target === 'all'
            ? `Allocate ${days} days of ${typeName} to ALL employees for ${year}?`
            : `Allocate ${days} days to ${selectedIds.length} employees for ${year}?`;

        const result = await confirm({
            title: 'Confirm Allocation',
            message: msg,
            confirmText: 'Allocate Now',
            cancelText: 'Cancel'
        });
        if (result) {
            allocateMutation.mutate({
                leave_type_id: leaveTypeId,
                days,
                year,
                reason: reason || `${year} Allocation`,
                employee_ids: target === 'selected' ? selectedIds : undefined,
            });
        }
    };

    const handleResetAction = async () => {
        const typeName = leaveTypeId ? leaveTypes.find((t: LeaveType) => t.id === leaveTypeId)?.name : 'ALL';
        const msg = target === 'all'
            ? `RESET ${typeName} leave balances for ALL employees for ${year}? This will set balances to 0!`
            : `RESET ${typeName} leave balances for ${selectedIds.length} selected employees for ${year}? This will set balances to 0!`;

        const result = await confirm({
            title: 'Reset Leave Balances',
            message: msg,
            type: 'destructive',
            confirmText: 'Reset Now',
            cancelText: 'Cancel'
        });
        if (result) {
            resetBalancesMutation.mutate({
                leave_type_id: leaveTypeId || undefined,
                year,
                reason: reason || `${year} Balance Reset`,
                employee_ids: target === 'selected' ? selectedIds : undefined,
                reset_to_zero: true
            });
        }
    };

    const toggleEmployee = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const typeName = leaveTypes.find((t: LeaveType) => t.id === leaveTypeId)?.name || '-';

    return (
        <div className="space-y-6">
            {/* Allocation Form */}
            <Card>
                <h2 className="text-lg font-semibold mb-4">Allocate Leave</h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Row 1: Year, Type, Days */}
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label className="mb-1.5">Year</Label>
                            <select
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                            >
                                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2, currentYear + 3].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label className="mb-1.5">Leave Type</Label>
                            <select
                                value={leaveTypeId}
                                onChange={(e) => setLeaveTypeId(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600"
                                required
                            >
                                <option value="">Select type</option>
                                {leaveTypes.map((t: LeaveType) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label className="mb-1.5">Days</Label>
                            <Input
                                type="number"
                                step="0.5"
                                min="0.5"
                                value={days || ''}
                                onChange={(e) => setDays(Number(e.target.value))}
                                placeholder="e.g., 12"
                                required
                            />
                        </div>
                    </div>

                    {/* Row 2: Target Selection */}
                    <div>
                        <Label className="mb-2">Allocate To</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setTarget('all')}
                                className={cn(
                                    "flex items-center gap-3 p-3 border-2 rounded-lg text-left transition-all",
                                    target === 'all'
                                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                )}
                            >
                                <Users size={20} className={target === 'all' ? "text-green-600" : "text-gray-400"} />
                                <div>
                                    <p className="font-medium">All Employees</p>
                                    <p className="text-xs text-gray-500">All active employees</p>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTarget('selected')}
                                className={cn(
                                    "flex items-center gap-3 p-3 border-2 rounded-lg text-left transition-all",
                                    target === 'selected'
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                )}
                            >
                                <UserIcon size={20} className={target === 'selected' ? "text-blue-600" : "text-gray-400"} />
                                <div>
                                    <p className="font-medium">Selected Only</p>
                                    <p className="text-xs text-gray-500">Choose employees</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Employee Selection */}
                    {target === 'selected' && (
                        <div className="border rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-medium">{selectedIds.length} selected</span>
                                <div className="flex gap-2">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds(employees.map((e: User) => (e.employee_uuid || e.id)))}>
                                        Select All
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                                        Clear
                                    </Button>
                                </div>
                            </div>
                            {loadingEmployees ? (
                                <div className="flex justify-center py-6">
                                    <RefreshCw className="animate-spin h-5 w-5 text-gray-400" />
                                </div>
                            ) : (
                                <div className="max-h-48 overflow-auto border rounded">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-8">{' '}</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Email</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {employees.map((emp: User) => {
                                                const identifier = emp.employee_uuid || emp.id;
                                                return (
                                                    <TableRow
                                                        key={emp.id}
                                                        className={cn("cursor-pointer", selectedIds.includes(identifier) && "bg-blue-50 dark:bg-blue-900/20")}
                                                        onClick={() => toggleEmployee(identifier)}
                                                    >
                                                        <TableCell>
                                                            <input type="checkbox" checked={selectedIds.includes(identifier)} readOnly className="rounded" />
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            <div>
                                                                {emp.first_name} {emp.last_name}
                                                                {emp.employee_id && (
                                                                    <span className="ml-2 text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">
                                                                        {emp.employee_id}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-gray-500 text-sm">{emp.email}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reason */}
                    <div>
                        <Label className="mb-1.5">Reason (optional)</Label>
                        <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Annual entitlement, Bonus leave"
                        />
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Year</p>
                                <p className="font-bold text-lg">{year}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Type</p>
                                <p className="font-medium truncate">{typeName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Days</p>
                                <p className="font-bold text-lg text-green-600">{days || 0}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Target</p>
                                <p className="font-medium">{target === 'all' ? 'All' : `${selectedIds.length} selected`}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={resetForm}>Clear Form</Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleResetAction}
                            isLoading={resetBalancesMutation.isPending}
                            disabled={allocateMutation.isPending || (target === 'selected' && selectedIds.length === 0)}
                        >
                            Reset Balances
                        </Button>
                        <Button
                            type="submit"
                            isLoading={allocateMutation.isPending}
                            disabled={!leaveTypeId || days <= 0 || (target === 'selected' && selectedIds.length === 0) || resetBalancesMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Allocate
                        </Button>
                    </div>
                </form>
            </Card>

            {/* Result */}
            {result && (
                <Card className={cn(
                    "flex items-center gap-3",
                    result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                )}>
                    {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                        <p className={cn("font-medium", result.success ? "text-green-800" : "text-red-800")}>
                            {result.success ? 'Success' : 'Failed'}
                        </p>
                        <p className="text-sm text-gray-600">
                            {result.processed} processed{result.failed > 0 && `, ${result.failed} failed`}
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
};
