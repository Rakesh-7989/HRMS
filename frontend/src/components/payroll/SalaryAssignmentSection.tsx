import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { payrollService, SalaryStructure, EmployeeSalary, CTCBreakdown } from '@/services/payroll.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Calculator, Check, AlertCircle, History, Save } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface SalaryAssignmentSectionProps {
    employeeId: string;
    isReadOnly?: boolean;
}

export const SalaryAssignmentSection: React.FC<SalaryAssignmentSectionProps> = ({ employeeId, isReadOnly = false }) => {
    const queryClient = useQueryClient();
    const [selectedStructureId, setSelectedStructureId] = useState('');
    const [annualCTC, setAnnualCTC] = useState<number | ''>('');
    const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState('');
    const [breakdown, setBreakdown] = useState<CTCBreakdown | null>(null);

    // Queries
    const { data: structures = [], isLoading: structuresLoading, error: structuresError } = useQuery({
        queryKey: ['salary-structures'],
        queryFn: () => payrollService.listSalaryStructures()
    });

    const { data: currentSalary, isLoading: salaryLoading } = useQuery({
        queryKey: ['employee-salary', employeeId],
        queryFn: () => payrollService.getEmployeeSalary(employeeId)
    });

    const { data: history = [], isLoading: historyLoading } = useQuery({
        queryKey: ['employee-salary-history', employeeId],
        queryFn: () => payrollService.getEmployeeSalaryHistory(employeeId)
    });

    // Debug Logs
    useEffect(() => {
        console.log('[SalaryAssignmentSection] Structures:', structures);
        if (structuresError) console.error('[SalaryAssignmentSection] Error:', structuresError);
    }, [structures, structuresError]);

    // Mutations
    const calculateMut = useMutation({
        mutationFn: () => payrollService.calculateCTC(selectedStructureId, Number(annualCTC)),
        onSuccess: (data) => setBreakdown(data),
        onError: (err: any) => toast.error(err.message || 'Failed to calculate breakdown')
    });

    const assignMut = useMutation({
        mutationFn: () => payrollService.assignEmployeeSalary(employeeId, {
            structure_id: selectedStructureId,
            annual_ctc: Number(annualCTC),
            effective_from: effectiveFrom,
            revision_reason: reason
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employee-salary', employeeId] });
            queryClient.invalidateQueries({ queryKey: ['employee-salary-history', employeeId] });
            toast.success('Salary assigned successfully');
            setReason('');
            setBreakdown(null);
        },
        onError: (err: any) => toast.error(err.message || 'Failed to assign salary')
    });

    useEffect(() => {
        if (currentSalary) {
            setSelectedStructureId(currentSalary.structure_id);
            setAnnualCTC(currentSalary.annual_ctc);
        }
    }, [currentSalary]);

    const formatCurrency = (amount: number) =>
        amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

    if (salaryLoading || structuresLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    if (structuresError) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-md">
                Error loading salary structures: {(structuresError as Error).message}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold">Salary Assignment</h3>
                    {currentSalary && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                            Currently Active: {currentSalary.structure_name}
                        </span>
                    )}
                </div>

                {!isReadOnly && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-6">
                        <div className="space-y-2">
                            <Label>Salary Structure</Label>
                            <select
                                className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-primary"
                                value={selectedStructureId}
                                onChange={(e) => setSelectedStructureId(e.target.value)}
                            >
                                <option value="">-- Select Structure --</option>
                                {structures.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name} {s.is_default ? '(Default)' : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label>Annual CTC (₹)</Label>
                            <Input
                                type="number"
                                value={annualCTC as any}
                                onChange={(e) => setAnnualCTC(Number(e.target.value) || '')}
                                placeholder="e.g. 1200000"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Effective From</Label>
                            <Input
                                type="date"
                                value={effectiveFrom}
                                onChange={(e) => setEffectiveFrom(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                className="flex-1"
                                onClick={() => calculateMut.mutate()}
                                disabled={!selectedStructureId || !annualCTC || calculateMut.isPending}
                            >
                                {calculateMut.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <Calculator className="mr-2" size={16} />}
                                Calculate & Proceed
                            </Button>
                        </div>
                    </div>
                )}

                {breakdown && (
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                            <Calculator size={18} /> Breakdown Preview
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                            <div className="p-3 bg-white dark:bg-gray-900 rounded border border-gray-100 dark:border-gray-800">
                                <p className="text-gray-500">Monthly Gross</p>
                                <p className="text-lg font-bold">{formatCurrency(breakdown.gross_earnings)}</p>
                            </div>
                            <div className="p-3 bg-white dark:bg-gray-900 rounded border border-gray-100 dark:border-gray-800">
                                <p className="text-gray-500">Monthly Deductions</p>
                                <p className="text-lg font-bold text-red-600">{formatCurrency(breakdown.total_deductions)}</p>
                            </div>
                            <div className="p-3 bg-white dark:bg-gray-900 rounded border border-gray-100 dark:border-gray-800">
                                <p className="text-gray-500">Net Take-Home</p>
                                <p className="text-lg font-bold text-green-600">{formatCurrency(breakdown.monthly_net)}</p>
                            </div>
                            <div className="p-3 bg-white dark:bg-gray-900 rounded border border-gray-100 dark:border-gray-800">
                                <p className="text-gray-500">Annual CTC</p>
                                <p className="text-lg font-bold text-blue-600">{formatCurrency(breakdown.annual_ctc)}</p>
                            </div>
                        </div>

                        {!isReadOnly && (
                            <div className="space-y-4">
                                <div>
                                    <Label>Revision Reason</Label>
                                    <Input
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="e.g. Annual Appraisal 2024"
                                        className="mt-1"
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <Button variant="ghost" onClick={() => setBreakdown(null)}>Cancel</Button>
                                    <Button
                                        onClick={() => assignMut.mutate()}
                                        disabled={assignMut.isPending}
                                    >
                                        {assignMut.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
                                        Finalize Assignment
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {currentSalary && !breakdown && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 text-sm">
                        <div className="flex gap-3">
                            <AlertCircle className="text-blue-600 shrink-0" size={20} />
                            <div>
                                <p className="font-semibold text-blue-900 dark:text-blue-300">Active Salary Details</p>
                                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-blue-700/70 dark:text-blue-400">Monthly Net</p>
                                        <p className="font-bold text-blue-900 dark:text-blue-200">{formatCurrency(currentSalary.summary?.monthly_net || 0)}</p>
                                    </div>
                                    <div>
                                        <p className="text-blue-700/70 dark:text-blue-400">Annual CTC</p>
                                        <p className="font-bold text-blue-900 dark:text-blue-200">{formatCurrency(currentSalary.annual_ctc)}</p>
                                    </div>
                                    <div>
                                        <p className="text-blue-700/70 dark:text-blue-400">Effective From</p>
                                        <p className="font-bold text-blue-900 dark:text-blue-200">{format(new Date(currentSalary.effective_from), 'MMM dd, yyyy')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <History size={18} /> Revision History
                </h3>
                {historyLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
                ) : history.length === 0 ? (
                    <p className="text-center py-8 text-gray-500 italic">No salary history found</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Effective Date</TableHead>
                                <TableHead>Annual CTC</TableHead>
                                <TableHead>Structure</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map((h: any) => (
                                <TableRow key={h.id}>
                                    <TableCell>{format(new Date(h.effective_from), 'MMM dd, yyyy')}</TableCell>
                                    <TableCell className="font-semibold">{formatCurrency(h.annual_ctc)}</TableCell>
                                    <TableCell>{h.structure_name}</TableCell>
                                    <TableCell className="text-gray-500">{h.revision_reason || '-'}</TableCell>
                                    <TableCell>
                                        {h.is_current ? (
                                            <span className="flex items-center gap-1 text-green-600 text-xs font-bold uppercase tracking-wider">
                                                <Check size={12} /> Current
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Past</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>
        </div>
    );
};
