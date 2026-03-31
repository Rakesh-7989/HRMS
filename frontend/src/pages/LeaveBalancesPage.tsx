import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { leaveService, LeaveBalance, BalanceAdjustmentData } from '@/services/leave.service';
import { usersService } from '@/services/users.service';
import { Search, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTranslation } from 'react-i18next';

export const LeaveBalancesPage: React.FC = () => {
  const { t } = useTranslation();
    const queryClient = useQueryClient();

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string; email: string } | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Dialog State
    const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
    const [selectedBalance, setSelectedBalance] = useState<LeaveBalance | null>(null);
    const [adjustForm, setAdjustForm] = useState({
        amount: 0,
        type: 'ADD' as 'ADD' | 'DEDUCT',
        reason: '',
    });
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Debounce Search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Queries
    const { data: searchResponse, isLoading: searchLoading } = useQuery({
        queryKey: ['users', 'search', debouncedSearch],
        queryFn: () => usersService.getUsers({ search: debouncedSearch, limit: 10 }),
        enabled: debouncedSearch.length > 2,
    });
    const searchResults = searchResponse?.data || [];

    const { data: balances = [], isLoading: balancesLoading, refetch: refetchBalances } = useQuery({
        queryKey: ['leave-balances', selectedEmployee?.id],
        queryFn: () => leaveService.getEmployeeBalances(selectedEmployee!.id),
        enabled: !!selectedEmployee,
    });

    // Mutations
    const adjustBalanceMutation = useMutation({
        mutationFn: (data: BalanceAdjustmentData) => leaveService.adjustBalance(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-balances', selectedEmployee?.id] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            handleCloseDialog();
            setErrorMessage(null);
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to adjust balance');
        },
    });

    // Handlers
    const handleSelectEmployee = (user: any) => {
        setSelectedEmployee({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
        });
        setSearchQuery('');
    };

    const handleOpenAdjustDialog = (balance: LeaveBalance) => {
        setSelectedBalance(balance);
        setAdjustForm({ amount: 0, type: 'ADD', reason: '' });
        setAdjustDialogOpen(true);
        setErrorMessage(null);
    };

    const handleCloseDialog = () => {
        setAdjustDialogOpen(false);
        setSelectedBalance(null);
        setErrorMessage(null);
    };

    const handleSubmitAdjustment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee || !selectedBalance) return;
        if (adjustForm.amount <= 0) {
            setErrorMessage('Amount must be greater than 0');
            return;
        }
        if (!adjustForm.reason.trim()) {
            setErrorMessage('Reason is required');
            return;
        }

        const adjustment = adjustForm.type === 'ADD' ? adjustForm.amount : -adjustForm.amount;

        adjustBalanceMutation.mutate({
            employee_id: selectedEmployee.id,
            leave_type_id: selectedBalance.leave_type_id,
            adjustment: adjustment,
            reason: adjustForm.reason,
        });
    };

    return (
        <DashboardLayout
            title={t('leave.tabs.balances')}
            breadcrumbs={[
                { label: t('common.breadcrumbs.dashboard'), href: '/dashboard/organization' },
                { label: t('common.breadcrumbs.leave'), href: '/leave' },
                { label: 'Balances' },
            ]}
        >
            <div className="space-y-6">
                {/* Search Card */}
                <Card>
                    <div className="max-w-xl">
                        <Label htmlFor="employee-search" className="mb-2 block">Search Employee</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                id="employee-search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name or email..."
                                className="pl-9"
                            />
                        </div>

                        {/* Search Results Dropdown */}
                        {searchQuery.length > 2 && (
                            <div className="absolute z-10 w-full max-w-xl bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 mt-1 max-h-60 overflow-auto">
                                {searchLoading ? (
                                    <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
                                ) : searchResults.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-500">No employees found</div>
                                ) : (
                                    <ul className="py-1">
                                        {searchResults.map((user: any) => (
                                            <li key={user.id}>
                                                <button
                                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between group"
                                                    onClick={() => handleSelectEmployee(user)}
                                                >
                                                    <div>
                                                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                                                            {user.first_name} {user.last_name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{user.email}</p>
                                                    </div>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </Card>

                {/* Balances Section */}
                {selectedEmployee ? (
                    <Card>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Balances for {selectedEmployee.name}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {selectedEmployee.email}
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => refetchBalances()}>
                                <RefreshCw size={16} className="mr-1" />
                                Refresh
                            </Button>
                        </div>

                        {balancesLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                            </div>
                        ) : balances.length === 0 ? (
                            <div className="text-center py-12">
                                <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No balances found</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    This employee has no leave balances initialized.
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Leave Type</TableHead>
                                        <TableHead>Entitled</TableHead>
                                        <TableHead>Used</TableHead>
                                        <TableHead>Pending</TableHead>
                                        <TableHead>Available</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {balances.map((balance) => (
                                        <TableRow key={balance.id}>
                                            <TableCell className="font-medium">
                                                {balance.leave_type?.name || balance.leave_type_id}
                                            </TableCell>
                                            <TableCell>{balance.entitled} days</TableCell>
                                            <TableCell>{balance.used} days</TableCell>
                                            <TableCell>{balance.pending} days</TableCell>
                                            <TableCell>
                                                <span className={cn(
                                                    "font-bold",
                                                    balance.available <= 0 ? "text-red-600" : "text-green-600"
                                                )}>
                                                    {balance.available} days
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenAdjustDialog(balance)}
                                                >
                                                    Adjust
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Card>
                ) : (
                    <div className="flex items-center justify-center py-12 bg-gray-50 dark:bg-gray-800/20 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <div className="text-center">
                            <Search className="mx-auto h-12 w-12 text-gray-300" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Select an employee</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Search for an employee above to view and manage their leave balances.
                            </p>
                        </div>
                    </div>
                )}

                {/* Adjustment Dialog */}
                <Dialog
                    open={adjustDialogOpen}
                    onOpenChange={handleCloseDialog}
                    title="Adjust Balance"
                    className="max-w-md"
                >
                    <form onSubmit={handleSubmitAdjustment}>
                        {errorMessage && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm mb-4">
                                {errorMessage}
                            </div>
                        )}
                        <div className="space-y-4">
                            <div>
                                <Label className="block mb-1.5">Leave Type</Label>
                                <div className="text-sm font-medium p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                    {selectedBalance?.leave_type?.name}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="block mb-1.5">Action</Label>
                                    <div className="flex rounded-md shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => setAdjustForm({ ...adjustForm, type: 'ADD' })}
                                            className={cn(
                                                "w-full px-4 py-2 text-sm font-medium rounded-l-md border",
                                                adjustForm.type === 'ADD'
                                                    ? "bg-green-600 text-white border-green-600"
                                                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50"
                                            )}
                                        >
                                            Grant
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAdjustForm({ ...adjustForm, type: 'DEDUCT' })}
                                            className={cn(
                                                "w-full px-4 py-2 text-sm font-medium rounded-r-md border-t border-b border-r",
                                                adjustForm.type === 'DEDUCT'
                                                    ? "bg-red-600 text-white border-red-600"
                                                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50"
                                            )}
                                        >
                                            Deduct
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="amount" className="block mb-1.5">Amount (Days)</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        value={adjustForm.amount}
                                        onChange={(e) => setAdjustForm({ ...adjustForm, amount: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="reason" className="block mb-1.5">Reason *</Label>
                                <Input
                                    id="reason"
                                    value={adjustForm.reason}
                                    onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                                    placeholder="e.g. Manual correction, Bonus leave"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                            <Button type="button" variant="ghost" onClick={handleCloseDialog}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                isLoading={adjustBalanceMutation.isPending}
                                className={adjustForm.type === 'ADD' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                            >
                                {adjustForm.type === 'ADD' ? 'Grant Leave' : 'Deduct Leave'}
                            </Button>
                        </div>
                    </form>
                </Dialog>
            </div>
        </DashboardLayout>
    );
};
