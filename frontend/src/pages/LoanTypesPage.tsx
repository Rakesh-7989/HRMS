import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
import { usePermissions } from '@/contexts/PermissionsContext';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/contexts/ConfirmContext';

export const LoanTypesPage: React.FC = () => {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  useAuth();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('payroll', 'manage');

  const queryClient = useQueryClient();
  const { data: loanTypes = [], isLoading } = useQuery({ queryKey: ['payroll', 'loan-types'], queryFn: () => payrollService.listLoanTypes(), enabled: canManage });

  // dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // form fields
  const [name, setName] = useState('');
  const [interestRate, setInterestRate] = useState<number | ''>('');
  const [interestType, setInterestType] = useState<'FLAT' | 'REDUCING'>('FLAT');
  const [maxAmount, setMaxAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => payrollService.createLoanType(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'loan-types'] });
      setCreateOpen(false);
      setName(''); setInterestRate(''); setInterestType('FLAT'); setMaxAmount(''); setDescription('');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => payrollService.updateLoanType(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'loan-types'] });
      setEditOpen(false);
      setSelected(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => payrollService.deleteLoanType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'loan-types'] });
    },
  });

  const openEdit = (lt: Record<string, unknown>) => {
    setSelected(lt);
    setName(lt.name as string || '');
    setInterestRate(Number((lt.interest_rate as string | number) ?? (lt.interestRate as string | number) ?? '') || '');
    setInterestType(((lt.interest_type || lt.interestType || 'FLAT') as string) as 'FLAT' | 'REDUCING');
    setMaxAmount(Number((lt.max_amount as string | number) ?? (lt.maxAmount as string | number) ?? '') || '');
    setDescription((lt.description as string) || '');
    setEditOpen(true);
  };

  const handleCreate = () => {
    if (!name) return;
    createMut.mutate({ name, interest_rate: Number(interestRate || 0), interest_type: interestType, max_amount: maxAmount ? Number(maxAmount) : undefined, description: description || undefined });
  };

  const handleUpdate = () => {
    if (!selected) return;
    const payload: Record<string, unknown> = { name, interest_rate: Number(interestRate || 0), interest_type: interestType };
    if (maxAmount) payload.max_amount = Number(maxAmount);
    if (description) payload.description = description;
    updateMut.mutate({ id: selected.id as string, payload });
  };

  return (
    <DashboardLayout title="Loan Types" breadcrumbs={[{ label: t('common.breadcrumbs.payroll'), href: '/payroll' }, { label: 'Loan Types' }]}>
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

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Interest Rate</TableHead>
              <TableHead>Interest Type</TableHead>
              <TableHead>Max Amount</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell>{t('common.loading')}</TableCell>
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
              (loanTypes as unknown as Record<string, unknown>[]).map((lt: Record<string, unknown>) => (
                <TableRow key={lt.id as string}>
                  <TableCell>{lt.name as string}</TableCell>
                  <TableCell>{(lt.interest_rate as string | number) ?? (lt.interestRate as string | number) ?? 'â€”'}</TableCell>
                  <TableCell>{((lt.interest_type as string) || (lt.interestType as string) || 'â€”').toString()}</TableCell>
                  <TableCell>{(lt.max_amount as number) ?? (lt.maxAmount as number) ? `â‚¹${Number((lt.max_amount as number) ?? (lt.maxAmount as number)).toLocaleString('en-IN')}` : 'â€”'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(lt)}>
                      <Edit size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={async () => { if (await confirm({ type: 'destructive', title: 'Delete Loan Type', message: 'Delete this loan type?' })) deleteMut.mutate(lt.id as string); }} isLoading={deleteMut.isPending}>
                      <Trash2 size={16} className="text-red-600" />
                    </Button>
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
            <select value={interestType} onChange={(e) => setInterestType(e.target.value as 'FLAT' | 'REDUCING')} className="w-full px-3 py-2 border rounded-md mt-1">
              <option value="FLAT">FLAT</option>
              <option value="REDUCING">REDUCING</option>
            </select>

            <Label>Max Amount (optional)</Label>
            <Input type="number" value={String(maxAmount)} onChange={(e) => setMaxAmount(Number(e.target.value) || '')} placeholder="Max amount" />

            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          </div>

          <DialogFooter>
            <Button isLoading={createMut.isPending} onClick={handleCreate}>Create</Button>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
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
            <select value={interestType} onChange={(e) => setInterestType(e.target.value as 'FLAT' | 'REDUCING')} className="w-full px-3 py-2 border rounded-md mt-1">
              <option value="FLAT">FLAT</option>
              <option value="REDUCING">REDUCING</option>
            </select>

            <Label>Max Amount (optional)</Label>
            <Input type="number" value={String(maxAmount)} onChange={(e) => setMaxAmount(Number(e.target.value) || '')} placeholder="Max amount" />

            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          </div>

          <DialogFooter>
            <Button isLoading={updateMut.isPending} onClick={handleUpdate}>{t('common.save')}</Button>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>{t('common.cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

