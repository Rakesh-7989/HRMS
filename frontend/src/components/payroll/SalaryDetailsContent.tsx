import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollService } from '@/services/payroll.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Save } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';

const formatINR = (amount: number | null | undefined) =>
    amount == null ? '—' : amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

type SalaryComponent = { id: string; name: string; amount: number };

export const SalaryDetailsContent: React.FC = () => {
    const { user } = useAuth();
    const isAuthorized = user?.role === 'ADMIN' || user?.role === 'HR';
    const queryClient = useQueryClient();

    const { data: salaryComponents = [], isLoading: salaryLoading } = useQuery<SalaryComponent[]>({
        queryKey: ['payroll', 'salary-components'],
        queryFn: () => payrollService.listSalaryComponents(),
    });

    const { data: salaryStructure } = useQuery<Record<string, unknown> | null>({
        queryKey: ['payroll', 'salary-structure'],
        queryFn: async () => {
            const result = await payrollService.getSalaryStructure();
            return result as Record<string, unknown> | null;
        },
    });

    const [basicSalary, setBasicSalary] = useState<number | ''>('');
    const [hraPercent, setHraPercent] = useState<number | ''>(20);
    const [otherAllowances, setOtherAllowances] = useState<number | ''>('');
    const [monthlyDeductions, setMonthlyDeductions] = useState<number | ''>('');
    const [employerContrib, setEmployerContrib] = useState<number | ''>('');

    useEffect(() => {
        if (salaryStructure) {
            setBasicSalary((salaryStructure.basic as number) ?? '');
            setHraPercent((salaryStructure.hra_percent as number) ?? 20);
            setOtherAllowances((salaryStructure.other_allowances as number) ?? '');
            setMonthlyDeductions((salaryStructure.monthly_deductions as number) ?? '');
            setEmployerContrib((salaryStructure.employer_contrib as number) ?? '');
        }
    }, [salaryStructure]);

    const hraAmount = useMemo(() => {
        return typeof basicSalary === 'number' && typeof hraPercent === 'number' ? Math.round(basicSalary * (hraPercent / 100)) : 0;
    }, [basicSalary, hraPercent]);

    const grossSalary = useMemo(() => Number(basicSalary || 0) + Number(hraAmount || 0) + Number(otherAllowances || 0), [basicSalary, hraAmount, otherAllowances]);
    const netSalary = useMemo(() => grossSalary - Number(monthlyDeductions || 0), [grossSalary, monthlyDeductions]);
    const ctc = useMemo(() => (grossSalary + Number(employerContrib || 0)) * 12, [grossSalary, employerContrib]);

    const updateSalaryMut = useMutation({
        mutationFn: (payload: { basic: number; hra_percent: number; other_allowances: number; monthly_deductions: number; employer_contrib?: number }) => payrollService.updateSalaryStructure(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'salary-structure'] });
            queryClient.invalidateQueries({ queryKey: ['payroll', 'summary'] });
        },
    });

    const handleSaveSalaryStructure = () => {
        updateSalaryMut.mutate({
            basic: Number(basicSalary || 0),
            hra_percent: Number(hraPercent || 0),
            other_allowances: Number(otherAllowances || 0),
            monthly_deductions: Number(monthlyDeductions || 0),
            employer_contrib: Number(employerContrib || 0),
        });
    };

    const [newSalaryName, setNewSalaryName] = useState('');
    const [newSalaryAmount, setNewSalaryAmount] = useState<number | ''>('');

    const createSalaryMut = useMutation({
        mutationFn: (payload: { name: string; amount: number }) => payrollService.createSalaryComponent(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'salary-components'] });
            queryClient.invalidateQueries({ queryKey: ['payroll', 'summary'] });
            setNewSalaryName('');
            setNewSalaryAmount('');
        },
    });

    const handleAddSalaryComponent = () => {
        if (!newSalaryName || !newSalaryAmount) return;
        createSalaryMut.mutate({ name: newSalaryName, amount: Number(newSalaryAmount) });
    };

    return (
        <div className="space-y-4">
            <Card>
                <h3 className="text-lg font-semibold mb-4">Salary Structure</h3>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
                    <div className="md:col-span-2">
                        <Label>Basic Salary (monthly)</Label>
                        <Input type="number" value={basicSalary} onChange={(e) => setBasicSalary(Number(e.target.value) || '')} className="mt-2" readOnly={!isAuthorized} />
                    </div>

                    <div className="md:col-span-1">
                        <Label>HRA (%)</Label>
                        <Input type="number" value={hraPercent} onChange={(e) => setHraPercent(Number(e.target.value) || '')} className="mt-2" readOnly={!isAuthorized} />
                    </div>

                    <div className="md:col-span-1">
                        <Label>Other Allowances (monthly)</Label>
                        <Input type="number" value={otherAllowances} onChange={(e) => setOtherAllowances(Number(e.target.value) || '')} className="mt-2" readOnly={!isAuthorized} />
                    </div>

                    <div className="md:col-span-1">
                        <Label>Monthly Deductions</Label>
                        <Input type="number" value={monthlyDeductions} onChange={(e) => setMonthlyDeductions(Number(e.target.value) || '')} className="mt-2" readOnly={!isAuthorized} />
                    </div>

                    <div className="md:col-span-1">
                        <Label>Employer Contribution (monthly)</Label>
                        <Input type="number" value={employerContrib} onChange={(e) => setEmployerContrib(Number(e.target.value) || '')} className="mt-2" readOnly={!isAuthorized} />
                    </div>

                    {isAuthorized && (
                        <div className="md:col-span-1 flex md:justify-end">
                            <Button variant="primary" onClick={handleSaveSalaryStructure} isLoading={updateSalaryMut.isPending} className="w-full md:w-auto px-4 py-2 flex items-center gap-2">
                                <Save size={16} />
                                <span>Save Structure</span>
                            </Button>
                        </div>
                    )}
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <h4 className="text-sm font-medium">HRA Amount</h4>
                        <div className="mt-2 text-lg font-semibold">{formatINR(hraAmount)}</div>
                    </Card>

                    <Card>
                        <h4 className="text-sm font-medium">Gross Salary (monthly)</h4>
                        <div className="mt-2 text-lg font-semibold">{formatINR(grossSalary)}</div>
                    </Card>

                    <Card>
                        <h4 className="text-sm font-medium">Net Salary (monthly)</h4>
                        <div className="mt-2 text-lg font-semibold">{formatINR(netSalary)}</div>
                    </Card>

                    <Card>
                        <h4 className="text-sm font-medium">CTC (annual)</h4>
                        <div className="mt-2 text-lg font-semibold">{formatINR(ctc)}</div>
                    </Card>
                </div>
            </Card>

            <Card>
                <h3 className="text-lg font-semibold mb-4">Salary Components</h3>

                {isAuthorized && (
                    <div className="flex gap-2 mb-4">
                        <Input value={newSalaryName} onChange={(e) => setNewSalaryName(e.target.value)} placeholder="Component name" className="w-1/2" />
                        <Input value={newSalaryAmount} onChange={(e) => setNewSalaryAmount(Number(e.target.value) || '')} placeholder="Amount" type="number" className="w-1/3" />
                        <Button onClick={handleAddSalaryComponent} isLoading={createSalaryMut.isPending}>Add</Button>
                    </div>
                )}

                <Table>
                    <TableHeader>
                        <tr>
                            <TableHead>Component</TableHead>
                            <TableHead>Amount</TableHead>
                        </tr>
                    </TableHeader>
                    <TableBody>
                        {salaryLoading ? (
                            <TableRow><TableCell colSpan={2} className="text-center p-4">Loading...</TableCell></TableRow>
                        ) : (
                            salaryComponents.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell>{s.name}</TableCell>
                                    <TableCell>{formatINR(s.amount)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
};