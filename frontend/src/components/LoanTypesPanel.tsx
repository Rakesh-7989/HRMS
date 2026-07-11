import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import payrollService from '@/services/payroll.service';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const LoanTypesPanel: React.FC<{ onCreated?: (lt: any) => void }> = ({ onCreated }) => {
  const { user } = useAuth();
  const role = user?.role || 'EMPLOYEE';
  const canManage = ['HR', 'ADMIN'].includes(role);

  const queryClient = useQueryClient();
  // only HR/Admin can fetch and manage loan types (backend enforces access)
  const { data: loanTypes = [], isLoading, error } = useQuery<any[], unknown>({
    queryKey: ['payroll', 'loan-types'],
    queryFn: () => payrollService.listLoanTypes(),
    enabled: canManage,
  });

  useEffect(() => {
    if (error) {
      const err = error as any;
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to load loan types');
    }
  }, [error]);

  // dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // feedback
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // form fields
  const [name, setName] = useState('');
  const [interestRate, setInterestRate] = useState<number | ''>('');
  const [interestType, setInterestType] = useState<'FLAT' | 'REDUCING'>('FLAT');
  const [maxAmount, setMaxAmount] = useState<number | ''>('');
  const [maxTenureMonths, setMaxTenureMonths] = useState<number | ''>('');
  const [isTaxable, setIsTaxable] = useState<boolean>(false);
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<any | null>(null);

  const createMut = useMutation({
    mutationFn: (payload: any) => payrollService.createLoanType(payload),
    onSuccess: (data: any) => {
      // Use returned data for messages / callbacks
      queryClient.invalidateQueries({ queryKey: ['payroll', 'loan-types'] });
      setCreateOpen(false);
      // capture name before clearing
      const createdName = data?.name || data?.id || 'loan type';
      setName(''); setInterestRate(''); setInterestType('FLAT'); setMaxAmount(''); setMaxTenureMonths(''); setIsTaxable(false); setDescription('');
      setSuccessMsg(`Created loan type "${createdName}"`);
      setTimeout(() => setSuccessMsg(''), 3000);
      setErrorMsg('');
      if (onCreated) onCreated(data);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Failed to create loan type');
      setSuccessMsg('');
    }
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => payrollService.updateLoanType(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'loan-types'] });
      setEditOpen(false);
      setSelected(null);
      setSuccessMsg('Loan type updated');
      setTimeout(() => setSuccessMsg(''), 3000);
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Failed to update loan type');
      setSuccessMsg('');
    }
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => payrollService.deleteLoanType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'loan-types'] });
      setSuccessMsg('Loan type deleted');
      setTimeout(() => setSuccessMsg(''), 3000);
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Failed to delete loan type');
      setSuccessMsg('');
    }
  });

  const openEdit = (lt: any) => {
    setSelected(lt);
    setName(lt.name || '');
    setInterestRate(lt.interest_rate ?? lt.interestRate ?? '');
    setInterestType((lt.interest_type || lt.interestType || 'FLAT') as any);
    setMaxAmount(lt.max_amount ?? lt.maxAmount ?? '');
    setMaxTenureMonths(lt.max_tenure_months ?? lt.maxTenureMonths ?? '');
    setIsTaxable(lt.is_taxable ?? lt.isTaxable ?? false);
    setDescription(lt.description || '');
    setEditOpen(true);
  };

  const handleCreate = () => {
    if (!name || name.trim().length < 2) {
      setErrorMsg('Name is required and must be at least 2 characters');
      setSuccessMsg('');
      return;
    }
    if (interestRate !== '' && Number(interestRate) < 0) {
      setErrorMsg('Interest rate must be zero or positive');
      setSuccessMsg('');
      return;
    }
    if (maxAmount !== '' && Number(maxAmount) <= 0) {
      setErrorMsg('Max amount must be greater than 0');
      setSuccessMsg('');
      return;
    }
    if (maxTenureMonths !== '' && (!Number.isInteger(Number(maxTenureMonths)) || Number(maxTenureMonths) <= 0)) {
      setErrorMsg('Max tenure must be a positive integer (months)');
      setSuccessMsg('');
      return;
    }
    setErrorMsg('');
    const payload = { name: name.trim(), interestRate: Number(interestRate || 0), interestType, maxAmount: maxAmount ? Number(maxAmount) : undefined, maxTenureMonths: maxTenureMonths ? Number(maxTenureMonths) : undefined, isTaxable };
    createMut.mutate(payload);
  };

  const handleUpdate = () => {
    if (!selected) return;
    if (!name || name.trim().length < 2) {
      setErrorMsg('Name is required and must be at least 2 characters');
      setSuccessMsg('');
      return;
    }
    if (interestRate !== '' && Number(interestRate) < 0) {
      setErrorMsg('Interest rate must be zero or positive');
      setSuccessMsg('');
      return;
    }
    if (maxTenureMonths !== '' && (!Number.isInteger(Number(maxTenureMonths)) || Number(maxTenureMonths) <= 0)) {
      setErrorMsg('Max tenure must be a positive integer (months)');
      setSuccessMsg('');
      return;
    }
    setErrorMsg('');
    const payload: any = { name: name.trim(), interestRate: Number(interestRate || 0), interestType, isTaxable };
    if (maxAmount) payload.maxAmount = Number(maxAmount);
    if (maxTenureMonths) payload.maxTenureMonths = Number(maxTenureMonths);
    if (description) payload.description = description;
    updateMut.mutate({ id: selected.id, payload });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="space-x-2">
          {canManage ? (
            <>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2" size={16} />
                Add Loan Type
              </Button>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Only HR and Admin can manage loan types.</div>
          )}
        </div>
      </div>

      {successMsg && <div className="mb-4 p-2 rounded bg-green-50 text-green-800">{successMsg}</div>}
      {errorMsg && <div className="mb-4 p-2 rounded bg-red-50 text-red-800">{errorMsg}</div>}

      {!canManage && (
        <div className="mb-4 p-3 bg-muted/20 rounded-md text-sm text-muted-foreground">Only HR and Admin can view or manage loan types from this page. Contact HR to request a loan type.</div>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Interest Rate</TableHead>
              <TableHead>Interest Type</TableHead>
              <TableHead>Max Amount</TableHead>
              <TableHead>Max Tenure</TableHead>
              <TableHead>Taxable</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell>Loading...</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            ) : loanTypes.length === 0 ? (
              <TableRow>
                <TableCell>No loan types found</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            ) : (
              loanTypes.map((lt: any) => (
                <TableRow key={lt.id}>
                  <TableCell>{lt.name ?? '—'}</TableCell>
                  <TableCell>{lt.interest_rate ?? lt.interestRate ?? '—'}</TableCell>
                  <TableCell>{lt.interest_type ?? lt.interestType ?? '—'}</TableCell>
                  <TableCell>{lt.max_amount ?? lt.maxAmount ?? '—'}</TableCell>
                  <TableCell>{lt.max_tenure_months ?? lt.maxTenureMonths ?? '—'}</TableCell>
                  <TableCell>{(lt.is_taxable ?? lt.isTaxable) ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    {canManage ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(lt)}>
                          <Edit size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete this loan type?')) deleteMut.mutate(lt.id); }} isLoading={deleteMut.isPending}>
                          <Trash2 size={16} className="text-red-600" />
                        </Button>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">Read-only</div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Loan Type</DialogTitle>
          </DialogHeader>

          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />

            <Label>Interest Rate (%)</Label>
            <Input type="number" value={String(interestRate)} onChange={(e) => setInterestRate(Number(e.target.value) || '')} placeholder="Interest %" />

            <Label>Interest Type</Label>
            <select
              value={interestType}
              onChange={(e) => setInterestType(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-md mt-1 bg-white text-gray-900 border-gray-200 dark:bg-gray-950 dark:text-gray-50 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            >
              <option value="FLAT">FLAT</option>
              <option value="REDUCING">REDUCING</option>
            </select>

            <Label>Max Amount (optional)</Label>
            <Input type="number" value={String(maxAmount)} onChange={(e) => setMaxAmount(Number(e.target.value) || '')} placeholder="Max amount" />

            <Label>Max Tenure (months, optional)</Label>
            <Input type="number" value={String(maxTenureMonths)} onChange={(e) => setMaxTenureMonths(Number(e.target.value) || '')} placeholder="Max tenure in months" />

            <Label>Is Taxable</Label>
            <div className="flex items-center space-x-2">
              <input id="isTaxableCreate" type="checkbox" checked={isTaxable} onChange={(e) => setIsTaxable(e.target.checked)} />
              <Label htmlFor="isTaxableCreate">{isTaxable ? 'Yes' : 'No'}</Label>
            </div>

            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          </div>

          <DialogFooter>
            <Button isLoading={createMut.isPending} onClick={handleCreate}>Create</Button>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Loan Type</DialogTitle>
          </DialogHeader>

          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />

            <Label>Interest Rate (%)</Label>
            <Input type="number" value={String(interestRate)} onChange={(e) => setInterestRate(Number(e.target.value) || '')} placeholder="Interest %" />

            <Label>Interest Type</Label>
            <select
              value={interestType}
              onChange={(e) => setInterestType(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-md mt-1 bg-white text-gray-900 border-gray-200 dark:bg-gray-950 dark:text-gray-50 dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            >
              <option value="FLAT">FLAT</option>
              <option value="REDUCING">REDUCING</option>
            </select>

            <Label>Max Amount (optional)</Label>
            <Input type="number" value={String(maxAmount)} onChange={(e) => setMaxAmount(Number(e.target.value) || '')} placeholder="Max amount" />

            <Label>Max Tenure (months, optional)</Label>
            <Input type="number" value={String(maxTenureMonths)} onChange={(e) => setMaxTenureMonths(Number(e.target.value) || '')} placeholder="Max tenure in months" />

            <Label>Is Taxable</Label>
            <div className="flex items-center space-x-2">
              <input id="isTaxableEdit" type="checkbox" checked={isTaxable} onChange={(e) => setIsTaxable(e.target.checked)} />
              <Label htmlFor="isTaxableEdit">{isTaxable ? 'Yes' : 'No'}</Label>
            </div>

            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          </div>

          <DialogFooter>
            <Button isLoading={updateMut.isPending} onClick={handleUpdate}>Save</Button>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LoanTypesPanel;
