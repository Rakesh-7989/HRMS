import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import payrollService from '@/services/finance/payroll.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { DatePicker } from '@/components/ui/DatePicker';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export const ExpensesContent: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: expenses = [], refetch } = useQuery<any[]>({ queryKey: ['payroll', 'expenses'], queryFn: () => payrollService.listExpenses(), enabled: !!user });
    const { data: categories = [] } = useQuery<any[]>({ queryKey: ['payroll', 'expense-categories'], queryFn: () => payrollService.listExpenseCategories(), enabled: !!user });

    const [addOpen, setAddOpen] = useState(false);
    const [categoryId, setCategoryId] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [expenseDate, setExpenseDate] = useState('');
    const [payrollIncluded, setPayrollIncluded] = useState(false);

    const createExpenseMut = useMutation({ mutationFn: (payload: any) => payrollService.createExpense(payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll', 'expenses'] }); queryClient.invalidateQueries({ queryKey: ['payroll', 'summary'] }); setAddOpen(false); setCategoryId(''); setAmount(''); setExpenseDate(''); setPayrollIncluded(false); } });
    const createCategoryMut = useMutation({ mutationFn: (payload: any) => payrollService.createExpenseCategory(payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'expense-categories'] }) });

    const handleCreateExpense = () => {
        if (!categoryId || !amount) return;
        createExpenseMut.mutate({ categoryId, amount: Number(amount), expenseDate: expenseDate || new Date().toISOString().slice(0, 10), payrollIncluded });
    };

    const [catOpen, setCatOpen] = useState(false);
    const [catName, setCatName] = useState('');
    const [catCode, setCatCode] = useState('');
    const [catDescription, setCatDescription] = useState('');

    const handleCreateCategory = () => {
        if (!catName) return;
        // backend requires a `code` field (z.string().min(2)). Auto-generate if user left it blank.
        const code = catCode && catCode.trim().length >= 2 ? catCode.trim() : catName.trim().replace(/\s+/g, '_').slice(0, 32).toUpperCase();
        createCategoryMut.mutate({ name: catName.trim(), code, description: catDescription.trim() || undefined }, {
            onSuccess: () => {
                setCatOpen(false);
                setCatName(''); setCatCode(''); setCatDescription('');
            }
        });
    };

    // Edit / Delete / Approve / Toggle payroll states
    const [editOpen, setEditOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [selectedExpenseForApproval, setSelectedExpenseForApproval] = useState<any | null>(null);

    const updateExpenseMut = useMutation({
        mutationFn: ({ expenseId, payload }: { expenseId: string; payload: any }) => payrollService.updateExpense(expenseId, payload),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll', 'expenses'] }); queryClient.invalidateQueries({ queryKey: ['payroll', 'summary'] }); setEditOpen(false); setSelectedExpense(null); }
    });

    const deleteExpenseMut = useMutation({
        mutationFn: (expenseId: string) => payrollService.deleteExpense(expenseId),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll', 'expenses'] }); queryClient.invalidateQueries({ queryKey: ['payroll', 'summary'] }); setDeleteOpen(false); setSelectedExpense(null); }
    });

    const approveExpenseMut = useMutation({
        mutationFn: ({ expenseId, payload }: { expenseId: string; payload: any }) => payrollService.approveExpense(expenseId, payload),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll', 'expenses'] }); queryClient.invalidateQueries({ queryKey: ['payroll', 'summary'] }); setApproveDialogOpen(false); setSelectedExpenseForApproval(null); }
    });

    const togglePayrollMut = useMutation({
        mutationFn: ({ expenseId, payrollIncluded }: { expenseId: string; payrollIncluded: boolean }) => payrollService.setExpensePayrollInclusion(expenseId, payrollIncluded),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll', 'expenses'] }); queryClient.invalidateQueries({ queryKey: ['payroll', 'summary'] }); }
    });

    // helpers
    const openEdit = (e: any) => {
        setSelectedExpense(e);
        setCategoryId((e.category_id || e.categoryId || '') as string);
        setAmount(e.amount || '');
        setExpenseDate(e.expense_date || e.expenseDate || '');
        setPayrollIncluded(!!e.payroll_included);
        setEditOpen(true);
    };

    const handleSaveEdit = () => {
        if (!selectedExpense) return;
        const payload: any = {};
        if (categoryId) payload.categoryId = categoryId;
        if (amount !== '') payload.amount = Number(amount);
        if (expenseDate) payload.expenseDate = expenseDate;
        payload.payrollIncluded = !!payrollIncluded;
        updateExpenseMut.mutate({ expenseId: selectedExpense.id, payload });
    };

    const openDelete = (e: any) => { setSelectedExpense(e); setDeleteOpen(true); };
    const confirmDelete = () => { if (selectedExpense) deleteExpenseMut.mutate(selectedExpense.id); };

    const handleApprove = (e: any) => { approveExpenseMut.mutate({ expenseId: e.id, payload: { status: 'APPROVED' } }); };
    const openReject = (e: any) => { setSelectedExpenseForApproval(e); setApproveDialogOpen(true); };
    const confirmReject = () => { if (selectedExpenseForApproval) approveExpenseMut.mutate({ expenseId: selectedExpenseForApproval.id, payload: { status: 'REJECTED' } }); };
    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="space-x-2">
                    <Button onClick={() => setAddOpen(true)}>Add Expense</Button>
                    <Button onClick={() => setCatOpen(true)}>Add Category</Button>
                    <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Payroll Included</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expenses.length === 0 ? (
                            <TableRow>
                                <TableCell>No expenses</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>-</TableCell>
                            </TableRow>
                        ) : (
                            expenses.map((e: any) => (
                                <TableRow key={e.id}>
                                    <TableCell>{e.category}</TableCell>
                                    <TableCell>{e.amount}</TableCell>
                                    <TableCell>{e.expense_date}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {((e.status || 'PENDING').toUpperCase() === 'APPROVED') && <CheckCircle className="text-green-600" size={16} />}
                                            {((e.status || 'PENDING').toUpperCase() === 'REJECTED') && <XCircle className="text-red-600" size={16} />}
                                            {((e.status || 'PENDING').toUpperCase() === 'PENDING') && <Clock className="text-yellow-500" size={16} />}
                                            <span className="text-sm">{(e.status ?? 'PENDING').toUpperCase()}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {(['HR', 'ADMIN'].includes(user?.role || '') ? (
                                            <input type="checkbox" checked={!!e.payroll_included} onChange={(ev) => togglePayrollMut.mutate({ expenseId: e.id, payrollIncluded: !!ev.target.checked })} />
                                        ) : (
                                            <span>{String(e.payroll_included ?? false)}</span>
                                        ))}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {(['MANAGER', 'HR', 'ADMIN'].includes(user?.role || '')) && (
                                                <>
                                                    <Button size="sm" variant="ghost" onClick={() => handleApprove(e)} disabled={((e.status || '').toUpperCase() === 'APPROVED') || approveExpenseMut.isPending}>Approve</Button>
                                                    <Button size="sm" variant="outline" onClick={() => openReject(e)} disabled={((e.status || '').toUpperCase() === 'REJECTED') || approveExpenseMut.isPending}>Reject</Button>
                                                </>
                                            )}

                                            {(['HR', 'ADMIN'].includes(user?.role || '')) && (
                                                <>
                                                    <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>Edit</Button>
                                                    <Button size="sm" variant="destructive" onClick={() => openDelete(e)}>Delete</Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Expense</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-2">
                        <Label>Category</Label>
                        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800 text-black dark:text-white border-gray-300 dark:border-gray-600">
                            <option value="">Select category</option>
                            {categories.map((c: any) => (<option value={c.id} key={c.id}>{c.name}</option>))}
                        </select>

                        <Label>Amount</Label>
                        <Input type="number" value={String(amount)} onChange={(e) => setAmount(Number(e.target.value) || '')} />

                        <Label>Expense Date</Label>
                        <DatePicker value={expenseDate} onChange={setExpenseDate} placeholder="Select date" />

                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={payrollIncluded} onChange={(e) => setPayrollIncluded(e.target.checked)} id="payrollIncluded" />
                            <Label htmlFor="payrollIncluded">Include in payroll</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button onClick={handleCreateExpense} isLoading={createExpenseMut.isPending}>Create</Button>
                        <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Expense dialog (HR / Admin) */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Expense</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-2">
                        <Label>Category</Label>
                        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800 text-black dark:text-white border-gray-300 dark:border-gray-600">
                            <option value="">(leave unchanged)</option>
                            {categories.map((c: any) => (<option value={c.id} key={c.id}>{c.name}</option>))}
                        </select>

                        <Label>Amount</Label>
                        <Input type="number" value={String(amount)} onChange={(e) => setAmount(Number(e.target.value) || '')} />

                        <Label>Expense Date</Label>
                        <DatePicker value={expenseDate} onChange={setExpenseDate} placeholder="Select date" />

                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={payrollIncluded} onChange={(e) => setPayrollIncluded(e.target.checked)} id="payrollIncludedEdit" />
                            <Label htmlFor="payrollIncludedEdit">Include in payroll</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button onClick={handleSaveEdit} isLoading={updateExpenseMut.isPending}>Save</Button>
                        <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject confirmation dialog */}
            <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Expense</DialogTitle>
                    </DialogHeader>

                    <div>You're about to reject the expense for <strong>{selectedExpenseForApproval?.category}</strong>. Are you sure?</div>

                    <DialogFooter>
                        <Button variant="destructive" isLoading={approveExpenseMut.isPending} onClick={confirmReject}>Reject</Button>
                        <Button variant="ghost" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation dialog */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Expense</DialogTitle>
                    </DialogHeader>

                    <div>Are you sure you want to delete the expense for <strong>{selectedExpense?.category}</strong> of amount <strong>{selectedExpense?.amount}</strong> ? This is a soft delete.</div>

                    <DialogFooter>
                        <Button variant="destructive" isLoading={deleteExpenseMut.isPending} onClick={confirmDelete}>Delete</Button>
                        <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={catOpen} onOpenChange={setCatOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Category</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-2">
                        <Label>Name</Label>
                        <Input value={catName} onChange={(e) => setCatName(e.target.value)} />

                        <Label>Code</Label>
                        <Input value={catCode} placeholder="AUTO" onChange={(e) => setCatCode(e.target.value)} />

                        <Label>Description (optional)</Label>
                        <Input value={catDescription} onChange={(e) => setCatDescription(e.target.value)} />
                    </div>

                    <DialogFooter>
                        <Button onClick={handleCreateCategory} isLoading={createCategoryMut.isPending}>Create</Button>
                        <Button variant="ghost" onClick={() => setCatOpen(false)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
