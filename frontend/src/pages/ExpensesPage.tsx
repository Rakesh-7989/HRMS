import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import payrollService, { Expense, ExpenseCategory } from '@/services/payroll.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { CheckCircle, XCircle, Clock, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ExpensesPage: React.FC = () => {
  const { t } = useTranslation();

  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  const canCreate = hasPermission('expenses', 'create');
  const canApprove = hasPermission('expenses', 'approve');
  const canManageCategories = hasPermission('expenses', 'manage_categories');
  const canTogglePayroll = hasPermission('expenses', 'toggle_payroll');
  const canUpdate = hasPermission('payroll', 'manage'); // Falling back to payroll:manage for edit/delete if specific not found
  const canDelete = hasPermission('payroll', 'manage');

  const { data: expenses = [], refetch } = useQuery<Expense[]>({ queryKey: ['payroll', 'expenses'], queryFn: () => payrollService.listExpenses(), enabled: !!user });
  const { data: categories = [] } = useQuery<ExpenseCategory[]>({ queryKey: ['payroll', 'expense-categories'], queryFn: () => payrollService.listExpenseCategories(), enabled: !!user });

  const [addOpen, setAddOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [expenseDate, setExpenseDate] = useState('');
  const [payrollIncluded, setPayrollIncluded] = useState(false);

  const createExpenseMut = useMutation({ mutationFn: (payload: Record<string, unknown>) => (payrollService.createExpense as (p: Record<string, unknown>) => Promise<unknown>)(payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll', 'expenses'] }); queryClient.invalidateQueries({ queryKey: ['payroll', 'summary'] }); setAddOpen(false); setCategoryId(''); setAmount(''); setExpenseDate(''); setPayrollIncluded(false); } });
  const createCategoryMut = useMutation({ mutationFn: (payload: Record<string, unknown>) => (payrollService.createExpenseCategory as (p: Record<string, unknown>) => Promise<unknown>)(payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'expense-categories'] }) });

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
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedExpenseForApproval, setSelectedExpenseForApproval] = useState<Expense | null>(null);

  const updateExpenseMut = useMutation({
    mutationFn: ({ expenseId, payload }: { expenseId: string; payload: Record<string, unknown> }) => payrollService.updateExpense(expenseId, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll', 'expenses'] }); queryClient.invalidateQueries({ queryKey: ['payroll', 'summary'] }); setEditOpen(false); setSelectedExpense(null); }
  });

  const deleteExpenseMut = useMutation({
    mutationFn: (expenseId: string) => payrollService.deleteExpense(expenseId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll', 'expenses'] }); queryClient.invalidateQueries({ queryKey: ['payroll', 'summary'] }); setDeleteOpen(false); setSelectedExpense(null); }
  });

  const approveExpenseMut = useMutation({
    mutationFn: ({ expenseId, payload }: { expenseId: string; payload: Record<string, unknown> }) => (payrollService.approveExpense as (id: string, p: Record<string, unknown>) => Promise<unknown>)(expenseId, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll', 'expenses'] }); queryClient.invalidateQueries({ queryKey: ['payroll', 'summary'] }); setApproveDialogOpen(false); setSelectedExpenseForApproval(null); }
  });

  const togglePayrollMut = useMutation({
    mutationFn: ({ expenseId, payrollIncluded }: { expenseId: string; payrollIncluded: boolean }) => payrollService.setExpensePayrollInclusion(expenseId, payrollIncluded),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll', 'expenses'] }); queryClient.invalidateQueries({ queryKey: ['payroll', 'summary'] }); }
  });

  // helpers
  const openEdit = (e: Expense) => {
    setSelectedExpense(e);
    setCategoryId((e.category_id || e.categoryId || '') as string);
    setAmount((e.amount || '') as number | '');
    setExpenseDate((e.expense_date || e.expenseDate || '') as string);
    setPayrollIncluded(!!e.payroll_included);
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedExpense) return;
    const payload: Record<string, unknown> = {};
    if (categoryId) payload.categoryId = categoryId;
    if (amount !== '') payload.amount = Number(amount);
    if (expenseDate) payload.expenseDate = expenseDate;
    payload.payrollIncluded = !!payrollIncluded;
    updateExpenseMut.mutate({ expenseId: selectedExpense.id as string, payload });
  };

  const openDelete = (e: Expense) => { setSelectedExpense(e); setDeleteOpen(true); };
  const confirmDelete = () => { if (selectedExpense) deleteExpenseMut.mutate(selectedExpense.id as string); };

  const handleApprove = (e: Expense) => { approveExpenseMut.mutate({ expenseId: e.id as string, payload: { status: 'APPROVED' } }); };
  const openReject = (e: Expense) => { setSelectedExpenseForApproval(e); setApproveDialogOpen(true); };
  const confirmReject = () => { if (selectedExpenseForApproval) approveExpenseMut.mutate({ expenseId: selectedExpenseForApproval.id as string, payload: { status: 'REJECTED' } }); };
  return (
    <DashboardLayout title={t('expenses.title')}>
      {/* Sidebar removed - already in DashboardLayout */}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          )}
          {canManageCategories && (
            <Button variant="outline" onClick={() => setCatOpen(true)}>Add Category</Button>
          )}
          <Button variant="ghost" onClick={() => refetch()}>{t('common.refresh')}</Button>
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
              expenses.map((e: Expense) => (
                <TableRow key={e.id as string}>
                  <TableCell>{e.category as string}</TableCell>
                  <TableCell>₹{Number(e.amount as number).toLocaleString('en-IN')}</TableCell>
                  <TableCell>{e.expense_date as string}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {((e.status as string || 'PENDING').toUpperCase() === 'APPROVED') && <CheckCircle className="text-green-600" size={16} />}
                      {((e.status as string || 'PENDING').toUpperCase() === 'REJECTED') && <XCircle className="text-red-600" size={16} />}
                      {((e.status as string || 'PENDING').toUpperCase() === 'PENDING') && <Clock className="text-yellow-500" size={16} />}
                      <span className="text-sm">{(e.status as string ?? 'PENDING').toUpperCase()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {canTogglePayroll ? (
                      <input type="checkbox" checked={!!e.payroll_included} onChange={(ev) => togglePayrollMut.mutate({ expenseId: e.id as string, payrollIncluded: !!ev.target.checked })} />
                    ) : (
                      <span>{String(!!e.payroll_included)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {canApprove && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => handleApprove(e)} disabled={((e.status as string || '').toUpperCase() === 'APPROVED') || approveExpenseMut.isPending}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => openReject(e)} disabled={((e.status as string || '').toUpperCase() === 'REJECTED') || approveExpenseMut.isPending}>Reject</Button>
                        </>
                      )}

                      {(canUpdate || canDelete) && (
                        <>
                          {canUpdate && <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>Edit</Button>}
                          {canDelete && <Button size="sm" variant="destructive" onClick={() => openDelete(e)}>{t('common.delete')}</Button>}
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
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-3 py-2 border rounded-md">
              <option value="">Select category</option>
              {categories.map((c: ExpenseCategory) => (<option value={c.id as string} key={c.id as string}>{c.name as string}</option>))}
            </select>

            <Label>Amount</Label>
            <Input type="number" value={String(amount)} onChange={(e) => setAmount(Number(e.target.value) || '')} />

            <Label>Expense Date</Label>
            <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />

            <div className="flex items-center gap-2">
              <input type="checkbox" checked={payrollIncluded} onChange={(e) => setPayrollIncluded(e.target.checked)} id="payrollIncluded" />
              <Label htmlFor="payrollIncluded">Include in payroll</Label>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleCreateExpense} isLoading={createExpenseMut.isPending}>Create</Button>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>{t('common.cancel')}</Button>
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
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-3 py-2 border rounded-md">
              <option value="">(leave unchanged)</option>
              {categories.map((c: ExpenseCategory) => (<option value={c.id as string} key={c.id as string}>{c.name as string}</option>))}
            </select>

            <Label>Amount</Label>
            <Input type="number" value={String(amount)} onChange={(e) => setAmount(Number(e.target.value) || '')} />

            <Label>Expense Date</Label>
            <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />

            <div className="flex items-center gap-2">
              <input type="checkbox" checked={payrollIncluded} onChange={(e) => setPayrollIncluded(e.target.checked)} id="payrollIncludedEdit" />
              <Label htmlFor="payrollIncludedEdit">Include in payroll</Label>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSaveEdit} isLoading={updateExpenseMut.isPending}>{t('common.save')}</Button>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>{t('common.cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject confirmation dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Expense</DialogTitle>
          </DialogHeader>

          <div>You're about to reject the expense for <strong>{selectedExpenseForApproval?.category as string}</strong>. Are you sure?</div>

          <DialogFooter>
            <Button variant="destructive" isLoading={approveExpenseMut.isPending} onClick={confirmReject}>Reject</Button>
            <Button variant="ghost" onClick={() => setApproveDialogOpen(false)}>{t('common.cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
          </DialogHeader>

          <div>Are you sure you want to delete the expense for <strong>{selectedExpense?.category as string}</strong> of amount <strong>{selectedExpense?.amount as number}</strong> ? This is a soft delete.</div>

          <DialogFooter>
            <Button variant="destructive" isLoading={deleteExpenseMut.isPending} onClick={confirmDelete}>{t('common.delete')}</Button>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>{t('common.cancel')}</Button>
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
            <Button variant="ghost" onClick={() => setCatOpen(false)}>{t('common.cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
};

export { ExpensesPage };
