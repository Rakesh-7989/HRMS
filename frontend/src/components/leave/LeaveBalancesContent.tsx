import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export const LeaveBalancesContent: React.FC = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string; email: string; code?: string } | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
    const [selectedBalance, setSelectedBalance] = useState<LeaveBalance | null>(null);
    const [adjustForm, setAdjustForm] = useState({
        amount: 0,
        type: 'ADD' as 'ADD' | 'DEDUCT',
        reason: '',
    });
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const { data: usersResponse, isLoading: searchLoading } = useQuery({
        queryKey: ['users', 'search', debouncedSearch],
        queryFn: () => usersService.getUsers({ search: debouncedSearch, limit: 10 }),
        enabled: debouncedSearch.length > 2,
    });
    const searchResults = usersResponse?.data || [];

    const { data: balances = [], isLoading: balancesLoading, refetch: refetchBalances } = useQuery({
        queryKey: ['leave-balances', selectedEmployee?.id],
        queryFn: () => leaveService.getEmployeeBalances(selectedEmployee!.id),
        enabled: !!selectedEmployee,
    });

    const adjustBalanceMutation = useMutation({
        mutationFn: (data: BalanceAdjustmentData) => leaveService.adjustBalance(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-balances', selectedEmployee?.id] });
            handleCloseDialog();
            setErrorMessage(null);
        },
        onError: (error: Error) => {
            setErrorMessage(error.message || 'Failed to adjust balance');
        },
    });

    const handleSelectEmployee = (user: { employee_uuid?: string; id: string; first_name?: string; last_name?: string; email: string; employee_id?: string }) => {
        setSelectedEmployee({
            id: user.employee_uuid || user.id,
            name: `${user.first_name || ''} ${user.last_name || ''}`,
            email: user.email,
            code: user.employee_id,
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
        <div className="space-y-6">
            {/* Search Card */}
            <Card>
                <div className="max-w-xl">
                    <Label htmlFor="employee-search" className="mb-2 block">{t('leave.searchEmployee')}</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            id="employee-search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('leave.searchByNameOrEmail')}
                            className="pl-9"
                        />
                    </div>

                    {searchQuery.length > 2 && (
                        <div className="absolute z-10 w-full max-w-xl bg-white dark:bg-gray-800 rounded-md shadow-elev-4 border border-gray-200 dark:border-gray-700 mt-1 max-h-60 overflow-auto">
                            {searchLoading ? (
                                <div className="p-4 text-center text-sm text-gray-500">{t('leave.searching')}</div>
                            ) : searchResults.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-500">{t('leave.noEmployeesFound')}</div>
                            ) : (
                                <ul className="py-1">
                                    {searchResults.map((user: { id: string; employee_uuid?: string; first_name?: string; last_name?: string; email: string; employee_id?: string }) => (
                                        <li key={user.id}>
                                             <Button variant="ghost" 
                                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                onClick={() => handleSelectEmployee(user)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                                                            {(user.first_name || '')} {(user.last_name || '')}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{user.email}</p>
                                                    </div>
                                                    {user.employee_id && (
                                                        <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">
                                                            {user.employee_id}
                                                        </span>
                                                    )}
                                                </div>
                                            </Button>
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
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                {t('leave.balancesFor')} {selectedEmployee.name}
                                {selectedEmployee.code && (
                                    <span className="text-xs font-mono bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded">
                                        {selectedEmployee.code}
                                    </span>
                                )}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {selectedEmployee.email}
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => refetchBalances()}>
                            <RefreshCw size={16} className="mr-1" />
                            {t('leave.refresh')}
                        </Button>
                    </div>

                    {balancesLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
                        </div>
                    ) : balances.length === 0 ? (
                        <div className="text-center py-12">
                            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('leave.noBalancesFound')}</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {t('leave.noBalancesMsg')}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('leave.leaveTypes')}</TableHead>
                                    <TableHead>{t('leave.entitled')}</TableHead>
                                    <TableHead>{t('leave.used')}</TableHead>
                                    <TableHead>{t('leave.pending')}</TableHead>
                                    <TableHead>{t('leave.available')}</TableHead>
                                    <TableHead className="text-right">{t('leave.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {balances.map((balance) => (
                                    <TableRow key={balance.id}>
                                        <TableCell className="font-medium">
                                            {balance.leave_type?.name || balance.leave_type_id}
                                        </TableCell>
                                        <TableCell>{balance.entitled} {t('leave.days')}</TableCell>
                                        <TableCell>{balance.used} {t('leave.days')}</TableCell>
                                        <TableCell>{balance.pending} {t('leave.days')}</TableCell>
                                        <TableCell>
                                            <span className={cn(
                                                "font-bold",
                                                balance.available <= 0 ? "text-red-600" : "text-green-600"
                                            )}>
                                                {balance.available} {t('leave.days')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleOpenAdjustDialog(balance)}
                                            >
                                                {t('leave.adjust')}
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
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('leave.selectEmployee')}</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {t('leave.selectEmployeeMsg')}
                        </p>
                    </div>
                </div>
            )}

            {/* Adjustment Dialog */}
            <Dialog
                open={adjustDialogOpen}
                onOpenChange={handleCloseDialog}
                title={t('leave.adjustBalance')}
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
                            <Label className="block mb-1.5">{t('leave.leaveTypes')}</Label>
                            <div className="text-sm font-medium p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                {selectedBalance?.leave_type?.name}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="block mb-1.5">{t('leave.action')}</Label>
                                <div className="flex rounded-md shadow-elev-1">
                                     <Button variant="ghost" 
                                        type="button"
                                        onClick={() => setAdjustForm({ ...adjustForm, type: 'ADD' })}
                                        className={cn(
                                            "w-full px-4 py-2 text-sm font-medium rounded-l-md border",
                                            adjustForm.type === 'ADD'
                                                ? "bg-green-600 text-white border-green-600"
                                                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50"
                                        )}
                                    >
                                        {t('leave.grant')}
                                    </Button>
                                     <Button variant="ghost" 
                                        type="button"
                                        onClick={() => setAdjustForm({ ...adjustForm, type: 'DEDUCT' })}
                                        className={cn(
                                            "w-full px-4 py-2 text-sm font-medium rounded-r-md border-t border-b border-r",
                                            adjustForm.type === 'DEDUCT'
                                                ? "bg-red-600 text-white border-red-600"
                                                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50"
                                        )}
                                    >
                                        {t('leave.deduct')}
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="amount" className="block mb-1.5">{t('leave.amountDays')}</Label>
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
                            <Label htmlFor="reason" className="block mb-1.5">{t('leave.reasonAsterisk')}</Label>
                            <Input
                                id="reason"
                                value={adjustForm.reason}
                                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                                placeholder={t('leave.reasonPlaceholder')}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                        <Button type="button" variant="ghost" onClick={handleCloseDialog}>
                            {t('leave.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            isLoading={adjustBalanceMutation.isPending}
                            className={adjustForm.type === 'ADD' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                        >
                            {adjustForm.type === 'ADD' ? t('leave.grantLeave') : t('leave.deductLeave')}
                        </Button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
};
