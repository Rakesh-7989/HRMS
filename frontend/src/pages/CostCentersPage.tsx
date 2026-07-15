import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Sidebar } from '@/components/layout/Sidebar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import payrollService from '@/services/payroll.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useTranslation } from 'react-i18next';

const CostCentersPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: costCenters = [], isLoading, refetch } = useQuery<Record<string, unknown>[]>({ queryKey: ['payroll', 'cost-centers'], queryFn: () => payrollService.listCostCenters() });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [allocated, setAllocated] = useState<number | ''>('');

  const createMut = useMutation({ mutationFn: (payload: unknown) => (payrollService as unknown as { createCostCenter: (payload: unknown) => Promise<unknown> }).createCostCenter(payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'cost-centers'] }) });

  const handleCreate = () => {
    if (!name) return;
    createMut.mutate({ name, allocated: Number(allocated || 0) }, { onSuccess: () => setOpen(false) });
  };

  return (
    <DashboardLayout title={t('organisation.costCenters')}>
      <Sidebar />

      <div className="flex items-center justify-between mb-4">
        <div className="space-x-2">
          <Button onClick={() => setOpen(true)}>Add Cost Center</Button>
          <Button variant="outline" onClick={() => refetch()}>{t('common.refresh')}</Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Allocated</TableHead>
              <TableHead>Spent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell>{t('common.loading')}</TableCell><TableCell>-</TableCell><TableCell>-</TableCell></TableRow>
            ) : costCenters.length === 0 ? (
              <TableRow><TableCell>No cost centers</TableCell><TableCell>-</TableCell><TableCell>-</TableCell></TableRow>
            ) : (
              costCenters.map((c: Record<string, unknown>) => (<TableRow key={c.id as string}><TableCell>{c.name as string}</TableCell><TableCell>{c.allocated as number}</TableCell><TableCell>{c.spent as number}</TableCell></TableRow>))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cost Center</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Label>Allocated</Label>
            <Input value={allocated} onChange={(e) => setAllocated(Number(e.target.value))} type="number" />
          </div>
          <DialogFooter>
            <Button onClick={handleCreate}>Create</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
};

export { CostCentersPage };