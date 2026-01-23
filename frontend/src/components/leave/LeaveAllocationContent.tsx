import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { leaveService, LeaveType } from '@/services/leave.service';
import { usersService, User } from '@/services/users.service';
import { CheckCircle, Gift, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

export const LeaveAllocationContent: React.FC = () => {
    const queryClient = useQueryClient();

    // Form State
    const [selectedLeaveType, setSelectedLeaveType] = useState<string>('');
    const [daysToAllocate, setDaysToAllocate] = useState<number>(0);
    const [allocationType, setAllocationType] = useState<'all' | 'selected'>('all');
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [allocationReason, setAllocationReason] = useState<string>('Monthly Leave Allocation');

    // Allocation Result State
    const [lastAllocationResult, setLastAllocationResult] = useState<{
        success: boolean;
        processed: number;
        failed: number;
    } | null>(null);

    // Queries
    const { data: leaveTypes = [] } = useQuery({
        queryKey: ['leave-types'],
        queryFn: () => leaveService.getLeaveTypes(),
    });

    const { data: employees = [], isLoading: employeesLoading } = useQuery({
        queryKey: ['users', 'employees'],
        queryFn: () => usersService.getUsers({ role: 'EMPLOYEE' }),
        enabled: allocationType === 'selected',
    });

    // Bulk Allocation Mutation
    const bulkAllocationMutation = useMutation({
        mutationFn: async (data: {
            leave_type_id: string;
            days: number;
            employee_ids?: string[];
            reason: string;
        }) => {
            return leaveService.bulkAllocate(data);
        },
        onSuccess: (data: any) => {
            setLastAllocationResult({
                success: true,
                processed: data.processed || 0,
                failed: data.failed || 0,
            });
            queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
            toast.success(`Successfully allocated leaves to ${data.processed} employees!`);
            resetForm();
        },
        onError: (error: Error) => {
            setLastAllocationResult({
                success: false,
                processed: 0,
                failed: 0,
            });
            toast.error(error.message);
        },
    });

    const resetForm = () => {
        setSelectedLeaveType('');
        setDaysToAllocate(0);
        setSelectedEmployeeIds([]);
        setAllocationReason('Monthly Leave Allocation');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedLeaveType) {
            toast.error('Please select a leave type');
            return;
        }
        if (daysToAllocate <= 0) {
            toast.error('Please enter valid number of days');
            return;
        }

        const confirmed = window.confirm(
            allocationType === 'all'
                ? `Are you sure you want to allocate ${daysToAllocate} days of "${leaveTypes.find(t => t.id === selectedLeaveType)?.name}" to ALL active employees?`
                : `Are you sure you want to allocate ${daysToAllocate} days to ${selectedEmployeeIds.length} selected employees?`
        );

        if (confirmed) {
            bulkAllocationMutation.mutate({
                leave_type_id: selectedLeaveType,
                days: daysToAllocate,
                employee_ids: allocationType === 'selected' ? selectedEmployeeIds : undefined,
                reason: allocationReason,
            });
        }
    };

    const toggleEmployeeSelection = (id: string) => {
        setSelectedEmployeeIds(prev =>
            prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
        );
    };

    const selectAllEmployees = () => {
        setSelectedEmployeeIds(employees.map((e: User) => e.id));
    };

    const deselectAllEmployees = () => {
        setSelectedEmployeeIds([]);
    };

    const selectedLeaveTypeName = leaveTypes.find(t => t.id === selectedLeaveType)?.name || '';

    return (
        <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                    <Gift className="h-5 w-5 text-blue-500" />
                    <div>
                        <h3 className="font-medium text-blue-900 dark:text-blue-200">Leave Allocation</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            Allocate leave days to employees. Select a leave type, enter days, and allocate to all or selected employees.
                        </p>
                    </div>
                </div>
            </div>

            {/* Allocation Form */}
            <Card>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                    Allocate Leave Days
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Step 1: Select Leave Type */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <Label className="block mb-2 text-primary font-medium">
                                Step 1: Select Leave Type *
                            </Label>
                            <select
                                value={selectedLeaveType}
                                onChange={(e) => setSelectedLeaveType(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-primary"
                                required
                            >
                                <option value="">-- Select Leave Type --</option>
                                {leaveTypes.map((type: LeaveType) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name} ({type.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label className="block mb-2 text-primary font-medium">
                                Step 2: Days to Allocate *
                            </Label>
                            <Input
                                type="number"
                                step="0.5"
                                min="0.5"
                                value={daysToAllocate || ''}
                                onChange={(e) => setDaysToAllocate(Number(e.target.value))}
                                placeholder="e.g., 12"
                                className="text-lg py-3"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Enter number of days to add to each employee's balance
                            </p>
                        </div>
                    </div>

                    {/* Step 3: Allocation Target */}
                    <div>
                        <Label className="block mb-2 text-primary font-medium">
                            Step 3: Allocate To
                        </Label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer p-4 border rounded-lg flex-1 hover:bg-gray-50 dark:hover:bg-gray-800">
                                <input
                                    type="radio"
                                    name="allocationType"
                                    value="all"
                                    checked={allocationType === 'all'}
                                    onChange={() => setAllocationType('all')}
                                    className="w-4 h-4 text-primary"
                                />
                                <div>
                                    <span className="font-medium text-gray-900 dark:text-white">All Active Employees</span>
                                    <p className="text-xs text-gray-500">Allocate to everyone at once</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer p-4 border rounded-lg flex-1 hover:bg-gray-50 dark:hover:bg-gray-800">
                                <input
                                    type="radio"
                                    name="allocationType"
                                    value="selected"
                                    checked={allocationType === 'selected'}
                                    onChange={() => setAllocationType('selected')}
                                    className="w-4 h-4 text-primary"
                                />
                                <div>
                                    <span className="font-medium text-gray-900 dark:text-white">Selected Employees</span>
                                    <p className="text-xs text-gray-500">Choose specific employees</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <Label className="block mb-2">Allocation Reason</Label>
                        <Input
                            value={allocationReason}
                            onChange={(e) => setAllocationReason(e.target.value)}
                            placeholder="e.g., Monthly Leave Allocation, Annual Grant, etc."
                        />
                    </div>

                    {/* Employee Selection (if selected mode) */}
                    {allocationType === 'selected' && (
                        <div className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                                <Label className="text-primary font-medium">
                                    Select Employees ({selectedEmployeeIds.length} selected)
                                </Label>
                                <div className="flex gap-2">
                                    <Button type="button" variant="ghost" size="sm" onClick={selectAllEmployees}>
                                        Select All
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={deselectAllEmployees}>
                                        Clear
                                    </Button>
                                </div>
                            </div>

                            {employeesLoading ? (
                                <div className="flex justify-center py-8">
                                    <RefreshCw className="animate-spin h-6 w-6 text-gray-400" />
                                </div>
                            ) : (
                                <div className="max-h-60 overflow-auto border rounded">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-10"> </TableHead>
                                                <TableHead>Employee</TableHead>
                                                <TableHead>Email</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {employees.map((emp: User) => (
                                                <TableRow
                                                    key={emp.id}
                                                    className={cn(
                                                        "cursor-pointer",
                                                        selectedEmployeeIds.includes(emp.id) && "bg-primary/5"
                                                    )}
                                                    onClick={() => toggleEmployeeSelection(emp.id)}
                                                >
                                                    <TableCell>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedEmployeeIds.includes(emp.id)}
                                                            onChange={() => { }}
                                                            className="w-4 h-4 rounded text-primary"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {emp.first_name} {emp.last_name}
                                                    </TableCell>
                                                    <TableCell className="text-gray-500">{emp.email}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Summary & Submit */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <h3 className="font-medium mb-2">Allocation Summary</h3>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <li>• Leave Type: <span className="font-medium text-gray-900 dark:text-white">{selectedLeaveTypeName || '-'}</span></li>
                            <li>• Days to Allocate: <span className="font-medium text-gray-900 dark:text-white">{daysToAllocate || 0}</span></li>
                            <li>• Target: <span className="font-medium text-gray-900 dark:text-white">
                                {allocationType === 'all' ? 'All Active Employees' : `${selectedEmployeeIds.length} Selected Employees`}
                            </span></li>
                        </ul>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={resetForm}>
                            Reset
                        </Button>
                        <Button
                            type="submit"
                            isLoading={bulkAllocationMutation.isPending}
                            disabled={!selectedLeaveType || daysToAllocate <= 0 || (allocationType === 'selected' && selectedEmployeeIds.length === 0)}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <Gift size={16} className="mr-2" />
                            Allocate Leaves
                        </Button>
                    </div>
                </form>
            </Card>

            {/* Last Allocation Result */}
            {lastAllocationResult && (
                <Card className={cn(
                    "border-2",
                    lastAllocationResult.success ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-red-500 bg-red-50 dark:bg-red-900/20"
                )}>
                    <div className="flex items-center gap-3">
                        {lastAllocationResult.success ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        )}
                        <div>
                            <h3 className={cn("font-medium", lastAllocationResult.success ? "text-green-800" : "text-red-800")}>
                                {lastAllocationResult.success ? 'Allocation Successful!' : 'Allocation Failed'}
                            </h3>
                            <p className="text-sm text-gray-600">
                                Processed: {lastAllocationResult.processed} employees
                                {lastAllocationResult.failed > 0 && `, Failed: ${lastAllocationResult.failed}`}
                            </p>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};
