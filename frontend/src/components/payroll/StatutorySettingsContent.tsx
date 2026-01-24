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
import { toast } from 'react-hot-toast';
import { Settings, Plus, Trash2, Save } from 'lucide-react';
import api from '@/services/api';

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
            toast.success('Statutory configuration saved');
            queryClient.invalidateQueries({ queryKey: ['payroll', 'statutory-config'] });
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to save configuration');
        }
    });

    // Create PT slab mutation
    const createPtSlabMutation = useMutation({
        mutationFn: async (payload: { state: string; minSalary: number; maxSalary?: number; monthlyTax: number }) => {
            const response = await api.post('/payroll/statutory/pt-slabs', payload);
            return response.data.data;
        },
        onSuccess: () => {
            toast.success('PT slab added');
            queryClient.invalidateQueries({ queryKey: ['payroll', 'pt-slabs'] });
            setAddPtOpen(false);
            resetPtForm();
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to add PT slab');
        }
    });

    // Delete PT slab mutation
    const deletePtSlabMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await api.delete(`/payroll/statutory/pt-slabs/${id}`);
            return response.data;
        },
        onSuccess: () => {
            toast.success('PT slab deleted');
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
            toast.success('Deduction type added');
            queryClient.invalidateQueries({ queryKey: ['payroll', 'deduction-types'] });
            setAddDeductionOpen(false);
            resetDeductionForm();
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to add deduction type');
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
            toast.error('Name and code are required');
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
                <h3 className="text-lg font-medium">Access Restricted</h3>
                <p className="text-muted-foreground">Only HR and Admin can access statutory settings.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Settings className="w-5 h-5" /> Statutory Settings
                </h2>
                <Button onClick={handleSaveConfig} disabled={saveConfigMutation.isPending} className="flex items-center gap-2">
                    <Save className="w-4 h-4" /> {saveConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
            </div>

            {/* PF Settings */}
            <Card className="p-6">
                <h3 className="text-lg font-medium mb-4">Provident Fund (PF)</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="pf_enabled"
                            checked={config.pf_enabled}
                            onChange={(e) => setConfig({ ...config, pf_enabled: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <Label htmlFor="pf_enabled">Enable PF</Label>
                    </div>
                    <div>
                        <Label>Employee Rate (%)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={config.pf_employee_rate}
                            onChange={(e) => setConfig({ ...config, pf_employee_rate: Number(e.target.value) })}
                            disabled={!config.pf_enabled}
                        />
                    </div>
                    <div>
                        <Label>Employer Rate (%)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={config.pf_employer_rate}
                            onChange={(e) => setConfig({ ...config, pf_employer_rate: Number(e.target.value) })}
                            disabled={!config.pf_enabled}
                        />
                    </div>
                    <div>
                        <Label>Wage Ceiling (₹)</Label>
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
                <h3 className="text-lg font-medium mb-4">Employee State Insurance (ESI)</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="esi_enabled"
                            checked={config.esi_enabled}
                            onChange={(e) => setConfig({ ...config, esi_enabled: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <Label htmlFor="esi_enabled">Enable ESI</Label>
                    </div>
                    <div>
                        <Label>Employee Rate (%)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={config.esi_employee_rate}
                            onChange={(e) => setConfig({ ...config, esi_employee_rate: Number(e.target.value) })}
                            disabled={!config.esi_enabled}
                        />
                    </div>
                    <div>
                        <Label>Employer Rate (%)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={config.esi_employer_rate}
                            onChange={(e) => setConfig({ ...config, esi_employer_rate: Number(e.target.value) })}
                            disabled={!config.esi_enabled}
                        />
                    </div>
                    <div>
                        <Label>Wage Ceiling (₹)</Label>
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
                    <h3 className="text-lg font-medium">Professional Tax (PT)</h3>
                    <Button size="sm" variant="outline" onClick={() => setAddPtOpen(true)} className="flex items-center gap-1">
                        <Plus className="w-4 h-4" /> Add PT Slab
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
                        <Label htmlFor="pt_enabled">Enable PT</Label>
                    </div>
                    <div>
                        <Label>Default State</Label>
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
                                <TableHead>State</TableHead>
                                <TableHead>Min Salary</TableHead>
                                <TableHead>Max Salary</TableHead>
                                <TableHead>Monthly Tax</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ptSlabs.map((slab) => (
                                <TableRow key={slab.id}>
                                    <TableCell>{slab.state}</TableCell>
                                    <TableCell>{formatAmount(slab.min_salary)}</TableCell>
                                    <TableCell>{slab.max_salary ? formatAmount(slab.max_salary) : 'No limit'}</TableCell>
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
                    <h3 className="text-lg font-medium">Deduction Types</h3>
                    <Button size="sm" variant="outline" onClick={() => setAddDeductionOpen(true)} className="flex items-center gap-1">
                        <Plus className="w-4 h-4" /> Add Deduction Type
                    </Button>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Recurring</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {deductionTypes.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No deduction types configured</TableCell></TableRow>
                        ) : (
                            deductionTypes.map((ded) => (
                                <TableRow key={ded.id}>
                                    <TableCell className="font-medium">{ded.name}</TableCell>
                                    <TableCell><code className="bg-gray-100 px-2 py-1 rounded">{ded.code}</code></TableCell>
                                    <TableCell><Badge variant="outline">{ded.category}</Badge></TableCell>
                                    <TableCell>{ded.calculation_type}</TableCell>
                                    <TableCell>{ded.is_recurring ? '✅ Yes' : '❌ No'}</TableCell>
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
                        <DialogTitle>Add PT Slab</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label>State</Label>
                            <select className="w-full border rounded p-2 mt-1" value={ptState} onChange={(e) => setPtState(e.target.value)}>
                                {INDIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Min Salary (₹)</Label>
                                <Input type="number" value={ptMinSalary} onChange={(e) => setPtMinSalary(Number(e.target.value))} />
                            </div>
                            <div>
                                <Label>Max Salary (₹)</Label>
                                <Input type="number" value={ptMaxSalary} onChange={(e) => setPtMaxSalary(e.target.value ? Number(e.target.value) : '')} placeholder="Leave empty for no limit" />
                            </div>
                        </div>
                        <div>
                            <Label>Monthly Tax (₹)</Label>
                            <Input type="number" value={ptMonthlyTax} onChange={(e) => setPtMonthlyTax(Number(e.target.value))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setAddPtOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreatePtSlab} disabled={createPtSlabMutation.isPending}>Add Slab</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Deduction Type Dialog */}
            <Dialog open={addDeductionOpen} onOpenChange={setAddDeductionOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Deduction Type</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label>Name *</Label>
                            <Input value={dedName} onChange={(e) => setDedName(e.target.value)} placeholder="e.g., Income Tax" />
                        </div>
                        <div>
                            <Label>Code *</Label>
                            <Input value={dedCode} onChange={(e) => setDedCode(e.target.value.toUpperCase())} placeholder="e.g., TDS" />
                        </div>
                        <div>
                            <Label>Category</Label>
                            <select className="w-full border rounded p-2 mt-1" value={dedCategory} onChange={(e) => setDedCategory(e.target.value)}>
                                <option value="STATUTORY">Statutory</option>
                                <option value="LOAN">Loan</option>
                                <option value="ADVANCE">Advance</option>
                                <option value="PENALTY">Penalty</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div>
                            <Label>Calculation Type</Label>
                            <select className="w-full border rounded p-2 mt-1" value={dedCalculationType} onChange={(e) => setDedCalculationType(e.target.value)}>
                                <option value="FIXED">Fixed Amount</option>
                                <option value="PERCENTAGE">Percentage</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="ded_recurring" checked={dedIsRecurring} onChange={(e) => setDedIsRecurring(e.target.checked)} className="w-4 h-4" />
                            <Label htmlFor="ded_recurring">Recurring Deduction</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setAddDeductionOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateDeductionType} disabled={createDeductionTypeMutation.isPending}>Add Type</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default StatutorySettingsContent;
