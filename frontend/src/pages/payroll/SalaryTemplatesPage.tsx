import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Sidebar } from '@/components/layout/Sidebar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import payrollService, { SalaryStructureTemplate } from '@/services/payroll.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SalaryTemplatesPage: React.FC = () => {
  const { t } = useTranslation();

    const queryClient = useQueryClient();

    const { data: templates = [], isLoading } = useQuery<SalaryStructureTemplate[]>({
        queryKey: ['payroll', 'templates'],
        queryFn: () => payrollService.getSalaryTemplates(),
    });

    const [addOpen, setAddOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<SalaryStructureTemplate | null>(null);

    const [form, setForm] = useState({
        name: '',
        description: '',
        basicPercentage: 50,
        hraPercentage: 20,
        daPercentage: 0,
        specialAllowancePercentage: 30, // Default to fill gap
        otherAllowancePercentage: 0,
    });

    const resetForm = () => {
        setForm({ name: '', description: '', basicPercentage: 50, hraPercentage: 20, daPercentage: 0, specialAllowancePercentage: 30, otherAllowancePercentage: 0 });
        setEditingTemplate(null);
    };

    const createMut = useMutation({
        mutationFn: (payload: Record<string, unknown>) => payrollService.createSalaryTemplate(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'templates'] });
            setAddOpen(false);
            resetForm();
        },
    });

    const updateMut = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => payrollService.updateSalaryTemplate(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'templates'] });
            setAddOpen(false);
            resetForm();
        },
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => payrollService.deleteSalaryTemplate(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'templates'] }),
    });

    const handleSubmit = () => {
        if (!form.name) return;

        // Normalize percentages to avoid strings
        const payload = {
            name: form.name,
            description: form.description,
            basicPercentage: Number(form.basicPercentage),
            hraPercentage: Number(form.hraPercentage),
            daPercentage: Number(form.daPercentage),
            specialAllowancePercentage: Number(form.specialAllowancePercentage),
            otherAllowancePercentage: Number(form.otherAllowancePercentage),
        };

        if (editingTemplate) {
            updateMut.mutate({ id: editingTemplate.id, payload });
        } else {
            createMut.mutate(payload);
        }
    };

    const handleEdit = (t: SalaryStructureTemplate) => {
        setEditingTemplate(t);
        // Extract percentages from components
        const basicComp = t.components.find(c => c.code === 'BASIC' || c.name.toLowerCase().includes('basic'));
        const hraComp = t.components.find(c => c.code === 'HRA' || c.name.toLowerCase().includes('hra'));
        const daComp = t.components.find(c => c.code === 'DA' || c.name.toLowerCase().includes('da'));
        const specialComp = t.components.find(c => c.code === 'SPL' || c.name.toLowerCase().includes('special'));
        const otherComp = t.components.find(c => c.code === 'OTHR' || c.name.toLowerCase().includes('other'));
        
        setForm({
            name: t.name,
            description: t.description || '',
            basicPercentage: basicComp?.percentage || 0,
            hraPercentage: hraComp?.percentage || 0,
            daPercentage: daComp?.percentage || 0,
            specialAllowancePercentage: specialComp?.percentage || 0,
            otherAllowancePercentage: otherComp?.percentage || 0,
        });
        setAddOpen(true);
    };

    return (
        <DashboardLayout title="Salary Templates" breadcrumbs={[{ label: t('common.breadcrumbs.payroll'), href: '/payroll' }, { label: 'Templates' }]}>
            <Sidebar />

            <div className="flex justify-end mb-4">
                <Button onClick={() => { resetForm(); setAddOpen(true); }}><Plus size={16} className="mr-2" /> New Template</Button>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Basic %</TableHead>
                            <TableHead>HRA %</TableHead>
                            <TableHead>Special %</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={5}>{t('common.loading')}</TableCell></TableRow> :
                            templates.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center p-4">No templates found</TableCell></TableRow> :
                                templates.map(t => {
                                        // Extract percentages from components
                                        const basicComp = t.components.find(c => c.code === 'BASIC' || c.name.toLowerCase().includes('basic'));
                                        const hraComp = t.components.find(c => c.code === 'HRA' || c.name.toLowerCase().includes('hra'));
                                        const specialComp = t.components.find(c => c.code === 'SPL' || c.name.toLowerCase().includes('special'));
                                        return (
                                            <TableRow key={t.id}>
                                                <TableCell>
                                                    <div className="font-medium">{t.name}</div>
                                                    <div className="text-xs text-gray-500">{t.description}</div>
                                                </TableCell>
                                                <TableCell>{basicComp?.percentage ?? 0}%</TableCell>
                                                <TableCell>{hraComp?.percentage ?? 0}%</TableCell>
                                                <TableCell>{specialComp?.percentage ?? 0}%</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="ghost" onClick={() => handleEdit(t)}><Edit2 size={16} /></Button>
                                                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => deleteMut.mutate(t.id)}><Trash2 size={16} /></Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                        }
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingTemplate ? 'Edit' : 'Create'} Template</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                        <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>

                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Basic %</Label><Input type="number" value={form.basicPercentage} onChange={e => setForm({ ...form, basicPercentage: Number(e.target.value) })} /></div>
                            <div><Label>HRA %</Label><Input type="number" value={form.hraPercentage} onChange={e => setForm({ ...form, hraPercentage: Number(e.target.value) })} /></div>
                            <div><Label>DA %</Label><Input type="number" value={form.daPercentage} onChange={e => setForm({ ...form, daPercentage: Number(e.target.value) })} /></div>
                            <div><Label>Special Allow. %</Label><Input type="number" value={form.specialAllowancePercentage} onChange={e => setForm({ ...form, specialAllowancePercentage: Number(e.target.value) })} /></div>
                            <div><Label>Other Allow. %</Label><Input type="number" value={form.otherAllowancePercentage} onChange={e => setForm({ ...form, otherAllowancePercentage: Number(e.target.value) })} /></div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSubmit}>{editingTemplate ? 'Save Changes' : 'Create'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export { SalaryTemplatesPage };
