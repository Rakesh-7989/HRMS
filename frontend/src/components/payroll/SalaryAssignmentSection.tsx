import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { payrollService, CTCBreakdown } from '@/services/payroll.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Calculator, Check, AlertCircle, History, Save, DollarSign, Calendar, FileText, TrendingUp, Info } from 'lucide-react';
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
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="animate-spin text-primary" size={32} />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Retrieving Financial Schemas...</p>
            </div>
        );
    }

    if (structuresError) {
        return (
            <div className="p-8 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-2xl flex items-center gap-4 text-red-600 dark:text-red-400">
                <AlertCircle size={24} />
                <div>
                    <p className="font-black text-xs uppercase tracking-widest">Initialization Error</p>
                    <p className="text-sm font-medium mt-1">{(structuresError as Error).message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            <Card className="p-0 border-none shadow-sm ring-1 ring-black/5 overflow-hidden">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                            <DollarSign size={24} className="stroke-[2.5px]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white uppercase">Salary Assignment</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em] mt-0.5">Configuration & Contract Logic</p>
                        </div>
                    </div>
                    {currentSalary && (
                        <div className="flex items-center gap-3 px-4 py-2 bg-purple-50 dark:bg-purple-500/10 rounded-xl ring-1 ring-purple-500/20">
                            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                            <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                                Active: {currentSalary.structure_name}
                            </span>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-gray-50/50 dark:bg-gray-950/20">
                    {!isReadOnly && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Component Framework</Label>
                                <select
                                    className="w-full h-11 px-4 text-sm font-semibold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer shadow-sm text-gray-700 dark:text-gray-200"
                                    value={selectedStructureId}
                                    onChange={(e) => setSelectedStructureId(e.target.value)}
                                >
                                    <option value="">Select structure...</option>
                                    {structures.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name} {s.is_default ? '(Default)' : ''}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Annual CTC (Gross)</Label>
                                <div className="relative group/input">
                                    <Input
                                        type="number"
                                        value={annualCTC as any}
                                        onChange={(e) => setAnnualCTC(Number(e.target.value) || '')}
                                        placeholder="e.g. 1200000"
                                        className="h-11 pl-10 pr-4 font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-primary transition-colors">
                                        <DollarSign size={16} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Effective Timeline</Label>
                                <div className="relative group/input">
                                    <Input
                                        type="date"
                                        value={effectiveFrom}
                                        onChange={(e) => setEffectiveFrom(e.target.value)}
                                        className="h-11 pl-10 pr-4 font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-primary transition-colors">
                                        <Calendar size={16} />
                                    </div>
                                </div>
                            </div>

                            <Button
                                className="h-11 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-[0.15em] rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                                onClick={() => calculateMut.mutate()}
                                disabled={!selectedStructureId || !annualCTC || calculateMut.isPending}
                            >
                                {calculateMut.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <Calculator className="mr-2" size={16} />}
                                Initialize Audit
                            </Button>
                        </div>
                    )}
                </div>

                {breakdown && (
                    <div className="p-8 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 animate-fadeIn">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-8 h-8 bg-violet-50 dark:bg-violet-500/10 text-violet-600 rounded-lg flex items-center justify-center">
                                <Calculator size={18} />
                            </div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Breakdown Verification</h4>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 text-sm">
                            <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl ring-1 ring-black/5 shadow-sm">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Monthly Gross</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(breakdown.gross_earnings)}</p>
                            </div>
                            <div className="p-5 bg-red-50/50 dark:bg-red-500/5 rounded-2xl ring-1 ring-red-500/10 shadow-sm border border-red-100/50 dark:border-red-900/20">
                                <p className="text-[9px] font-bold text-red-500/50 dark:text-red-400/50 uppercase tracking-widest mb-1.5">Monthly Deductions</p>
                                <p className="text-lg font-black text-red-600 dark:text-red-400">{formatCurrency(breakdown.total_deductions)}</p>
                            </div>
                            <div className="p-5 bg-purple-50/50 dark:bg-purple-500/5 rounded-2xl ring-1 ring-purple-500/10 shadow-sm border border-purple-100/50 dark:border-purple-900/20">
                                <p className="text-[9px] font-bold text-purple-500/50 dark:text-purple-400/50 uppercase tracking-widest mb-1.5">Net Take-Home</p>
                                <p className="text-lg font-black text-purple-600 dark:text-purple-400">{formatCurrency(breakdown.monthly_net)}</p>
                            </div>
                            <div className="p-5 bg-primary/5 rounded-2xl ring-1 ring-primary/10 shadow-sm border border-primary/5">
                                <p className="text-[9px] font-bold text-primary/50 dark:text-primary/50 uppercase tracking-widest mb-1.5">Annual Valuation</p>
                                <p className="text-lg font-black text-primary">{formatCurrency(breakdown.annual_ctc)}</p>
                            </div>
                        </div>

                        {!isReadOnly && (
                            <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Revision Metadata / Audit Note</Label>
                                    <div className="relative group/input">
                                        <Input
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder="e.g. Annual Appraisal 2024 Cycle"
                                            className="h-11 pl-10 pr-4 font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                        />
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-primary transition-colors">
                                            <FileText size={16} />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <Button variant="ghost" className="h-11 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 dark:hover:text-gray-200 transition-all" onClick={() => setBreakdown(null)}>
                                        Discard
                                    </Button>
                                    <Button
                                        className="h-11 px-8 bg-slate-900 dark:bg-primary hover:bg-slate-800 dark:hover:bg-primary/90 text-white font-black text-xs uppercase tracking-[0.15em] rounded-xl shadow-lg transition-all active:scale-[0.98]"
                                        onClick={() => assignMut.mutate()}
                                        disabled={assignMut.isPending}
                                    >
                                        {assignMut.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
                                        Commit Assignment
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {currentSalary && !breakdown && (
                    <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                        <div className="flex items-start gap-5 p-6 bg-violet-50/30 dark:bg-violet-500/5 rounded-3xl ring-1 ring-blue-500/10 border border-violet-100/30 dark:border-violet-900/20">
                            <div className="w-10 h-10 bg-white dark:bg-gray-950 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                                <TrendingUp className="text-violet-600" size={20} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-4">
                                    <p className="text-[10px] font-black text-violet-900/50 dark:text-violet-400/50 uppercase tracking-[0.2em]">Active Financial Status</p>
                                    <div className="px-2 py-0.5 bg-violet-600 text-white text-[8px] font-black uppercase tracking-tighter rounded">Current Contract</div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                    <div>
                                        <p className="text-[9px] font-bold text-violet-700/50 dark:text-violet-400/40 uppercase tracking-widest mb-1.5">Monthly Liquidity</p>
                                        <p className="text-lg font-black text-violet-900 dark:text-violet-200">{formatCurrency(currentSalary.summary?.monthly_net || 0)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-violet-700/50 dark:text-violet-400/40 uppercase tracking-widest mb-1.5">Gross Valuation (Annual)</p>
                                        <p className="text-lg font-black text-violet-900 dark:text-violet-200">{formatCurrency(currentSalary.annual_ctc)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-violet-700/50 dark:text-violet-400/40 uppercase tracking-widest mb-1.5">Effective Timeline</p>
                                        <p className="text-sm font-black text-violet-900 dark:text-violet-200 uppercase tracking-widest">{format(new Date(currentSalary.effective_from), 'MMM dd, yyyy')}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-[8px] font-black text-violet-600/50 dark:text-violet-400/30 uppercase tracking-[0.2em] self-end">
                                        <Info size={12} strokeWidth={3} /> Verified by System
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            <Card className="p-0 border-none shadow-sm ring-1 ring-black/5 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center border border-gray-100 dark:border-gray-800">
                            <History size={18} className="text-gray-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Revision History</h3>
                            <p className="text-[10px] text-gray-500 mt-0.5 font-medium uppercase tracking-widest">Historical and current salary commitments</p>
                        </div>
                    </div>
                </div>

                {historyLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Loader2 className="animate-spin text-primary" size={24} />
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Sequencing Records...</p>
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-16 italic text-gray-400 text-xs font-medium uppercase tracking-widest">Null History Records Found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50/50 dark:bg-gray-900/50">
                                <TableRow>
                                    <TableHead className="text-[10px] font-bold uppercase text-gray-400 px-8 py-4">Effective Date</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase text-gray-400 px-8 py-4">Financial Valuation</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase text-gray-400 px-8 py-4">Schema Base</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase text-gray-400 px-8 py-4">Revision Context</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase text-gray-400 px-8 py-4 text-right">Commit Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((h: any) => (
                                    <TableRow key={h.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 border-gray-50 dark:border-gray-800 transition-colors group">
                                        <TableCell className="px-8 py-4 text-[13px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">
                                            {format(new Date(h.effective_from), 'MMM dd, yyyy')}
                                        </TableCell>
                                        <TableCell className="px-8 py-4">
                                            <span className="text-[13px] font-black text-gray-900 dark:text-white group-hover:text-primary transition-colors">{formatCurrency(h.annual_ctc)}</span>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter ml-1">/ Yr</span>
                                        </TableCell>
                                        <TableCell className="px-8 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                                                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-tight">{h.structure_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-8 py-4">
                                            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 italic">"{h.revision_reason || 'System Initialized'}"</span>
                                        </TableCell>
                                        <TableCell className="px-8 py-4 text-right">
                                            {h.is_current ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black bg-purple-50 dark:bg-purple-500/10 text-purple-600 uppercase tracking-tight ring-1 ring-purple-500/20">
                                                    <Check size={10} className="mr-1 stroke-[3px]" /> Currently Active
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Archived Log</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>
        </div>
    );
};
