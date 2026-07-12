import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { payrollService, SalaryStructure, SalaryComponent, CTCBreakdown } from '@/services/payroll.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Calculator, Package, Settings, Loader2, Check, AlertCircle, Info, IndianRupee, Wallet, FileText, X, Globe, ArrowRight, Sparkles, Shield, Users } from 'lucide-react';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useTranslation } from 'react-i18next';

export const SalaryStructuresContent: React.FC = () => {
    const { confirm } = useConfirm();
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'structures' | 'components' | 'calculator'>('structures');

    // Dialogs
    const [structureDialogOpen, setStructureDialogOpen] = useState(false);
    const [componentDialogOpen, setComponentDialogOpen] = useState(false);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
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

    // Templates
    const { data: templates = [], isLoading: templatesLoading } = useQuery({
        queryKey: ['salary-structure-templates'],
        queryFn: () => payrollService.listStructureTemplates(),
        enabled: templateDialogOpen
    });

    const createFromTemplateMut = useMutation({
        mutationFn: (templateId: string) => payrollService.createStructureFromTemplate(templateId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salary-structures'] });
            setTemplateDialogOpen(false);
        }
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

    const migrateMut = useMutation({
        mutationFn: (id: string) => payrollService.migrateEmployeesToStructure(id),
        onSuccess: (res: any) => {
            const result = res.data;
            if (result.successCount > 0) {
                // Use a custom toast or just success
                alert(result.message); // Simple alert for detailed message
            } else {
                alert(t('payroll.salaryStructure.alerts.noEligibleEmployees'));
            }
        },
        onError: (err: any) => alert(err.message || t('payroll.salaryStructure.alerts.migrationFailed'))
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
            alert(t('payroll.salaryStructure.alerts.seedSuccess'));
        },
        onError: (err: any) =>             alert(t('payroll.salaryStructure.alerts.seedFailed') + (err.response?.data?.message || err.message))
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
            alert(t('payroll.salaryStructure.alerts.calculationFailed') + (err?.response?.data?.message || err.message));
        } finally {
            setCalculating(false);
        }
    };

    const formatINR = (amount: number) =>
        amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

    // If structure dialog is open, render the full-page structure editor instead
    if (structureDialogOpen) {
        return (
            <div className="space-y-0 animate-fadeIn">
                {/* Full-Page Structure Editor */}
                <Card padding="none" bordered={false} className="min-h-[calc(100vh-180px)] flex flex-col ring-1 ring-black/5 overflow-hidden">
                    {/* Header Row: Actions & Title */}
                    <header className="px-8 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-brand-500/10 text-brand-500 rounded-xl flex items-center justify-center">
                                <Package size={22} className="stroke-[2.5px]" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">
                                    {editingStructure ? t('payroll.salaryStructure.editor.editTitle') : t('payroll.salaryStructure.editor.createTitle')}
                                </h1>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em] mt-0.5">{t('payroll.salaryStructure.editor.subtitle')}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => { setStructureDialogOpen(false); resetStructureForm(); }}
                                className="px-5 h-10 text-gray-400 font-bold hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                            >
                                {t('payroll.salaryStructure.editor.cancel')}
                            </Button>
                            <Button
                                onClick={handleSaveStructure}
                                disabled={!structureName || selectedComponents.length === 0 || createStructureMut.isPending || updateStructureMut.isPending}
                                className="px-8 h-10 bg-brand-500 hover:bg-brand-500/90 font-black text-white rounded-xl shadow-elev-4 shadow-brand-500/20 active:scale-95 transition-all flex items-center gap-2.5"
                            >
                                {(createStructureMut.isPending || updateStructureMut.isPending) ? (
                                    <Loader2 className="animate-spin" size={16} />
                                ) : (
                                    <Check className="stroke-[3px]" size={16} />
                                )}
                                {editingStructure ? t('payroll.salaryStructure.editor.update') : t('payroll.salaryStructure.editor.save')}
                            </Button>
                        </div>
                    </header>

                    {/* Config Bar: Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 px-8 py-5 bg-gray-50/60 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800 shrink-0">
                        <div className="md:col-span-4 space-y-1.5">
                            <Label className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">{t('payroll.salaryStructure.editor.structureName')}</Label>
                            <Input
                                value={structureName}
                                onChange={e => setStructureName(e.target.value)}
                                placeholder={t('payroll.salaryStructure.editor.structureNamePlaceholder')}
                                className="h-10 px-4 text-sm font-semibold bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 rounded-xl shadow-elev-1 transition-all text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="md:col-span-5 space-y-1.5">
                            <Label className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">{t('payroll.salaryStructure.editor.description')}</Label>
                            <Input
                                value={structureDescription}
                                onChange={e => setStructureDescription(e.target.value)}
                                placeholder={t('payroll.salaryStructure.editor.descriptionPlaceholder')}
                                className="h-10 px-4 text-sm font-medium bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 rounded-xl shadow-elev-1 transition-all text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="md:col-span-3 flex flex-col justify-end">
                            <div
                                className={`flex items-center gap-2.5 px-5 h-10 rounded-xl border transition-all cursor-pointer select-none font-bold text-[10px] uppercase tracking-widest ${structureIsDefault ? 'bg-slate-900 dark:bg-brand-500 border-slate-900 dark:border-brand-500 text-white shadow-elev-3' : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-400 hover:border-brand-500/50'}`}
                                onClick={() => setStructureIsDefault(!structureIsDefault)}
                            >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${structureIsDefault ? 'bg-white border-white text-slate-800' : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700'}`}>
                                    {structureIsDefault && <Check size={12} className="stroke-[4px] text-slate-900" />}
                                </div>
                                {t('payroll.salaryStructure.editor.setAsDefault')}
                            </div>
                        </div>
                    </div>

                    {/* Main Split View: Library + Editor */}
                    <div className="flex flex-1 min-h-0 overflow-hidden bg-white dark:bg-gray-900">
                        {/* Library (Left) */}
                        <aside className="w-full md:w-[320px] shrink-0 border-r border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-950/20 flex flex-col min-h-0">
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 flex justify-between items-center shrink-0">
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">{t('payroll.salaryStructure.editor.availableComponents')}</h3>
                                <div className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-md text-[10px] font-bold">
                                    {components.filter(c => c.is_active && !selectedComponents.some(sc => sc.component_id === c.id)).length}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 space-y-2">
                                {componentsLoading ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-30">
                                        <Loader2 className="animate-spin" size={28} />
                                        <p className="text-[9px] font-bold uppercase tracking-widest">{t('payroll.salaryStructure.editor.loading')}</p>
                                    </div>
                                ) : components.filter(c => c.is_active && !selectedComponents.some(sc => sc.component_id === c.id)).length === 0 ? (
                                    <div className="p-10 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl bg-white/50 dark:bg-gray-900/50 flex flex-col items-center gap-3 mt-6">
                                        <Package size={24} className="text-gray-200" />
                                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest leading-relaxed">{t('payroll.salaryStructure.editor.allComponents')}<br />{t('payroll.salaryStructure.editor.added')}</p>
                                    </div>
                                ) : (
                                    components.filter(c => c.is_active && !selectedComponents.some(sc => sc.component_id === c.id)).map(c => (
                                         <Button variant="ghost" 
                                            key={c.id}
                                            onClick={() => addComponentToStructure(c)}
                                            className="w-full group flex justify-between items-center p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl hover:border-brand-500/50 hover:shadow-elev-4 hover:shadow-brand-500/5 transition-all text-left"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <p className="text-[12px] font-bold text-gray-700 dark:text-gray-200 truncate group-hover:text-brand-500 transition-colors uppercase tracking-tight">{c.name}</p>
                                                <p className="text-[9px] text-gray-400 font-medium uppercase tracking-widest mt-0.5">{c.code}</p>
                                            </div>
                                            <div className="w-7 h-7 flex items-center justify-center bg-gray-50 dark:bg-gray-800 group-hover:bg-brand-500 group-hover:text-white rounded-lg transition-all shrink-0">
                                                <Plus size={14} />
                                            </div>
                                        </Button>
                                    ))
                                )}
                            </div>
                        </aside>

                        {/* Editor Workspace (Right) */}
                        <main className="flex-1 bg-white dark:bg-gray-900 flex flex-col min-h-0 overflow-hidden">
                            <div className="px-8 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0">
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Structure Workspace</h3>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
                                    <span className="text-[9px] font-bold text-brand-500 uppercase tracking-widest">{t('payroll.salaryStructure.editor.componentsSelected', { count: selectedComponents.length })}</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-8 py-6">
                                {selectedComponents.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center gap-6 opacity-40 min-h-[300px]">
                                        <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-3xl flex items-center justify-center border-2 border-white dark:border-gray-700 shadow-elev-4">
                                            <Package size={48} className="text-gray-200 dark:text-gray-700" />
                                        </div>
                                        <div className="text-center space-y-1 text-gray-300">
                                            <p className="text-lg font-bold uppercase tracking-[0.15em]">{t('payroll.salaryStructure.editor.emptyWorkspace')}</p>
                                            <p className="text-sm">{t('payroll.salaryStructure.editor.emptyWorkspaceHint')}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedComponents.map((c, idx) => (
                                            <div key={c.component_id} className="group flex flex-col md:flex-row md:items-center gap-5 p-5 bg-gray-50/70 dark:bg-gray-950/30 hover:bg-white dark:hover:bg-gray-950 border border-gray-100/60 dark:border-gray-800/60 hover:border-brand-500/20 rounded-2xl hover:shadow-elev-5 hover:shadow-brand-500/5 transition-all duration-200">
                                                <div className="w-9 h-9 flex items-center justify-center bg-white dark:bg-gray-900 rounded-lg text-[11px] font-bold text-gray-300 dark:text-gray-600 shadow-elev-1 shrink-0">
                                                    {String(idx + 1).padStart(2, '0')}
                                                </div>

                                                <div className="w-full md:w-[240px] shrink-0">
                                                    <p className="text-[13px] font-black text-gray-800 dark:text-gray-200 tracking-tight uppercase leading-tight group-hover:text-brand-500 transition-colors">{c.name}</p>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                                                         <Package size={10} /> {c.code || t('payroll.salaryStructure.editor.noRef')}
                                                    </p>
                                                </div>

                                                <div className="flex-1 space-y-1.5">
                                                    <Label className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 block">{t('payroll.salaryStructure.editor.calculationRule')}</Label>
                                                    <select
                                                        className="w-full h-10 px-4 text-[10px] font-bold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer shadow-elev-1 uppercase tracking-tight text-gray-700 dark:text-gray-200"
                                                        value={c.calculation_type}
                                                        onChange={e => updateSelectedComponent(c.component_id, 'calculation_type', e.target.value)}
                                                    >
                                                        <option value="PERCENTAGE_OF_CTC">{t('payroll.salaryStructure.editor.calcPercentageOfCtc')}</option>
                                                        <option value="PERCENTAGE_OF_BASIC">{t('payroll.salaryStructure.editor.calcPercentageOfBasic')}</option>
                                                        <option value="FIXED">{t('payroll.salaryStructure.editor.calcFixed')}</option>
                                                        <option value="REMAINING">{t('payroll.salaryStructure.editor.calcRemaining')}</option>
                                                    </select>
                                                </div>

                                                <div className="w-full md:w-[150px] shrink-0">
                                                    {c.calculation_type !== 'REMAINING' && (
                                                        <div className="space-y-1.5">
                                                            <Label className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 block">{t('payroll.salaryStructure.editor.value')}</Label>
                                                            <div className="relative group/input">
                                                                <Input
                                                                    type="number"
                                                                    className="h-10 text-right font-black text-sm pr-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all shadow-elev-1 text-gray-800 dark:text-gray-200"
                                                                    value={c.calculation_type === 'FIXED' ? c.fixed_amount : c.percentage}
                                                                    onChange={e => updateSelectedComponent(c.component_id, c.calculation_type === 'FIXED' ? 'fixed_amount' : 'percentage', e.target.value)}
                                                                />
                                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-gray-50 dark:bg-gray-800 rounded text-[9px] font-black text-gray-400">
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
                                                    className="w-10 h-10 p-0 text-gray-200 dark:text-gray-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all shrink-0 md:opacity-0 group-hover:opacity-100"
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
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header / Top Control Bar */}
            <Card className="p-4 border-none shadow-elev-1 ring-1 ring-black/5 bg-white dark:bg-gray-800/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Settings className="text-brand-500" size={20} />
                            {t('payroll.salaryStructure.list.title')}
                        </h1>
                        <p className="text-xs text-gray-500 mt-1 font-medium">{t('payroll.salaryStructure.list.subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {activeTab === 'structures' && (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={seedDefaultsMut.isPending}
                                    className="text-xs font-bold uppercase tracking-tight border-brand-300 text-brand-600 hover:bg-brand-50 dark:border-brand-500/50 dark:text-brand-300 dark:hover:bg-brand-500/10"
                                    onClick={() => seedDefaultsMut.mutate()}
                                >
                                    {seedDefaultsMut.isPending ? <Loader2 className="animate-spin mr-2" size={14} /> : <Sparkles className="mr-2" size={14} />}
                                    {t('payroll.salaryStructure.list.seedDefaults')}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs font-bold uppercase tracking-tight border-brand-500/30 text-brand-500 hover:bg-brand-500/5 dark:border-brand-500/50 dark:hover:bg-brand-500/10"
                                    onClick={() => setTemplateDialogOpen(true)}
                                >
                                    <Sparkles className="mr-2" size={14} />
                                    {t('payroll.salaryStructure.list.fromTemplate')}
                                </Button>
                            </>
                        )}
                        <Button
                            size="sm"
                            className="bg-brand-500 hover:bg-brand-500/90 text-white text-xs font-bold uppercase tracking-tight shadow-elev-4 shadow-brand-500/20"
                            onClick={() => {
                                if (activeTab === 'structures') {
                                    resetStructureForm();
                                    setStructureDialogOpen(true);
                                } else if (activeTab === 'components') {
                                    resetComponentForm();
                                    setComponentDialogOpen(true);
                                }
                            }}
                        >
                            <Plus className="mr-2" size={14} />
                            {activeTab === 'structures' ? t('payroll.salaryStructure.list.newStructure') : t('payroll.salaryStructure.list.newComponent')}
                        </Button>
                    </div>
                </div>

                {/* Pill Navigation */}
                <div className="mt-6 flex items-center gap-1 p-1 bg-gray-50 dark:bg-gray-950/50 rounded-lg w-fit border border-gray-100 dark:border-gray-800">
                    {[
                        { id: 'structures', label: t('payroll.salaryStructure.list.tabStructures'), icon: Settings },
                        { id: 'components', label: t('payroll.salaryStructure.list.tabComponents'), icon: Package },
                        { id: 'calculator', label: t('payroll.salaryStructure.list.tabCalculator'), icon: Calculator }
                    ].map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                             <Button variant="ghost" 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-6 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all duration-200 ${isActive
                                    ? 'bg-brand-500 text-white shadow-elev-3'
                                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-800'
                                    }`}
                            >
                                <tab.icon size={14} className={isActive ? 'text-white' : 'text-gray-400'} />
                                {tab.label}
                            </Button>
                        );
                    })}
                </div>
            </Card>

            {/* Structures Tab */}
            {activeTab === 'structures' && (
                <Card className="p-0 border-none shadow-elev-1 ring-1 ring-black/5 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('payroll.salaryStructure.list.templateInventory')}</h3>
                            <p className="text-xs text-gray-500 mt-1">{t('payroll.salaryStructure.list.templateInventoryDesc')}</p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-full ring-1 ring-black/5">
                            <Info size={12} className="text-brand-500" />
                            {t('payroll.salaryStructure.list.loaded', { count: structures.length })}
                        </div>
                    </div>

                    {structuresLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <Loader2 className="animate-spin text-brand-500" size={32} />
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('payroll.salaryStructure.list.accessingModels')}</p>
                        </div>
                    ) : structures.length === 0 ? (
                        <div className="text-center py-24 bg-gray-50/30 dark:bg-gray-900/10">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200 dark:border-gray-700">
                                <AlertCircle size={24} className="text-gray-300" />
                            </div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">{t('payroll.salaryStructure.list.systemEmpty')}</h4>
                            <p className="text-xs text-gray-500 mt-2 mb-6 max-w-[280px] mx-auto leading-relaxed">{t('payroll.salaryStructure.list.systemEmptyDesc')}</p>
                            <Button
                                size="sm"
                                disabled={seedDefaultsMut.isPending}
                                onClick={() => seedDefaultsMut.mutate()}
                                className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-wider"
                            >
                                {seedDefaultsMut.isPending ? <Loader2 className="animate-spin mr-2" size={14} /> : <Sparkles className="mr-2" size={14} />}
                                {t('payroll.salaryStructure.list.seedDefaultStructure')}
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50/50 dark:bg-gray-900/50">
                                    <TableRow>
                                        <TableHead className="text-[10px] font-bold uppercase text-gray-400 px-6 py-4">{t('payroll.salaryStructure.list.table.structureName')}</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-gray-400 px-6 py-4">{t('payroll.salaryStructure.list.table.components')}</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-gray-400 px-6 py-4">{t('payroll.salaryStructure.list.table.status')}</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-gray-400 px-6 py-4 text-right">{t('payroll.salaryStructure.list.table.operations')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {structures.map(s => (
                                        <TableRow key={s.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 border-gray-50 dark:border-gray-800 transition-colors group">
                                            <TableCell className="px-6 py-4">
                                                <div>
                                                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm group-hover:text-brand-500 transition-colors">{s.name}</p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1 italic">{s.description || t('payroll.salaryStructure.list.table.noDescription')}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-black text-gray-500">
                                                        {s.component_count || 0}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('payroll.salaryStructure.list.table.elements')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                {s.is_default ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black bg-brand-50 dark:bg-brand-500/10 text-brand-600 uppercase tracking-tight ring-1 ring-purple-500/20">
                                                        <Check size={10} className="mr-1 stroke-[3px]" /> {t('payroll.salaryStructure.list.table.systemDefault')}
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{t('payroll.salaryStructure.list.table.secondary')}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <Button variant="outline" size="sm" onClick={() => handleEditStructure(s)} className="h-8 w-8 p-0 dark:bg-gray-900 border-gray-100 dark:border-gray-700 hover:text-brand-500">
                                                        <Edit size={14} />
                                                    </Button>
                                                    <Button variant="outline" size="sm"
                                                        title={t('payroll.salaryStructure.list.migrateTooltip')}
                                                        onClick={async () => {
                                                            if (await confirm({ type: 'destructive', title: t('payroll.salaryStructure.list.confirmBulkMigrateTitle'), message: t('payroll.salaryStructure.list.confirmBulkMigrateMessage', { name: s.name }) })) {
                                                                migrateMut.mutate(s.id);
                                                            }
                                                        }}
                                                        className="h-8 w-8 p-0 dark:bg-gray-900 border-gray-100 dark:border-gray-700 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:border-brand-200"
                                                    >
                                                        <Users size={14} />
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={async () => {
                                                        if (await confirm({ type: 'destructive', title: t('payroll.salaryStructure.list.confirmDeleteStructureTitle'), message: t('payroll.salaryStructure.list.confirmDeleteStructureMessage') })) deleteStructureMut.mutate(s.id);
                                                    }} className="h-8 w-8 p-0 dark:bg-gray-900 border-gray-100 dark:border-gray-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200">
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </Card>
            )}

            {/* Components Tab */}
            {activeTab === 'components' && (
                <Card className="p-0 border-none shadow-elev-1 ring-1 ring-black/5 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('payroll.salaryStructure.list.atomicComponents')}</h3>
                            <p className="text-xs text-gray-500 mt-1">{t('payroll.salaryStructure.list.atomicComponentsDesc')}</p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-full ring-1 ring-black/5">
                            <Package size={12} className="text-brand-500" />
                            {t('payroll.salaryStructure.list.active', { count: components.filter(c => c.is_active).length })}
                        </div>
                    </div>

                    {componentsLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <Loader2 className="animate-spin text-brand-500" size={32} />
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('payroll.salaryStructure.list.catalogingElements')}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50/50 dark:bg-gray-900/50">
                                    <TableRow>
                                        <TableHead className="text-[10px] font-bold uppercase text-gray-400 px-6 py-4">{t('payroll.salaryStructure.list.component')}</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-gray-400 px-6 py-4">{t('payroll.salaryStructure.list.reference')}</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-gray-400 px-6 py-4">{t('payroll.salaryStructure.list.classification')}</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-gray-400 px-6 py-4">{t('payroll.salaryStructure.list.taxImpact')}</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-gray-400 px-6 py-4 text-right">Operations</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {components.filter(c => c.is_active).map(c => (
                                        <TableRow key={c.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 border-gray-50 dark:border-gray-800 transition-colors group">
                                            <TableCell className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${c.component_type === 'EARNING' ? 'bg-brand-50 text-brand-600' :
                                                        c.component_type === 'DEDUCTION' ? 'bg-red-50 text-red-600' :
                                                            'bg-brand-50 text-brand-600'
                                                        }`}>
                                                        {c.name[0]}
                                                    </div>
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200 text-[13px]">{c.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <code className="bg-gray-50 dark:bg-gray-950 px-2 py-1 rounded text-[10px] font-bold text-gray-400 ring-1 ring-black/5 uppercase tracking-wider">{c.code}</code>
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ring-1 ring-black/5 ${c.component_type === 'EARNING' ? 'bg-brand-50/50 text-brand-600 dark:bg-brand-500/10' :
                                                    c.component_type === 'DEDUCTION' ? 'bg-red-50/50 text-red-600 dark:bg-red-500/10' :
                                                        'bg-brand-50/50 text-brand-600 dark:bg-brand-500/10'
                                                    }`}>
                                                    {c.component_type.replace('_', ' ')}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                {c.is_taxable ? (
                                                    <div className="flex items-center gap-1.5 text-coral-600 font-bold text-[9px] uppercase tracking-wider">
                                                         <AlertCircle size={10} /> {t('payroll.salaryStructure.list.taxable')}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-brand-600 font-bold text-[9px] uppercase tracking-wider">
                                                         <Check size={10} className="stroke-[3px]" /> {t('payroll.salaryStructure.list.exempt')}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-right">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="outline" size="sm" onClick={() => handleEditComponent(c)} className="h-8 w-8 p-0 dark:bg-gray-900 border-gray-100 dark:border-gray-700 hover:text-brand-500">
                                                        <Edit size={14} />
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={async () => {
                                                        if (await confirm({ type: 'destructive', title: t('payroll.salaryStructure.list.confirmDeactivateComponentTitle'), message: t('payroll.salaryStructure.list.confirmDeactivateComponentMessage') })) deleteComponentMut.mutate(c.id);
                                                    }} className="h-8 w-8 p-0 dark:bg-gray-900 border-gray-100 dark:border-gray-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200">
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </Card>
            )}

            {/* CTC Calculator Tab */}
            {activeTab === 'calculator' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="p-8 border-none shadow-elev-1 ring-1 ring-black/5 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-800/50">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-brand-500/10 text-brand-500 rounded-xl flex items-center justify-center">
                                <Calculator size={20} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">{t('payroll.salaryStructure.calculator.simulator')}</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{t('payroll.salaryStructure.calculator.simulatorDesc')}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('payroll.salaryStructure.calculator.computationFramework')}</Label>
                                <select
                                    className="w-full h-11 px-4 text-sm font-semibold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer"
                                    value={calcStructureId}
                                    onChange={e => setCalcStructureId(e.target.value)}
                                >
                                    <option value="">{t('payroll.salaryStructure.calculator.selectStructure')}</option>
                                    {structures.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('payroll.salaryStructure.calculator.annualCtcGross')}</Label>
                                <div className="relative group/input">
                                    <Input
                                        type="number"
                                        placeholder={t('payroll.salaryStructure.calculator.annualCtcPlaceholder')}
                                        className="h-11 pl-10 pr-4 font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                        value={calcCTC}
                                        onChange={e => setCalcCTC(e.target.value)}
                                    />
                                    <IndianRupee size={16} />
                                </div>
                            </div>

                            <Button
                                onClick={handleCalculateCTC}
                                disabled={calculating || !calcStructureId || !calcCTC}
                                className="w-full h-11 bg-slate-900 dark:bg-brand-500 hover:bg-slate-800 dark:hover:bg-brand-500/90 text-white font-black text-xs uppercase tracking-[0.15em] rounded-xl shadow-elev-4 transition-all active:scale-[0.98]"
                            >
                                {calculating ? <Loader2 className="animate-spin mr-2" size={16} /> : <Calculator className="mr-2" size={16} />}
                                 {t('payroll.salaryStructure.calculator.executeProjection')}
                            </Button>
                        </div>
                    </Card>

                    {ctcBreakdown ? (
                        <Card className="p-0 border-none shadow-elev-1 ring-1 ring-black/5 overflow-hidden animate-fadeIn">
                            <div className="p-8 bg-gray-50/50 dark:bg-gray-950/20 border-b border-gray-100 dark:border-gray-800">
                                <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-tight">{t('payroll.salaryStructure.calculator.financialProjection')}</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl ring-1 ring-black/5 shadow-elev-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Wallet size={14} className="text-brand-500" />
                                             <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">{t('payroll.salaryStructure.calculator.annualCtc')}</p>
                                        </div>
                                        <p className="text-xl font-black text-gray-900 dark:text-white">{formatINR(ctcBreakdown.annual_ctc)}</p>
                                    </div>
                                    <div className="bg-brand-500/5 p-5 rounded-2xl ring-1 ring-brand-500/20 shadow-elev-1 border border-brand-500/10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Check size={14} className="text-brand-500 stroke-[3px]" />
                                             <p className="text-[9px] font-bold text-brand-500 uppercase tracking-[0.2em]">{t('payroll.salaryStructure.calculator.monthlyTakeHome')}</p>
                                        </div>
                                        <p className="text-xl font-black text-brand-500">{formatINR(ctcBreakdown.monthly_net)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-white dark:bg-gray-900">
                                        <TableRow>
                                             <TableHead className="text-[9px] font-bold uppercase text-gray-400 px-8 py-3">{t('payroll.salaryStructure.calculator.compensationElement')}</TableHead>
                                             <TableHead className="text-[9px] font-bold uppercase text-gray-400 px-8 py-3 text-right">{t('payroll.salaryStructure.calculator.monthly')}</TableHead>
                                             <TableHead className="text-[9px] font-bold uppercase text-gray-400 px-8 py-3 text-right">{t('payroll.salaryStructure.calculator.annual')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ctcBreakdown.breakdown.map((b, idx) => (
                                            <TableRow key={b.component_id} className={`border-none ${idx % 2 === 0 ? 'bg-gray-50/30 dark:bg-gray-800/10' : ''}`}>
                                                <TableCell className="px-8 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${b.component_type === 'DEDUCTION' ? 'bg-red-400' :
                                                            b.component_type === 'EMPLOYER_CONTRIBUTION' ? 'bg-brand-400' : 'bg-brand-400'
                                                            }`} />
                                                        <span className={`text-[11px] font-bold uppercase tracking-tight ${b.component_type === 'DEDUCTION' ? 'text-red-500' :
                                                            b.component_type === 'EMPLOYER_CONTRIBUTION' ? 'text-brand-500' : 'text-gray-700 dark:text-gray-200'
                                                            }`}>
                                                            {b.component_name}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-8 py-3.5 text-right font-bold text-xs text-gray-600 dark:text-gray-300">{formatINR(b.monthly_amount)}</TableCell>
                                                <TableCell className="px-8 py-3.5 text-right font-bold text-xs text-gray-600 dark:text-gray-300">{formatINR(b.annual_amount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="p-8 bg-slate-900 dark:bg-gray-950 flex justify-between items-center group">
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.3em]">{t('payroll.salaryStructure.calculator.finalNetValuation')}</p>
                                    <h4 className="text-xs font-bold text-white uppercase tracking-widest group-hover:text-brand-500 transition-colors">{t('payroll.salaryStructure.calculator.totalNetTakeHome')}</h4>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-white">{formatINR(ctcBreakdown.net_salary)}</p>
                                    <div className="flex items-center justify-end gap-1 mt-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                                        <p className="text-[8px] font-black text-brand-500 uppercase tracking-tighter">{t('payroll.salaryStructure.calculator.verifiedComputation')}</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <div className="h-full min-h-[400px] border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl flex flex-col items-center justify-center p-12 text-center opacity-60">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-3xl flex items-center justify-center mb-6">
                                <Calculator size={32} className="text-gray-300" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('payroll.salaryStructure.calculator.simulatorReady')}</h3>
                            <p className="text-xs text-gray-400 mt-2 max-w-[200px] leading-relaxed">{t('payroll.salaryStructure.calculator.simulatorReadyHint')}</p>
                        </div>
                    )}
                </div>
            )}



            {/* Component Dialog */}
            <Dialog open={componentDialogOpen} onOpenChange={setComponentDialogOpen}>
                <DialogContent className="max-w-md bg-white dark:bg-gray-900 border-none shadow-elev-6 rounded-3xl p-0 overflow-hidden">
                    <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-500/10 text-brand-500 rounded-2xl flex items-center justify-center">
                            <Package size={24} className="stroke-[2.5px]" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
                                {editingComponent ? t('payroll.salaryStructure.componentDialog.modifyTitle') : t('payroll.salaryStructure.componentDialog.constructTitle')}
                            </DialogTitle>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em] mt-0.5">{t('payroll.salaryStructure.componentDialog.definition')}</p>
                        </div>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('payroll.salaryStructure.componentDialog.officialName')}</Label>
                            <Input
                                value={componentName}
                                onChange={e => setComponentName(e.target.value)}
                                placeholder={t('payroll.salaryStructure.componentDialog.officialNamePlaceholder')}
                                className="h-11 px-4 text-sm font-semibold bg-gray-50 dark:bg-gray-950 border-gray-100 dark:border-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 rounded-xl transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-5 gap-4">
                            <div className="col-span-2 space-y-1.5">
                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('payroll.salaryStructure.componentDialog.codeRef')}</Label>
                                <Input
                                    value={componentCode}
                                    onChange={e => setComponentCode(e.target.value.toUpperCase())}
                                    placeholder={t('payroll.salaryStructure.componentDialog.codeRefPlaceholder')}
                                    className="h-11 px-4 text-sm font-bold bg-gray-50 dark:bg-gray-950 border-gray-100 dark:border-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 rounded-xl transition-all uppercase"
                                />
                            </div>
                            <div className="col-span-3 space-y-1.5">
                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('payroll.salaryStructure.componentDialog.typeClass')}</Label>
                                <select
                                    className="w-full h-11 px-4 text-xs font-bold bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer uppercase tracking-tight text-gray-700 dark:text-gray-200"
                                    value={componentType}
                                    onChange={e => setComponentType(e.target.value as any)}
                                >
                                    <option value="EARNING">{t('payroll.salaryStructure.componentDialog.typeEarning')}</option>
                                    <option value="DEDUCTION">{t('payroll.salaryStructure.componentDialog.typeDeduction')}</option>
                                    <option value="EMPLOYER_CONTRIBUTION">{t('payroll.salaryStructure.componentDialog.typeEmployerContribution')}</option>
                                    <option value="REIMBURSEMENT">{t('payroll.salaryStructure.componentDialog.typeReimbursement')}</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('payroll.salaryStructure.componentDialog.functionalCategory')}</Label>
                            <Input
                                value={componentCategory}
                                onChange={e => setComponentCategory(e.target.value)}
                                placeholder={t('payroll.salaryStructure.componentDialog.functionalCategoryPlaceholder')}
                                className="h-11 px-4 text-xs font-bold bg-gray-50 dark:bg-gray-950 border-gray-100 dark:border-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 rounded-xl transition-all uppercase"
                            />
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 cursor-pointer select-none" onClick={() => setComponentIsTaxable(!componentIsTaxable)}>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${componentIsTaxable ? 'bg-brand-500 border-brand-500 text-white' : 'bg-transparent border-gray-200 dark:border-gray-800'}`}>
                                {componentIsTaxable && <Check size={14} className="stroke-[3px]" />}
                            </div>
                            <div>
                                <Label htmlFor="isTaxable" className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-tight cursor-pointer">{t('payroll.salaryStructure.componentDialog.taxableIncrement')}</Label>
                                <p className="text-[9px] text-gray-400 font-medium uppercase tracking-widest mt-0.5">{t('payroll.salaryStructure.componentDialog.taxableIncrementHint')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-8 pt-0 flex gap-3">
                        <Button variant="ghost" className="flex-1 h-11 rounded-xl font-bold text-gray-400 text-xs uppercase"                                 onClick={() => setComponentDialogOpen(false)}>{t('payroll.salaryStructure.componentDialog.abort')}</Button>
                        <Button
                            onClick={handleSaveComponent}
                            disabled={!componentName || !componentCode}
                            className="flex-[2] h-11 bg-brand-500 hover:bg-brand-500/90 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-elev-4 shadow-brand-500/20"
                        >
                            {editingComponent ? t('payroll.salaryStructure.componentDialog.updateSchema') : t('payroll.salaryStructure.componentDialog.commitComponent')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Template Selection Dialog */}
            {templateDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="w-full max-w-3xl mx-4 bg-white dark:bg-gray-900 rounded-3xl shadow-elev-6 ring-1 ring-black/10 overflow-hidden">
                        {/* Dialog Header */}
                        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-brand-500/20 to-brand-500/5 text-brand-500 rounded-2xl flex items-center justify-center shadow-inner">
                                    <FileText size={24} className="stroke-[2px]" />
                                </div>
                                <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{t('payroll.salaryStructure.templateDialog.title')}</h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-0.5">{t('payroll.salaryStructure.templateDialog.subtitle')}</p>
                                </div>
                            </div>
                             <Button variant="ghost" 
                                onClick={() => setTemplateDialogOpen(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-all"
                            >
                                <X size={20} />
                            </Button>
                        </div>

                        {/* Dialog Body */}
                        <div className="p-8 max-h-[70vh] overflow-y-auto">
                            {templatesLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="animate-spin text-brand-500" size={32} />
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('payroll.salaryStructure.templateDialog.loading')}</p>
                                </div>
                            ) : templates.length === 0 ? (
                                <div className="text-center py-20">
                                    <FileText size={48} className="mx-auto text-gray-200 mb-4" />
                                    <p className="text-sm font-bold text-gray-400">{t('payroll.salaryStructure.templateDialog.noTemplates')}</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {templates.map(tmpl => (
                                        <div
                                            key={tmpl.id}
                                            className="group relative bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-brand-500/30 hover:shadow-elev-5 hover:shadow-brand-500/5 transition-all duration-300 overflow-hidden"
                                        >
                                            {/* Template Header */}
                                            <div className="p-6 pb-4 flex items-start justify-between">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-elev-4 shadow-orange-500/20 shrink-0">
                                                        <Globe size={24} className="text-white" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight group-hover:text-brand-500 transition-colors">{tmpl.name}</h3>
                                                        <p className="text-xs text-gray-500 mt-1 max-w-md leading-relaxed">{tmpl.description}</p>
                                                        <div className="flex items-center gap-2 mt-3">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 dark:bg-orange-500/10 text-orange-600 rounded-full text-[9px] font-black uppercase tracking-tight ring-1 ring-orange-500/20">
                                                                <Globe size={10} />
                                                                {tmpl.country}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 dark:bg-brand-500/10 text-brand-600 rounded-full text-[9px] font-black uppercase tracking-tight ring-1 ring-purple-500/20">
                                                                <Shield size={10} />
                                                                 {t('payroll.salaryStructure.templateDialog.compliant')}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-full text-[9px] font-bold uppercase tracking-tight ring-1 ring-black/5">
                                                                 {t('payroll.salaryStructure.templateDialog.componentsCount', { count: tmpl.components.length })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    disabled={createFromTemplateMut.isPending}
                                                    onClick={() => createFromTemplateMut.mutate(tmpl.id)}
                                                    className="px-6 h-10 bg-brand-500 hover:bg-brand-500/90 text-white font-black text-[10px] uppercase tracking-[0.15em] rounded-xl shadow-elev-4 shadow-brand-500/20 active:scale-95 transition-all flex items-center gap-2 shrink-0"
                                                >
                                                    {createFromTemplateMut.isPending ? (
                                                        <Loader2 className="animate-spin" size={14} />
                                                    ) : (
                                                        <ArrowRight size={14} className="stroke-[2.5px]" />
                                                    )}
                                                     {t('payroll.salaryStructure.templateDialog.useTemplate')}
                                                </Button>
                                            </div>

                                            {/* Components Preview */}
                                            <div className="px-6 pb-6">
                                                <div className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                                                    <div className="px-4 py-2.5 bg-gray-50/80 dark:bg-gray-950/30 border-b border-gray-100 dark:border-gray-800">
                                                        <div className="grid grid-cols-12 gap-2 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                                            <div className="col-span-4">{t('payroll.salaryStructure.templateDialog.previewComponent')}</div>
                                                            <div className="col-span-4">{t('payroll.salaryStructure.templateDialog.previewCalcRule')}</div>
                                                            <div className="col-span-4">{t('payroll.salaryStructure.templateDialog.previewValue')}</div>
                                                        </div>
                                                    </div>
                                                    {tmpl.components.map((c, idx) => (
                                                        <div key={c.code} className={`px-4 py-2.5 grid grid-cols-12 gap-2 items-center text-[11px] ${idx % 2 === 0 ? '' : 'bg-gray-50/40 dark:bg-gray-800/10'} ${idx < tmpl.components.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/50' : ''}`}>
                                                            <div className="col-span-4">
                                                                <span className="font-bold text-gray-700 dark:text-gray-200">{c.name}</span>
                                                                <span className="ml-2 text-[9px] text-gray-400 font-medium">{c.code}</span>
                                                            </div>
                                                            <div className="col-span-4">
                                                                <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tight ring-1 ring-black/5 ${c.calculation_type === 'REMAINING' ? 'bg-brand-50/50 text-brand-600 dark:bg-brand-500/10' :
                                                                    c.calculation_type === 'FIXED' ? 'bg-coral-50/50 text-coral-600 dark:bg-coral-500/10' :
                                                                        'bg-gray-50 text-gray-500 dark:bg-gray-800'
                                                                    }`}>
                                                                    {c.calculation_type.replace(/_/g, ' ')}
                                                                </span>
                                                            </div>
                                                            <div className="col-span-4 text-gray-500 font-medium text-[10px]">
                                                                {                                                                 c.calculation_type === 'REMAINING' ? t('payroll.salaryStructure.templateDialog.balanceAmount') :
                                                                    c.calculation_type === 'FIXED' ? `₹${c.fixed_amount?.toLocaleString('en-IN')}/mo` :
                                                                        `${c.percentage}%${c.max_value ? ` (max ₹${c.max_value.toLocaleString('en-IN')}/mo)` : ''}`
                                                                }
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalaryStructuresContent;
