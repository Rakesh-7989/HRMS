import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { payrollService, SalaryStructure, SalaryComponent, CTCBreakdown } from '@/services/payroll.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Calculator, Package, Settings, Loader2, Check, AlertCircle } from 'lucide-react';

export const SalaryStructuresContent: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'structures' | 'components' | 'calculator'>('structures');

    // Dialogs
    const [structureDialogOpen, setStructureDialogOpen] = useState(false);
    const [componentDialogOpen, setComponentDialogOpen] = useState(false);
    const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);
    const [editingComponent, setEditingComponent] = useState<SalaryComponent | null>(null);

    // Structures
    const { data: structures = [], isLoading: structuresLoading } = useQuery({
        queryKey: ['salary-structures'],
        queryFn: () => payrollService.listSalaryStructures(),
        enabled: activeTab === 'structures'
    });

    // Components
    const { data: components = [], isLoading: componentsLoading } = useQuery({
        queryKey: ['salary-components'],
        queryFn: () => payrollService.listSalaryComponentsV2(),
        enabled: activeTab === 'components' || activeTab === 'calculator' || structureDialogOpen
    });

    // Form states
    const [structureName, setStructureName] = useState('');
    const [structureDescription, setStructureDescription] = useState('');
    const [structureIsDefault, setStructureIsDefault] = useState(false);
    const [selectedComponents, setSelectedComponents] = useState<any[]>([]);

    const [componentName, setComponentName] = useState('');
    const [componentCode, setComponentCode] = useState('');
    const [componentType, setComponentType] = useState<'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION' | 'REIMBURSEMENT'>('EARNING');
    const [componentCategory, setComponentCategory] = useState('');
    const [componentIsTaxable, setComponentIsTaxable] = useState(true);

    // CTC Calculator
    const [calcStructureId, setCalcStructureId] = useState('');
    const [calcCTC, setCalcCTC] = useState('');
    const [ctcBreakdown, setCtcBreakdown] = useState<CTCBreakdown | null>(null);
    const [calculating, setCalculating] = useState(false);

    // Mutations
    const createStructureMut = useMutation({
        mutationFn: (data: any) =>
            payrollService.createSalaryStructure(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salary-structures'] });
            setStructureDialogOpen(false);
            resetStructureForm();
        }
    });

    const updateStructureMut = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            payrollService.updateSalaryStructureV2(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salary-structures'] });
            setStructureDialogOpen(false);
            resetStructureForm();
        }
    });

    const deleteStructureMut = useMutation({
        mutationFn: (id: string) => payrollService.deleteSalaryStructure(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salary-structures'] })
    });

    const createComponentMut = useMutation({
        mutationFn: (data: Partial<SalaryComponent>) => payrollService.createSalaryComponentV2(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salary-components'] });
            setComponentDialogOpen(false);
            resetComponentForm();
        }
    });

    const updateComponentMut = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<SalaryComponent> }) =>
            payrollService.updateSalaryComponentV2(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salary-components'] });
            setComponentDialogOpen(false);
            resetComponentForm();
        }
    });

    const deleteComponentMut = useMutation({
        mutationFn: (id: string) => payrollService.deleteSalaryComponentV2(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salary-components'] })
    });

    const seedDefaultsMut = useMutation({
        mutationFn: () => payrollService.seedSalaryDefaults(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salary-structures'] });
            queryClient.invalidateQueries({ queryKey: ['salary-components'] });
            alert('Default salary components and structure created successfully!');
        },
        onError: (err: any) => {
            alert('Failed to seed defaults: ' + (err?.response?.data?.message || err.message));
        }
    });

    const resetStructureForm = () => {
        setEditingStructure(null);
        setStructureName('');
        setStructureDescription('');
        setStructureIsDefault(false);
        setSelectedComponents([]);
    };

    const resetComponentForm = () => {
        setEditingComponent(null);
        setComponentName('');
        setComponentCode('');
        setComponentType('EARNING');
        setComponentCategory('');
        setComponentIsTaxable(true);
    };

    const handleEditStructure = async (s: SalaryStructure) => {
        setEditingStructure(s);
        setStructureName(s.name);
        setStructureDescription(s.description || '');
        setStructureIsDefault(s.is_default);

        // Fetch detailed structure with components
        try {
            const detail = await payrollService.getSalaryStructureById(s.id);
            setSelectedComponents(detail.components.map(c => ({
                component_id: c.component_id,
                name: c.component_name,
                calculation_type: c.calculation_type,
                percentage: c.percentage,
                fixed_amount: c.fixed_amount,
                display_order: c.display_order
            })));
        } catch (err) {
            console.error("Failed to fetch structure details", err);
            setSelectedComponents([]);
        }
        setStructureDialogOpen(true);
    };

    const handleSaveStructure = () => {
        const payload = {
            name: structureName,
            description: structureDescription,
            is_default: structureIsDefault,
            components: selectedComponents.map((c, idx) => ({
                component_id: c.component_id,
                calculation_type: c.calculation_type,
                percentage: c.percentage ? parseFloat(c.percentage) : undefined,
                fixed_amount: c.fixed_amount ? parseFloat(c.fixed_amount) : undefined,
                display_order: c.display_order || idx
            }))
        };

        if (editingStructure) {
            updateStructureMut.mutate({ id: editingStructure.id, data: payload });
        } else {
            createStructureMut.mutate(payload);
        }
    };

    const addComponentToStructure = (comp: SalaryComponent) => {
        if (selectedComponents.some(c => c.component_id === comp.id)) return;
        setSelectedComponents([...selectedComponents, {
            component_id: comp.id,
            name: comp.name,
            calculation_type: 'PERCENTAGE_OF_CTC',
            percentage: 0,
            fixed_amount: 0
        }]);
    };

    const removeComponentFromStructure = (compId: string) => {
        setSelectedComponents(selectedComponents.filter(c => c.component_id !== compId));
    };

    const updateSelectedComponent = (compId: string, field: string, value: any) => {
        setSelectedComponents(selectedComponents.map(c =>
            c.component_id === compId ? { ...c, [field]: value } : c
        ));
    };

    const handleEditComponent = (comp: SalaryComponent) => {
        setEditingComponent(comp);
        setComponentName(comp.name);
        setComponentCode(comp.code);
        setComponentType(comp.component_type);
        setComponentCategory(comp.category || '');
        setComponentIsTaxable(comp.is_taxable);
        setComponentDialogOpen(true);
    };

    const handleSaveComponent = () => {
        const data: Partial<SalaryComponent> = {
            name: componentName,
            code: componentCode,
            component_type: componentType,
            category: componentCategory,
            is_taxable: componentIsTaxable
        };

        if (editingComponent) {
            updateComponentMut.mutate({ id: editingComponent.id, data });
        } else {
            createComponentMut.mutate(data);
        }
    };

    const handleCalculateCTC = async () => {
        if (!calcStructureId || !calcCTC) return;
        setCalculating(true);
        try {
            const breakdown = await payrollService.calculateCTC(calcStructureId, parseFloat(calcCTC));
            setCtcBreakdown(breakdown);
        } catch (err: any) {
            alert('Calculation failed: ' + (err?.response?.data?.message || err.message));
        } finally {
            setCalculating(false);
        }
    };

    const formatINR = (amount: number) =>
        amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Salary Structures</h1>
                    <p className="text-gray-500">Manage salary components and CTC structures</p>
                </div>
                <Button onClick={() => seedDefaultsMut.mutate()} disabled={seedDefaultsMut.isPending}>
                    {seedDefaultsMut.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <Package className="mr-2" size={16} />}
                    Seed Defaults
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
                {[
                    { id: 'structures', label: 'Structures', icon: Settings },
                    { id: 'components', label: 'Components', icon: Package },
                    { id: 'calculator', label: 'CTC Calculator', icon: Calculator }
                ].map(tab => (
                    <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setActiveTab(tab.id as any)}
                    >
                        <tab.icon className="mr-2" size={14} />
                        {tab.label}
                    </Button>
                ))}
            </div>

            {/* Structures Tab */}
            {activeTab === 'structures' && (
                <Card className="p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Salary Structure Templates</h2>
                        <Button size="sm" onClick={() => { resetStructureForm(); setStructureDialogOpen(true); }}>
                            <Plus className="mr-2" size={14} /> Add Structure
                        </Button>
                    </div>

                    {structuresLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={24} /></div>
                    ) : structures.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <AlertCircle className="mx-auto mb-2" size={32} />
                            <p>No salary structures found. Click "Seed Defaults" to create standard Indian components.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Components</TableHead>
                                    <TableHead>Default</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {structures.map(s => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">{s.name}</TableCell>
                                        <TableCell className="text-gray-500">{s.description || '-'}</TableCell>
                                        <TableCell>{s.component_count || 0}</TableCell>
                                        <TableCell>
                                            {s.is_default && <Check className="text-green-500" size={16} />}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleEditStructure(s)}>
                                                    <Edit size={14} />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => {
                                                    if (confirm('Delete this structure?')) deleteStructureMut.mutate(s.id);
                                                }}>
                                                    <Trash2 size={14} className="text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            )}

            {/* Components Tab */}
            {activeTab === 'components' && (
                <Card className="p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Salary Components</h2>
                        <Button size="sm" onClick={() => { resetComponentForm(); setComponentDialogOpen(true); }}>
                            <Plus className="mr-2" size={14} /> Add Component
                        </Button>
                    </div>

                    {componentsLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={24} /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Taxable</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {components.filter(c => c.is_active).map(c => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">{c.name}</TableCell>
                                        <TableCell><code className="bg-gray-100 px-2 py-1 rounded text-sm">{c.code}</code></TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${c.component_type === 'EARNING' ? 'bg-green-100 text-green-700' :
                                                c.component_type === 'DEDUCTION' ? 'bg-red-100 text-red-700' :
                                                    c.component_type === 'EMPLOYER_CONTRIBUTION' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {c.component_type.replace('_', ' ')}
                                            </span>
                                        </TableCell>
                                        <TableCell>{c.category || '-'}</TableCell>
                                        <TableCell>{c.is_taxable ? 'Yes' : 'No'}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleEditComponent(c)}>
                                                    <Edit size={14} />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => {
                                                    if (confirm('Deactivate this component?')) deleteComponentMut.mutate(c.id);
                                                }}>
                                                    <Trash2 size={14} className="text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Card>
            )}

            {/* CTC Calculator Tab */}
            {activeTab === 'calculator' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold mb-4">CTC Calculator</h2>
                        <div className="space-y-4">
                            <div>
                                <Label>Select Salary Structure</Label>
                                <select
                                    className="w-full mt-1 p-2 border rounded"
                                    value={calcStructureId}
                                    onChange={e => setCalcStructureId(e.target.value)}
                                >
                                    <option value="">-- Select Structure --</option>
                                    {structures.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label>Annual CTC (₹)</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g., 1200000"
                                    value={calcCTC}
                                    onChange={e => setCalcCTC(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleCalculateCTC} disabled={calculating || !calcStructureId || !calcCTC}>
                                {calculating ? <Loader2 className="animate-spin mr-2" size={16} /> : <Calculator className="mr-2" size={16} />}
                                Calculate Breakdown
                            </Button>
                        </div>
                    </Card>

                    {ctcBreakdown && (
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-4">Salary Breakdown</h2>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-blue-50 p-4 rounded">
                                    <p className="text-sm text-gray-500">Annual CTC</p>
                                    <p className="text-xl font-bold text-blue-700">{formatINR(ctcBreakdown.annual_ctc)}</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded">
                                    <p className="text-sm text-gray-500">Monthly Net</p>
                                    <p className="text-xl font-bold text-green-700">{formatINR(ctcBreakdown.monthly_net)}</p>
                                </div>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Component</TableHead>
                                        <TableHead className="text-right">Monthly</TableHead>
                                        <TableHead className="text-right">Annual</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ctcBreakdown.breakdown.map(b => (
                                        <TableRow key={b.component_id}>
                                            <TableCell>
                                                <span className={`font-medium ${b.component_type === 'DEDUCTION' ? 'text-red-600' :
                                                    b.component_type === 'EMPLOYER_CONTRIBUTION' ? 'text-blue-600' : ''
                                                    }`}>
                                                    {b.component_type === 'DEDUCTION' ? '(-)' : ''} {b.component_name}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">{formatINR(b.monthly_amount)}</TableCell>
                                            <TableCell className="text-right">{formatINR(b.annual_amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="font-bold bg-gray-50">
                                        <TableCell>Net Take-Home</TableCell>
                                        <TableCell className="text-right text-green-600">{formatINR(ctcBreakdown.monthly_net)}</TableCell>
                                        <TableCell className="text-right text-green-600">{formatINR(ctcBreakdown.net_salary)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </Card>
                    )}
                </div>
            )}

            {/* Structure Dialog */}
            <Dialog open={structureDialogOpen} onOpenChange={setStructureDialogOpen} className="max-w-[1400px] w-[96vw] h-[88vh] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                <DialogContent className="h-full flex flex-col overflow-hidden p-0">
                    {/* 1. Header Row: Actions & Title */}
                    <header className="px-8 py-5 border-b flex justify-between items-center bg-white shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-blue-600/10 text-blue-600 rounded-xl flex items-center justify-center">
                                <Package size={22} className="stroke-[2.5px]" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black tracking-tight text-slate-900 leading-tight">
                                    {editingStructure ? 'Edit' : 'Create'} Salary Structure
                                </DialogTitle>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-0.5">Automated Payroll Logic</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setStructureDialogOpen(false)}
                                className="px-5 h-10 text-slate-400 font-bold hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                DISMISS
                            </Button>
                            <Button
                                onClick={handleSaveStructure}
                                disabled={!structureName || selectedComponents.length === 0 || createStructureMut.isPending || updateStructureMut.isPending}
                                className="px-8 h-10 bg-blue-600 hover:bg-blue-700 font-black text-white rounded-xl shadow-lg shadow-blue-600/25 active:scale-95 transition-all flex items-center gap-2.5"
                            >
                                {(createStructureMut.isPending || updateStructureMut.isPending) ? (
                                    <Loader2 className="animate-spin" size={16} />
                                ) : (
                                    <Check className="stroke-[3px]" size={16} />
                                )}
                                {editingStructure ? 'UPDATE' : 'SAVE'}
                            </Button>
                        </div>
                    </header>

                    {/* 2. Config Bar: Basic Info */}
                    <div className="grid grid-cols-12 gap-5 px-8 py-5 bg-slate-50/60 border-b shrink-0">
                        <div className="col-span-4 space-y-1.5">
                            <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Structure Name</Label>
                            <Input
                                value={structureName}
                                onChange={e => setStructureName(e.target.value)}
                                placeholder="e.g., India - Standard Structure"
                                className="h-10 px-4 text-sm font-semibold bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl shadow-sm transition-all"
                            />
                        </div>
                        <div className="col-span-5 space-y-1.5">
                            <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description</Label>
                            <Input
                                value={structureDescription}
                                onChange={e => setStructureDescription(e.target.value)}
                                placeholder="What is this structure used for?"
                                className="h-10 px-4 text-sm font-medium bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl shadow-sm transition-all"
                            />
                        </div>
                        <div className="col-span-3 flex flex-col justify-end">
                            <div
                                className={`flex items-center gap-2.5 px-5 h-10 rounded-xl border transition-all cursor-pointer select-none font-bold text-[10px] uppercase tracking-widest ${structureIsDefault ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300'}`}
                                onClick={() => setStructureIsDefault(!structureIsDefault)}
                            >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${structureIsDefault ? 'bg-white border-white text-slate-800' : 'bg-slate-50 border-slate-300'}`}>
                                    {structureIsDefault && <Check size={12} className="stroke-[4px]" />}
                                </div>
                                Set as Default
                            </div>
                        </div>
                    </div>

                    {/* 3. Main Split View: Library + Editor */}
                    <div className="flex flex-1 min-h-0 overflow-hidden">
                        {/* Library (Left) */}
                        <aside className="w-[300px] shrink-0 border-r bg-slate-50/30 flex flex-col min-h-0">
                            <div className="px-6 py-4 border-b bg-white/60 flex justify-between items-center shrink-0">
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Component Library</h3>
                                <div className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-md text-[10px] font-bold">
                                    {components.filter(c => c.is_active && !selectedComponents.some(sc => sc.component_id === c.id)).length}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 space-y-2">
                                {componentsLoading ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-30">
                                        <Loader2 className="animate-spin" size={28} />
                                        <p className="text-[9px] font-bold uppercase tracking-widest">Loading...</p>
                                    </div>
                                ) : components.filter(c => c.is_active && !selectedComponents.some(sc => sc.component_id === c.id)).length === 0 ? (
                                    <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-white/50 flex flex-col items-center gap-3 mt-6">
                                        <Package size={24} className="text-slate-200" />
                                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No Components<br />Available</p>
                                    </div>
                                ) : (
                                    components.filter(c => c.is_active && !selectedComponents.some(sc => sc.component_id === c.id)).map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => addComponentToStructure(c)}
                                            className="w-full group flex justify-between items-center p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/5 transition-all text-left"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <p className="text-[12px] font-bold text-slate-700 truncate group-hover:text-blue-600 uppercase tracking-tight transition-colors">{c.name}</p>
                                                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">{c.code}</p>
                                            </div>
                                            <div className="w-7 h-7 flex items-center justify-center bg-slate-50 group-hover:bg-blue-600 group-hover:text-white rounded-lg transition-all shrink-0">
                                                <Plus size={14} />
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </aside>

                        {/* Editor Workspace (Right) */}
                        <main className="flex-1 bg-white flex flex-col min-h-0 overflow-hidden">
                            <div className="px-8 py-4 border-b bg-white flex justify-between items-center shrink-0">
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Configuration Workspace</h3>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                                    <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">{selectedComponents.length} Active</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-8 py-6">
                                {selectedComponents.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center gap-6 opacity-40">
                                        <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center border-2 border-white shadow-lg">
                                            <Package size={48} className="text-slate-200" />
                                        </div>
                                        <div className="text-center space-y-1">
                                            <p className="text-lg font-bold text-slate-300 uppercase tracking-[0.15em]">Empty Workspace</p>
                                            <p className="text-sm text-slate-400">Select components from the library</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedComponents.map((c, idx) => (
                                            <div key={c.component_id} className="group flex items-center gap-5 p-5 bg-slate-50/70 hover:bg-white border border-slate-100/60 hover:border-blue-100 rounded-2xl hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-200">
                                                <div className="w-9 h-9 flex items-center justify-center bg-white rounded-lg text-[11px] font-bold text-slate-300 shadow-sm shrink-0">
                                                    {String(idx + 1).padStart(2, '0')}
                                                </div>

                                                <div className="w-[200px] shrink-0">
                                                    <p className="text-[13px] font-bold text-slate-800 tracking-tight uppercase leading-tight">{c.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">{c.code || 'NO-REF'}</p>
                                                </div>

                                                <div className="flex-1">
                                                    <Label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Rule</Label>
                                                    <select
                                                        className="w-full h-10 px-4 text-[10px] font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer appearance-none shadow-sm uppercase tracking-tight"
                                                        value={c.calculation_type}
                                                        onChange={e => updateSelectedComponent(c.component_id, 'calculation_type', e.target.value)}
                                                    >
                                                        <option value="PERCENTAGE_OF_CTC">% OF ANNUAL CTC</option>
                                                        <option value="PERCENTAGE_OF_BASIC">% OF BASIC SALARY</option>
                                                        <option value="FIXED">FLAT FIXED AMOUNT</option>
                                                        <option value="REMAINING">BALANCE (REMAINING GROSS)</option>
                                                    </select>
                                                </div>

                                                <div className="w-[150px] shrink-0">
                                                    {c.calculation_type !== 'REMAINING' && (
                                                        <div className="space-y-1">
                                                            <Label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Value</Label>
                                                            <div className="relative group/input">
                                                                <Input
                                                                    type="number"
                                                                    className="h-10 text-right font-bold text-sm pr-10 bg-white border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm"
                                                                    value={c.calculation_type === 'FIXED' ? c.fixed_amount : c.percentage}
                                                                    onChange={e => updateSelectedComponent(c.component_id, c.calculation_type === 'FIXED' ? 'fixed_amount' : 'percentage', e.target.value)}
                                                                />
                                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-400">
                                                                    {c.calculation_type === 'FIXED' ? '₹' : '%'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeComponentFromStructure(c.component_id)}
                                                    className="w-10 h-10 p-0 text-slate-200 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shrink-0 opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </main>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Component Dialog */}
            <Dialog open={componentDialogOpen} onOpenChange={setComponentDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingComponent ? 'Edit' : 'Create'} Salary Component</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Name</Label>
                            <Input value={componentName} onChange={e => setComponentName(e.target.value)} placeholder="e.g., House Rent Allowance" />
                        </div>
                        <div>
                            <Label>Code</Label>
                            <Input value={componentCode} onChange={e => setComponentCode(e.target.value.toUpperCase())} placeholder="e.g., HRA" />
                        </div>
                        <div>
                            <Label>Type</Label>
                            <select
                                className="w-full mt-1 p-2 border rounded"
                                value={componentType}
                                onChange={e => setComponentType(e.target.value as any)}
                            >
                                <option value="EARNING">Earning</option>
                                <option value="DEDUCTION">Deduction</option>
                                <option value="EMPLOYER_CONTRIBUTION">Employer Contribution</option>
                                <option value="REIMBURSEMENT">Reimbursement</option>
                            </select>
                        </div>
                        <div>
                            <Label>Category</Label>
                            <Input value={componentCategory} onChange={e => setComponentCategory(e.target.value)} placeholder="e.g., ALLOWANCE, STATUTORY" />
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="isTaxable" checked={componentIsTaxable} onChange={e => setComponentIsTaxable(e.target.checked)} />
                            <Label htmlFor="isTaxable">Taxable</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setComponentDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveComponent} disabled={!componentName || !componentCode}>
                            {editingComponent ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default SalaryStructuresContent;
