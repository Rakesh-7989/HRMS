import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { showToast } from '@/utils/toast';
import { Settings, Plus, Trash2, Save } from 'lucide-react';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';

interface StatutoryConfig {
    id?: string;
    pf_enabled: boolean;
    pf_employee_rate: number;
    pf_employer_rate: number;
    pf_wage_ceiling: number;
    esi_enabled: boolean;
    esi_employee_rate: number;
    esi_employer_rate: number;
    esi_wage_ceiling: number;
    pt_enabled: boolean;
    pt_state: string;
}

interface PTSlab {
    id: string;
    state: string;
    min_salary: number;
    max_salary: number | null;
    monthly_tax: number;
}

interface DeductionType {
    id: string;
    name: string;
    code: string;
    category: string;
    is_statutory: boolean;
    calculation_type: string;
    is_recurring: boolean;
}

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

export const StatutorySettingsContent: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'HR';
    const { t } = useTranslation();

    // Config state
    const [config, setConfig] = useState<StatutoryConfig>({
        pf_enabled: true,
        pf_employee_rate: 12,
        pf_employer_rate: 12,
        pf_wage_ceiling: 15000,
        esi_enabled: true,
        esi_employee_rate: 0.75,
        esi_employer_rate: 3.25,
        esi_wage_ceiling: 21000,
        pt_enabled: true,
        pt_state: 'Karnataka'
    });

    // PT Slab dialog state
    const [addPtOpen, setAddPtOpen] = useState(false);
    const [ptState, setPtState] = useState('Karnataka');
    const [ptMinSalary, setPtMinSalary] = useState<number | ''>(0);
    const [ptMaxSalary, setPtMaxSalary] = useState<number | ''>('');
    const [ptMonthlyTax, setPtMonthlyTax] = useState<number | ''>(0);

    // Deduction Type dialog state
    const [addDeductionOpen, setAddDeductionOpen] = useState(false);
    const [dedName, setDedName] = useState('');
    const [dedCode, setDedCode] = useState('');
    const [dedCategory, setDedCategory] = useState('OTHER');
    const [dedCalculationType, setDedCalculationType] = useState('FIXED');
    const [dedIsRecurring, setDedIsRecurring] = useState(false);

    // Fetch statutory config
    const { data: fetchedConfig } = useQuery<StatutoryConfig | null>({
        queryKey: ['payroll', 'statutory-config'],
        queryFn: async () => {
            try {
                const response = await api.get('/payroll/statutory/config');
                return response.data.data;
            } catch { return null; }
        }
    });

    // Fetch PT slabs
    const { data: ptSlabs = [] } = useQuery<PTSlab[]>({
        queryKey: ['payroll', 'pt-slabs'],
        queryFn: async () => {
            try {
                const response = await api.get('/payroll/statutory/pt-slabs');
                return response.data.data || [];
            } catch { return []; }
        }
    });

    // Fetch deduction types
    const { data: deductionTypes = [] } = useQuery<DeductionType[]>({
        queryKey: ['payroll', 'deduction-types'],
        queryFn: async () => {
            try {
                const response = await api.get('/payroll/statutory/deduction-types');
                return response.data.data || [];
            } catch { return []; }
        }
    });

    // Update config state when fetched
    useEffect(() => {
        if (fetchedConfig) {
            setConfig(fetchedConfig);
        }
    }, [fetchedConfig]);

    // Save config mutation
    const saveConfigMutation = useMutation({
        mutationFn: async (payload: StatutoryConfig) => {
            const response = await api.post('/payroll/statutory/config', payload);
            return response.data.data;
        },
        onSuccess: () => {
            showToast.success(t('payroll.statutory.toast.configSaved'));
            queryClient.invalidateQueries({ queryKey: ['payroll', 'statutory-config'] });
        },
        onError: (err: any) => {
            showToast.error(err?.response?.data?.message || t('payroll.statutory.toast.saveFailed'));
        }
    });

    // Create PT slab mutation
    const createPtSlabMutation = useMutation({
        mutationFn: async (payload: { state: string; minSalary: number; maxSalary?: number; monthlyTax: number }) => {
            const response = await api.post('/payroll/statutory/pt-slabs', payload);
            return response.data.data;
        },
        onSuccess: () => {
            showToast.success(t('payroll.statutory.toast.ptSlabAdded'));
            queryClient.invalidateQueries({ queryKey: ['payroll', 'pt-slabs'] });
            setAddPtOpen(false);
            resetPtForm();
        },
        onError: (err: any) => {
            showToast.error(err?.response?.data?.message || t('payroll.statutory.toast.ptSlabAddFailed'));
        }
    });

    // Delete PT slab mutation
    const deletePtSlabMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await api.delete(`/payroll/statutory/pt-slabs/${id}`);
            return response.data;
        },
        onSuccess: () => {
            showToast.success(t('payroll.statutory.toast.ptSlabDeleted'));
            queryClient.invalidateQueries({ queryKey: ['payroll', 'pt-slabs'] });
        }
    });

    // Create deduction type mutation
    const createDeductionTypeMutation = useMutation({
        mutationFn: async (payload: { name: string; code: string; category: string; calculationType: string; isRecurring: boolean }) => {
            const response = await api.post('/payroll/statutory/deduction-types', payload);
            return response.data.data;
        },
        onSuccess: () => {
            showToast.success(t('payroll.statutory.toast.deductionAdded'));
            queryClient.invalidateQueries({ queryKey: ['payroll', 'deduction-types'] });
            setAddDeductionOpen(false);
            resetDeductionForm();
        },
        onError: (err: any) => {
            showToast.error(err?.response?.data?.message || t('payroll.statutory.toast.deductionAddFailed'));
        }
    });

    const resetPtForm = () => {
        setPtState('Karnataka');
        setPtMinSalary(0);
        setPtMaxSalary('');
        setPtMonthlyTax(0);
    };

    const resetDeductionForm = () => {
        setDedName('');
        setDedCode('');
        setDedCategory('OTHER');
        setDedCalculationType('FIXED');
        setDedIsRecurring(false);
    };

    const handleSaveConfig = () => {
        saveConfigMutation.mutate(config);
    };

    const handleCreatePtSlab = () => {
        createPtSlabMutation.mutate({
            state: ptState,
            minSalary: Number(ptMinSalary),
            maxSalary: ptMaxSalary ? Number(ptMaxSalary) : undefined,
            monthlyTax: Number(ptMonthlyTax)
        });
    };

    const handleCreateDeductionType = () => {
        if (!dedName || !dedCode) {
            showToast.error(t('payroll.statutory.toast.nameCodeRequired'));
            return;
        }
        createDeductionTypeMutation.mutate({
            name: dedName,
            code: dedCode,
            category: dedCategory,
            calculationType: dedCalculationType,
            isRecurring: dedIsRecurring
        });
    };

    const formatAmount = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

    if (!isAdmin) {
        return (
            <Card className="p-8 text-center">
                <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium">{t('payroll.statutory.accessRestricted')}</h3>
                <p className="text-muted-foreground">{t('payroll.statutory.accessRestrictedDesc')}</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Settings className="w-5 h-5" /> {t('payroll.statutory.title')}
                </h2>
                <Button onClick={handleSaveConfig} disabled={saveConfigMutation.isPending} className="flex items-center gap-2">
                    <Save className="w-4 h-4" /> {saveConfigMutation.isPending ? t('payroll.statutory.saving') : t('payroll.statutory.saveConfig')}
                </Button>
            </div>

            {/* PF Settings */}
            <Card className="p-6">
                <h3 className="text-lg font-medium mb-4">{t('payroll.statutory.pfTitle')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="pf_enabled"
                            checked={config.pf_enabled}
                            onChange={(e) => setConfig({ ...config, pf_enabled: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <Label htmlFor="pf_enabled">{t('payroll.statutory.pfEnabled')}</Label>
                    </div>
                    <div>
                        <Label>{t('payroll.statutory.employeeRate')}</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={config.pf_employee_rate}
                            onChange={(e) => setConfig({ ...config, pf_employee_rate: Number(e.target.value) })}
                            disabled={!config.pf_enabled}
                        />
                    </div>
                    <div>
                        <Label>{t('payroll.statutory.employerRate')}</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={config.pf_employer_rate}
                            onChange={(e) => setConfig({ ...config, pf_employer_rate: Number(e.target.value) })}
                            disabled={!config.pf_enabled}
                        />
                    </div>
                    <div>
                        <Label>{t('payroll.statutory.wageCeiling')}</Label>
                        <Input
                            type="number"
                            value={config.pf_wage_ceiling}
                            onChange={(e) => setConfig({ ...config, pf_wage_ceiling: Number(e.target.value) })}
                            disabled={!config.pf_enabled}
                        />
                    </div>
                </div>
            </Card>

            {/* ESI Settings */}
            <Card className="p-6">
                <h3 className="text-lg font-medium mb-4">{t('payroll.statutory.esiTitle')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="esi_enabled"
                            checked={config.esi_enabled}
                            onChange={(e) => setConfig({ ...config, esi_enabled: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <Label htmlFor="esi_enabled">{t('payroll.statutory.esiEnabled')}</Label>
                    </div>
                    <div>
                        <Label>{t('payroll.statutory.employeeRate')}</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={config.esi_employee_rate}
                            onChange={(e) => setConfig({ ...config, esi_employee_rate: Number(e.target.value) })}
                            disabled={!config.esi_enabled}
                        />
                    </div>
                    <div>
                        <Label>{t('payroll.statutory.employerRate')}</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={config.esi_employer_rate}
                            onChange={(e) => setConfig({ ...config, esi_employer_rate: Number(e.target.value) })}
                            disabled={!config.esi_enabled}
                        />
                    </div>
                    <div>
                        <Label>{t('payroll.statutory.wageCeiling')}</Label>
                        <Input
                            type="number"
                            value={config.esi_wage_ceiling}
                            onChange={(e) => setConfig({ ...config, esi_wage_ceiling: Number(e.target.value) })}
                            disabled={!config.esi_enabled}
                        />
                    </div>
                </div>
            </Card>

            {/* Professional Tax Settings */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">{t('payroll.statutory.ptTitle')}</h3>
                    <Button size="sm" variant="outline" onClick={() => setAddPtOpen(true)} className="flex items-center gap-1">
                        <Plus className="w-4 h-4" /> {t('payroll.statutory.addPtSlab')}
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="pt_enabled"
                            checked={config.pt_enabled}
                            onChange={(e) => setConfig({ ...config, pt_enabled: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <Label htmlFor="pt_enabled">{t('payroll.statutory.ptEnabled')}</Label>
                    </div>
                    <div>
                        <Label>{t('payroll.statutory.defaultState')}</Label>
                        <select
                            className="w-full border rounded p-2"
                            value={config.pt_state}
                            onChange={(e) => setConfig({ ...config, pt_state: e.target.value })}
                            disabled={!config.pt_enabled}
                        >
                            {INDIAN_STATES.map(state => (
                                <option key={state} value={state}>{state}</option>
                            ))}
                        </select>
                    </div>
                </div>
                {ptSlabs.length > 0 && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('payroll.statutory.table.state')}</TableHead>
                                <TableHead>{t('payroll.statutory.table.minSalary')}</TableHead>
                                <TableHead>{t('payroll.statutory.table.maxSalary')}</TableHead>
                                <TableHead>{t('payroll.statutory.table.monthlyTax')}</TableHead>
                                <TableHead>{t('payroll.statutory.table.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ptSlabs.map((slab) => (
                                <TableRow key={slab.id}>
                                    <TableCell>{slab.state}</TableCell>
                                    <TableCell>{formatAmount(slab.min_salary)}</TableCell>
                                    <TableCell>{slab.max_salary ? formatAmount(slab.max_salary) : t('payroll.statutory.noLimit')}</TableCell>
                                    <TableCell>{formatAmount(slab.monthly_tax)}</TableCell>
                                    <TableCell>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-red-600"
                                            onClick={() => deletePtSlabMutation.mutate(slab.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Deduction Types */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">{t('payroll.statutory.deductionTypes')}</h3>
                    <Button size="sm" variant="outline" onClick={() => setAddDeductionOpen(true)} className="flex items-center gap-1">
                        <Plus className="w-4 h-4" /> {t('payroll.statutory.addDeductionType')}
                    </Button>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('payroll.statutory.table.name')}</TableHead>
                            <TableHead>{t('payroll.statutory.table.code')}</TableHead>
                            <TableHead>{t('payroll.statutory.table.category')}</TableHead>
                            <TableHead>{t('payroll.statutory.table.type')}</TableHead>
                            <TableHead>{t('payroll.statutory.table.recurring')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {deductionTypes.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t('payroll.statutory.noDeductionTypes')}</TableCell></TableRow>
                        ) : (
                            deductionTypes.map((ded) => (
                                <TableRow key={ded.id}>
                                    <TableCell className="font-medium">{ded.name}</TableCell>
                                    <TableCell><code className="bg-gray-100 px-2 py-1 rounded">{ded.code}</code></TableCell>
                                    <TableCell><Badge variant="outline">{ded.category}</Badge></TableCell>
                                    <TableCell>{ded.calculation_type}</TableCell>
                                    <TableCell>{ded.is_recurring ? t('payroll.statutory.yes') : t('payroll.statutory.no')}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Add PT Slab Dialog */}
            <Dialog open={addPtOpen} onOpenChange={setAddPtOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('payroll.statutory.addPtSlab')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label>{t('payroll.statutory.state')}</Label>
                            <select className="w-full border rounded p-2 mt-1" value={ptState} onChange={(e) => setPtState(e.target.value)}>
                                {INDIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>{t('payroll.statutory.minSalary')}</Label>
                                <Input type="number" value={ptMinSalary} onChange={(e) => setPtMinSalary(Number(e.target.value))} />
                            </div>
                            <div>
                                <Label>{t('payroll.statutory.maxSalary')}</Label>
                                <Input type="number" value={ptMaxSalary} onChange={(e) => setPtMaxSalary(e.target.value ? Number(e.target.value) : '')} placeholder={t('payroll.statutory.maxSalaryPlaceholder')} />
                            </div>
                        </div>
                        <div>
                            <Label>{t('payroll.statutory.monthlyTax')}</Label>
                            <Input type="number" value={ptMonthlyTax} onChange={(e) => setPtMonthlyTax(Number(e.target.value))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setAddPtOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleCreatePtSlab} disabled={createPtSlabMutation.isPending}>{t('payroll.statutory.addSlab')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Deduction Type Dialog */}
            <Dialog open={addDeductionOpen} onOpenChange={setAddDeductionOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('payroll.statutory.addDeductionType')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label>{t('payroll.statutory.nameRequired')}</Label>
                            <Input value={dedName} onChange={(e) => setDedName(e.target.value)} placeholder={t('payroll.statutory.namePlaceholder')} />
                        </div>
                        <div>
                            <Label>{t('payroll.statutory.codeRequired')}</Label>
                            <Input value={dedCode} onChange={(e) => setDedCode(e.target.value.toUpperCase())} placeholder={t('payroll.statutory.codePlaceholder')} />
                        </div>
                        <div>
                            <Label>{t('payroll.statutory.categoryLabel')}</Label>
                            <select className="w-full border rounded p-2 mt-1" value={dedCategory} onChange={(e) => setDedCategory(e.target.value)}>
                                <option value="STATUTORY">{t('payroll.statutory.category.statutory')}</option>
                                <option value="LOAN">{t('payroll.statutory.category.loan')}</option>
                                <option value="ADVANCE">{t('payroll.statutory.category.advance')}</option>
                                <option value="PENALTY">{t('payroll.statutory.category.penalty')}</option>
                                <option value="OTHER">{t('payroll.statutory.category.other')}</option>
                            </select>
                        </div>
                        <div>
                            <Label>{t('payroll.statutory.calculationType')}</Label>
                            <select className="w-full border rounded p-2 mt-1" value={dedCalculationType} onChange={(e) => setDedCalculationType(e.target.value)}>
                                <option value="FIXED">{t('payroll.statutory.calc.fixed')}</option>
                                <option value="PERCENTAGE">{t('payroll.statutory.calc.percentage')}</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="ded_recurring" checked={dedIsRecurring} onChange={(e) => setDedIsRecurring(e.target.checked)} className="w-4 h-4" />
                            <Label htmlFor="ded_recurring">{t('payroll.statutory.recurringDeduction')}</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setAddDeductionOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleCreateDeductionType} disabled={createDeductionTypeMutation.isPending}>{t('payroll.statutory.addType')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default StatutorySettingsContent;
