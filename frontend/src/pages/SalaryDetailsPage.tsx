import React, { useState, useEffect } from 'react';
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

import { usePermissions } from '@/contexts/PermissionsContext';

const SalaryDetailsPage: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const canManageSalary = hasPermission('payroll', 'manage_salary');
  const queryClient = useQueryClient();
  const { data: components = [] } = useQuery<any[]>({ queryKey: ['payroll', 'salary-components'], queryFn: () => payrollService.listSalaryComponents() });
  const { data: structure = {} } = useQuery<any>({ queryKey: ['payroll', 'salary-structure'], queryFn: () => payrollService.getSalaryStructure() });

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');

  const createComponentMut = useMutation({ mutationFn: (payload: any) => payrollService.createSalaryComponent(payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'salary-components'] }) });
  const updateStructureMut = useMutation({ mutationFn: (payload: any) => payrollService.updateSalaryStructure(payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'salary-structure'] }) });

  const [basic, setBasic] = useState<number | ''>('');
  const [hra, setHra] = useState<number | ''>(20);
  const [otherAllowances, setOtherAllowances] = useState<number | ''>('');

  useEffect(() => {
    if (structure) {
      setBasic(structure.basic ?? '');
      setHra(structure.hra_percent ?? 20);
      setOtherAllowances(structure.other_allowances ?? '');
    }
  }, [structure]);

  const handleSaveStructure = () => {
    updateStructureMut.mutate({ basic: Number(basic || 0), hra_percent: Number(hra || 0), other_allowances: Number(otherAllowances || 0) });
  };

  return (
    <DashboardLayout title={t('payroll.salaryDetails')}>
      <Sidebar />

      <div className="flex items-center justify-between mb-4">
        <div className="space-x-2">
          {canManageSalary && (
            <>
              <Button onClick={() => setAddOpen(true)}>Add Component</Button>
              <Button onClick={handleSaveStructure} variant="outline">Save Structure</Button>
            </>
          )}
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['payroll', 'salary-components'] })}>{t('common.refresh')}</Button>
        </div>
      </div>

      <Card className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Components</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {components.length === 0 ? (
              <TableRow><TableCell>No components</TableCell><TableCell>-</TableCell></TableRow>
            ) : (
              components.map((c: any) => (<TableRow key={c.id}><TableCell>{c.name}</TableCell><TableCell>{c.amount}</TableCell></TableRow>))
            )}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-2">Structure</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Basic</Label>
            <Input value={basic as any} onChange={(e) => setBasic(Number(e.target.value))} type="number" />
          </div>
          <div>
            <Label>HRA %</Label>
            <Input value={hra as any} onChange={(e) => setHra(Number(e.target.value))} type="number" />
          </div>
          <div>
            <Label>Other allowances</Label>
            <Input value={otherAllowances as any} onChange={(e) => setOtherAllowances(Number(e.target.value))} type="number" />
          </div>
        </div>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Salary Component</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Label>Amount</Label>
            <Input value={amount as any} onChange={(e) => setAmount(Number(e.target.value))} type="number" />
          </div>
          <DialogFooter>
            <Button onClick={() => createComponentMut.mutate({ name, amount: Number(amount || 0) }, { onSuccess: () => setAddOpen(false) })}>Create</Button>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>{t('common.cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
};

export default SalaryDetailsPage;