import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import payrollService, { StatutoryConfig, PTSlab, DeductionType } from '@/services/finance/payroll.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Trash2, Plus } from 'lucide-react';

const StatutoryPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'config' | 'pt' | 'deductions' | 'cc'>('config');

    // --- CONFIG TAB ---
    const { data: config } = useQuery<StatutoryConfig>({
        queryKey: ['statutory', 'config'],
        queryFn: () => payrollService.getStatutoryConfig(),
    });

    const [configForm, setConfigForm] = useState<Partial<StatutoryConfig>>({});

    useEffect(() => {
        if (config) setConfigForm(config);
    }, [config]);

    const updateConfigMut = useMutation({
        mutationFn: (payload: Partial<StatutoryConfig>) => payrollService.updateStatutoryConfig(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['statutory', 'config'] });
            // Optional success toast
        }
    });

    const handleConfigSave = () => {
        updateConfigMut.mutate(configForm);
    };

    // --- PT SLABS TAB ---
    const { data: ptSlabs = [] } = useQuery<PTSlab[]>({
        queryKey: ['statutory', 'pt-slabs'],
        queryFn: () => payrollService.getPTSlabs(),
    });

    const [ptOpen, setPtOpen] = useState(false);
    const [ptForm, setPtForm] = useState({ state: '', minSalary: '', maxSalary: '', monthlyTax: '' });

    const createPtMut = useMutation({
        mutationFn: (payload: Partial<PTSlab>) => payrollService.createPTSlab(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['statutory', 'pt-slabs'] });
            setPtOpen(false); setPtForm({ state: '', minSalary: '', maxSalary: '', monthlyTax: '' });
        }
    });

    const deletePtMut = useMutation({
        mutationFn: (id: string) => payrollService.deletePTSlab(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['statutory', 'pt-slabs'] })
    });

    const handlePtSubmit = () => {
        createPtMut.mutate({
            state: ptForm.state,
            min_salary: Number(ptForm.minSalary),
            max_salary: ptForm.maxSalary ? Number(ptForm.maxSalary) : undefined,
            monthly_tax: Number(ptForm.monthlyTax)
        });
    };

    // --- DEDUCTION TYPES TAB ---
    const { data: dedTypes = [] } = useQuery<DeductionType[]>({
        queryKey: ['statutory', 'deduction-types'],
        queryFn: () => payrollService.getDeductionTypes(),
    });

    const [dedOpen, setDedOpen] = useState(false);
    const [dedForm, setDedForm] = useState({
        name: '',
        code: '',
        isStatutory: false,
        category: 'OTHER',
        calculationType: 'FIXED'
    });

    const createDedMut = useMutation({
        mutationFn: (payload: Partial<DeductionType>) => payrollService.createDeductionType(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['statutory', 'deduction-types'] });
            setDedOpen(false);
            setDedForm({ name: '', code: '', isStatutory: false, category: 'OTHER', calculationType: 'FIXED' });
        }
    });

    const handleDedSubmit = () => {
        createDedMut.mutate({
            name: dedForm.name,
            code: dedForm.code || dedForm.name.toUpperCase().replace(/\s+/g, '_'),
            category: dedForm.category as any,
            is_statutory: dedForm.isStatutory,
            calculation_type: dedForm.calculationType as any,
            is_taxable: true,
            is_recurring: true
        });
    };

    // --- COST CENTERS TAB ---
    const { data: costCenters = [] } = useQuery<any[]>({
        queryKey: ['payroll', 'cost-centers'],
        queryFn: () => payrollService.getCostCenters()
    });

    const [ccOpen, setCcOpen] = useState(false);
    const [ccName, setCcName] = useState('');
    const [ccAlloc, setCcAlloc] = useState<number | ''>('');

    const createCcMut = useMutation({
        mutationFn: (payload: any) => payrollService.createCostCenter(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'cost-centers'] });
            setCcOpen(false); setCcName(''); setCcAlloc('');
        }
    });

    const handleCcCreate = () => {
        createCcMut.mutate({ name: ccName, budgetAllocated: Number(ccAlloc || 0) });
    };

    return (
        <DashboardLayout
            title="Statutory & Compliance"
            breadcrumbs={[{ label: 'Payroll', href: '/payroll' }, { label: 'Statutory' }]}
            actions={
                <Button variant="outline" onClick={() => navigate('/payroll')}>
                    Back
                </Button>
            }
        >
            <Card className="p-6">
                <div className="flex border-b mb-6">
                    <button
                        className={`px-4 py-2 ${activeTab === 'config' ? 'border-b-2 border-primary font-semibold' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('config')}
                    >Configuration</button>
                    <button
                        className={`px-4 py-2 ${activeTab === 'pt' ? 'border-b-2 border-primary font-semibold' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('pt')}
                    >PT Slabs</button>
                    <button
                        className={`px-4 py-2 ${activeTab === 'deductions' ? 'border-b-2 border-primary font-semibold' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('deductions')}
                    >Deduction Types</button>
                    <button
                        className={`px-4 py-2 ${activeTab === 'cc' ? 'border-b-2 border-primary font-semibold' : 'text-gray-500'}`}
                        onClick={() => setActiveTab('cc')}
                    >Cost Centers</button>
                </div>

                {activeTab === 'config' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold mb-4 text-lg">Provident Fund (PF)</h3>
                            <div className="space-y-4">
                                <div>
                                    <Label>PF Employee Rate (%)</Label>
                                    <Input type="number" value={configForm.pf_employee_rate || ''} onChange={e => setConfigForm({ ...configForm, pf_employee_rate: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <Label>PF Employer Rate (%)</Label>
                                    <Input type="number" value={configForm.pf_employer_rate || ''} onChange={e => setConfigForm({ ...configForm, pf_employer_rate: Number(e.target.value) })} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={configForm.pf_enabled || false} onChange={e => setConfigForm({ ...configForm, pf_enabled: e.target.checked })} />
                                    <Label>Enable PF</Label>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-4 text-lg">ESI</h3>
                            <div className="space-y-4">
                                <div>
                                    <Label>ESI Employee Rate (%)</Label>
                                    <Input type="number" value={configForm.esi_employee_rate || ''} onChange={e => setConfigForm({ ...configForm, esi_employee_rate: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <Label>ESI Employer Rate (%)</Label>
                                    <Input type="number" value={configForm.esi_employer_rate || ''} onChange={e => setConfigForm({ ...configForm, esi_employer_rate: Number(e.target.value) })} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={configForm.esi_enabled || false} onChange={e => setConfigForm({ ...configForm, esi_enabled: e.target.checked })} />
                                    <Label>Enable ESI</Label>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end">
                            <Button onClick={handleConfigSave} isLoading={updateConfigMut.isPending}>Save Configuration</Button>
                        </div>
                    </div>
                )}

                {activeTab === 'pt' && (
                    <>
                        <div className="flex justify-end mb-4">
                            <Button onClick={() => setPtOpen(true)}><Plus size={16} className="mr-2" /> Add Slab</Button>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>State</TableHead>
                                    <TableHead>Min Salary</TableHead>
                                    <TableHead>Max Salary</TableHead>
                                    <TableHead>Tax Amount</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ptSlabs.map(slab => (
                                    <TableRow key={slab.id}>
                                        <TableCell>{slab.state}</TableCell>
                                        <TableCell>{slab.min_salary}</TableCell>
                                        <TableCell>{slab.max_salary}</TableCell>
                                        <TableCell>{slab.monthly_tax}</TableCell>
                                        <TableCell>
                                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deletePtMut.mutate(slab.id)}><Trash2 size={16} /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </>
                )}

                {activeTab === 'deductions' && (
                    <>
                        <div className="flex justify-end mb-4">
                            <Button onClick={() => setDedOpen(true)}><Plus size={16} className="mr-2" /> Add Type</Button>
                        </div>
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Category</TableHead><TableHead>Statutory?</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {dedTypes.map(d => (
                                    <TableRow key={d.id}>
                                        <TableCell>{d.name}</TableCell>
                                        <TableCell>{d.code}</TableCell>
                                        <TableCell>{d.category}</TableCell>
                                        <TableCell>{d.is_statutory ? 'Yes' : 'No'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </>
                )}

                {activeTab === 'cc' && (
                    <>
                        <div className="flex justify-end mb-4">
                            <Button onClick={() => setCcOpen(true)}><Plus size={16} className="mr-2" /> Add Cost Center</Button>
                        </div>
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Allocated</TableHead><TableHead>Spent</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {costCenters.length === 0 ? <TableRow><TableCell className="text-center">No cost centers</TableCell><TableCell>{null}</TableCell><TableCell>{null}</TableCell></TableRow> :
                                    costCenters.map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell>{c.name}</TableCell>
                                            <TableCell>{c.budgetAllocated || c.allocated}</TableCell>
                                            <TableCell>{c.spent}</TableCell>
                                        </TableRow>
                                    ))
                                }
                            </TableBody>
                        </Table>
                    </>
                )}
            </Card>

            {/* PT Dialog */}
            <Dialog open={ptOpen} onOpenChange={setPtOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add PT Slab</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div><Label>State</Label><Input value={ptForm.state} onChange={e => setPtForm({ ...ptForm, state: e.target.value })} /></div>
                        <div><Label>Min Salary</Label><Input type="number" value={ptForm.minSalary} onChange={e => setPtForm({ ...ptForm, minSalary: e.target.value })} /></div>
                        <div><Label>Max Salary</Label><Input type="number" value={ptForm.maxSalary} onChange={e => setPtForm({ ...ptForm, maxSalary: e.target.value })} /></div>
                        <div><Label>Monthly Tax</Label><Input type="number" value={ptForm.monthlyTax} onChange={e => setPtForm({ ...ptForm, monthlyTax: e.target.value })} /></div>
                    </div>
                    <DialogFooter><Button onClick={handlePtSubmit}>Create</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Deduction Type Dialog */}
            <Dialog open={dedOpen} onOpenChange={setDedOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Deduction Type</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div><Label>Name</Label><Input value={dedForm.name} onChange={e => setDedForm({ ...dedForm, name: e.target.value })} /></div>
                        <div><Label>Code</Label><Input value={dedForm.code} onChange={e => setDedForm({ ...dedForm, code: e.target.value })} placeholder="Auto-generated if empty" /></div>
                        <div>
                            <Label>Category</Label>
                            <select className="w-full border rounded p-2" value={dedForm.category} onChange={e => setDedForm({ ...dedForm, category: e.target.value })}>
                                <option value="STATUTORY">Statutory</option>
                                <option value="LOAN">Loan</option>
                                <option value="PENALTY">Penalty</option>
                                <option value="ADVANCE">Advance</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={dedForm.isStatutory} onChange={e => setDedForm({ ...dedForm, isStatutory: e.target.checked })} />
                            <Label>Is Statutory?</Label>
                        </div>
                    </div>
                    <DialogFooter><Button onClick={handleDedSubmit}>Create</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cost Center Dialog */}
            <Dialog open={ccOpen} onOpenChange={setCcOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Cost Center</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div><Label>Name</Label><Input value={ccName} onChange={e => setCcName(e.target.value)} /></div>
                        <div><Label>Allocated Budget</Label><Input type="number" value={ccAlloc} onChange={e => setCcAlloc(Number(e.target.value))} /></div>
                    </div>
                    <DialogFooter><Button onClick={handleCcCreate}>Create</Button></DialogFooter>
                </DialogContent>
            </Dialog>

        </DashboardLayout>
    );
};

export default StatutoryPage;
