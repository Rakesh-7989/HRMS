import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { payrollService } from '@/services/payroll.service';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { Download, Filter, FileText, Mail, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { PayrollSettings } from './PayrollSettings';
import { Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

type Payslip = {
    id: string;
    employee_name?: string;
    employee_email?: string;
    date?: string;
    period_month?: number;
    period_year?: number;
    gross?: number;
    deductions?: number;
    net?: number;
    payroll_run_id?: string;
    payrollRunId?: string;
    payrun_id?: string;
};

export const PayslipsContent: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
    const [customFromDate, setCustomFromDate] = useState('');
    const [customToDate, setCustomToDate] = useState('');

    const isHRorAdmin = user?.role === 'ADMIN' || user?.role === 'HR';
    const [activeSection, setActiveSection] = useState<'payslips' | 'settings'>('payslips');
    const [activeSubSection, setActiveSubSection] = useState<'personal' | 'staff'>('personal');
    const [showFilters, setShowFilters] = useState(false);

    // Generate payslips dialog state
    const [genDialogOpen, setGenDialogOpen] = useState(false);
    const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
    const [genYear, setGenYear] = useState(new Date().getFullYear());

    const dateRange = useMemo(() => {
        const now = new Date();
        let fromDate: Date;

        switch (selectedPeriod) {
            case '7d': fromDate = subDays(now, 7); break;
            case '30d': fromDate = subDays(now, 30); break;
            case '90d': fromDate = subDays(now, 90); break;
            case 'custom': return { from_date: customFromDate || format(subDays(now, 30), 'yyyy-MM-dd'), to_date: customToDate || format(now, 'yyyy-MM-dd') };
            default: fromDate = subDays(now, 30);
        }

        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
            from_date: format(fromDate, 'yyyy-MM-dd'),
            to_date: format(endOfMonth, 'yyyy-MM-dd')
        };
    }, [selectedPeriod, customFromDate, customToDate]);

    const { data: payslips = [], isLoading: payslipsLoading } = useQuery<Payslip[]>({
        queryKey: ['payslips', dateRange, user?.role, activeSubSection],
        queryFn: async (): Promise<Payslip[]> => {
            if (activeSubSection === 'staff' && (user?.role === 'ADMIN' || user?.role === 'HR')) {
                return payrollService.listPayslips(dateRange) as Promise<Payslip[]>;
            }
            return payrollService.getMyPayslips() as Promise<Payslip[]>;
        },
        enabled: activeSection === 'payslips'
    });

    // Simplified sections logic - removed pay_schedule, deductions, income_tax, salary_revision

    const formatINR = (amount: number | null | undefined) =>
        amount == null ? '—' : amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

    // Demo/mock data to display while backend is not populated
    const displayPayslips: Payslip[] = payslips || [];

    const exportCSV = (rows: Payslip[], filename = 'export.csv') => {
        if (!rows?.length) return;
        // Exclude internal IDs and technical fields
        const excludeFields = ['id', 'tenant_id', 'payroll_run_id', 'payrun_id', 'created_by', 'updated_by', 'created_at', 'updated_at', 'employee_id', 'assignment_id'];
        const headers = Object.keys(rows[0] as Record<string, unknown>).filter(h => !excludeFields.includes(h));

        const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r as Record<string, unknown>)[h] ?? ''}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Payslip actions: generation, download PDF, email, history
    const queryClient = useQueryClient();

    // Generate payslips mutation
    const generateMut = useMutation({
        mutationFn: (payload: { month: number; year: number }) => payrollService.generateMonthlyPayslips(payload),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['payslips'] });
            setGenDialogOpen(false);
            alert(t('payroll.generatedSuccess', { count: (data as Record<string, unknown>)?.total_employees as number ?? 0 }));
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { message?: string } }; message?: string };
            alert(t('payroll.generateFailed', { error: error.response?.data?.message || error.message || t('payroll.unknownError') }));
        }
    });

    const handleGeneratePayslips = () => {
        generateMut.mutate({ month: genMonth, year: genYear });
    };

    const downloadPayslip = async (p: unknown) => {
        try {
            const payslip = p as Payslip;
            const blob = await payrollService.downloadPayslip(payslip.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `payslip-${(payslip.employee_name || '').replace(/\s+/g, '-') || payslip.id}-${payslip.date}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert(t('payroll.downloadFailed'));
        }
    };

    const viewPayslip = async (p: unknown) => {
        try {
            const payslip = p as Payslip;
            const blob = await payrollService.downloadPayslip(payslip.id);
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err) {
            console.error(err);
            alert(t('payroll.viewFailed'));
        }
    };

    const emailPayslipMut = useMutation({
        mutationFn: ({ payslipId, to }: { payslipId: string; to?: string }) => payrollService.emailPayslip(payslipId, { to }),
        onSuccess: () => {
            alert(t('payroll.emailedSuccess'));
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { message?: string } }; message?: string };
            alert(t('payroll.sendEmailFailed') + ': ' + (error.response?.data?.message || error.message || 'Unknown error'));
        }
    });

    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [emailTargetPayslip, setEmailTargetPayslip] = useState<Payslip | null>(null);
    const [emailAddress, setEmailAddress] = useState('');

    const emailPayslip = (p: unknown) => {
        const payslip = p as Payslip;
        setEmailTargetPayslip(payslip);
        setEmailAddress(payslip.employee_email || '');
        setEmailDialogOpen(true);
    };

    const handleSendEmail = () => {
        if (!emailTargetPayslip || !emailAddress) return;
        emailPayslipMut.mutate({ payslipId: emailTargetPayslip.id, to: emailAddress });
        setEmailDialogOpen(false);
    };

    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [historyEmployee, setHistoryEmployee] = useState<Payslip | null>(null);

    const { data: payslipHistory = [], isLoading: payslipHistoryLoading } = useQuery<Payslip[]>({
        queryKey: ['payslip-history', historyEmployee?.id],
        queryFn: async (): Promise<Payslip[]> => {
            const employee = historyEmployee as Payslip;
            const data = await payrollService.listPayslipHistory({ employee_id: employee.id });
            return data as Payslip[];
        },
        enabled: !!historyEmployee && historyDialogOpen,
    });

    // Delete payslip confirmation
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteTargetPayslip, setDeleteTargetPayslip] = useState<Payslip | null>(null);

    const deletePayslipMut = useMutation({
        mutationFn: ({ payrunId, itemId }: { payrunId: string; itemId: string }) =>
            payrollService.deletePayslipItem(payrunId, itemId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payslips'] });
            setDeleteConfirmOpen(false);
            setDeleteTargetPayslip(null);
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { message?: string } }; message?: string };
            alert(t('payroll.deleteFailed', { error: error.response?.data?.message || error.message || t('payroll.unknownError') }));
        }
    });

    const confirmDeletePayslip = (p: unknown) => {
        const payslip = p as Payslip;
        setDeleteTargetPayslip(payslip);
        setDeleteConfirmOpen(true);
    };

    const handleDeletePayslip = () => {
        if (!deleteTargetPayslip) return;
        const payslip = deleteTargetPayslip;
        const payrunId = payslip.payroll_run_id || payslip.payrollRunId || payslip.payrun_id;
        if (!payrunId) {
            alert(t('payroll.unableDeterminePayrun'));
            return;
        }
        deletePayslipMut.mutate({ payrunId: payrunId as string, itemId: payslip.id });
    };


    return (
        <div className="space-y-6">
            {/* Top controls: Navigation and Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-elev-1">
                {[
                    { id: 'payslips', label: t('payroll.payslipsReport'), roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
                    { id: 'settings', label: t('payroll.settingsTab'), icon: Settings, roles: ['ADMIN', 'HR'] },
                ].filter(b => b.roles.includes(user?.role || '')).length > 1 && (
                        <div className="flex items-center gap-1 p-1 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
                            {[
                                { id: 'payslips', label: t('payroll.payslipsReport'), roles: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] },
                                { id: 'settings', label: t('payroll.settingsTab'), icon: Settings, roles: ['ADMIN', 'HR'] },
                            ].map((b) => {
                                if (!b.roles.includes(user?.role || '')) return null;
                                return (
                                    <Button variant="ghost"
                                        key={b.id}
                                        onClick={() => setActiveSection(b.id as 'payslips' | 'settings')}
                                        className={`flex items-center px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${activeSection === b.id
                                            ? 'bg-white dark:bg-gray-800 text-brand-500 shadow-elev-1 ring-1 ring-black/5'
                                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                                            }`}
                                    >
                                        {t('payroll.myPayslips')}
                                    </Button>
                                );
                            })}
                        </div>
                    )}

                <div className="flex flex-wrap gap-2">
                    {(user?.role === 'ADMIN' || user?.role === 'HR') && activeSection === 'payslips' && activeSubSection === 'staff' && (
                        <Button variant="primary" size="sm" onClick={() => setGenDialogOpen(true)} className="shadow-elev-1">
                            <FileText className="mr-2" size={14} />{t('payroll.generateMonthly')}
                        </Button>
                    )}

                    <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                        <Filter className="mr-2" size={14} />{t('payroll.filters')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (activeSection === 'payslips') exportCSV(displayPayslips, `payslips-${dateRange.from_date}-to-${dateRange.to_date}.csv`);
                        }}
                        disabled={(activeSection === 'payslips' && !displayPayslips.length)}
                        className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                    >
                        <Download className="mr-2" size={14} />{t('payroll.exportCsv')}
                    </Button>
                </div>
            </div>

            {/* Sub-tabs for HR/Admin under Payslips Report */}
            {activeSection === 'payslips' && (user?.role === 'ADMIN' || user?.role === 'HR') && (
                <div className="flex gap-2 p-1 bg-white/50 dark:bg-gray-800/30 rounded-lg w-fit border border-gray-100 dark:border-gray-800/50">
                     <Button variant="ghost"
                        onClick={() => setActiveSubSection('personal')}
                        className={`text-xs font-semibold px-4 py-1.5 rounded-md transition-all duration-200 ${activeSubSection === 'personal'
                            ? 'bg-brand-500 text-white shadow-elev-3'
                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                    >
                        {t('payroll.myPayslips')}
                    </Button>
                     <Button variant="ghost"
                        onClick={() => setActiveSubSection('staff')}
                        className={`text-xs font-semibold px-4 py-1.5 rounded-md transition-all duration-200 ${activeSubSection === 'staff'
                            ? 'bg-brand-500 text-white shadow-elev-3'
                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                    >
                        {t('payroll.staffPayslipsReport')}
                    </Button>
                </div>
            )}

            {/* Filters area */}
            {showFilters && (
                <Card>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium">{t('payroll.timePeriod')}</label>
                            <div className="flex gap-3 mt-2">
                                <Button size="sm" variant={selectedPeriod === '7d' ? 'primary' : 'outline'} onClick={() => setSelectedPeriod('7d')}>7d</Button>
                                <Button size="sm" variant={selectedPeriod === '30d' ? 'primary' : 'outline'} onClick={() => setSelectedPeriod('30d')}>30d</Button>
                                <Button size="sm" variant={selectedPeriod === '90d' ? 'primary' : 'outline'} onClick={() => setSelectedPeriod('90d')}>90d</Button>
                                <Button size="sm" variant={selectedPeriod === 'custom' ? 'primary' : 'outline'} onClick={() => setSelectedPeriod('custom')}>{t('payroll.custom')}</Button>
                            </div>
                        </div>

                        {selectedPeriod === 'custom' && (
                            <div className="mt-4">
                                <label className="text-sm font-medium mb-2 block">{t('payroll.customDateRange')}</label>
                                <DateRangePicker
                                    startDate={customFromDate}
                                    endDate={customToDate}
                                    onStartDateChange={setCustomFromDate}
                                    onEndDateChange={setCustomToDate}
                                    placeholder={t('payroll.selectPeriod')}
                                />
                            </div>
                        )}

                        {/* placeholders for more filters */}

                    </div>
                </Card>
            )}

            {/* Section content */}
            {activeSection === 'payslips' && (
                <Card className="p-0 border-none shadow-elev-1 ring-1 ring-black/5 overflow-hidden bg-white dark:bg-gray-800/50">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-brand-500/10 text-brand-500 rounded-xl flex items-center justify-center">
                                <FileText size={18} className="stroke-[2.5px]" />
                            </div>
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                {activeSubSection === 'staff' ? t('payroll.staffPayslipsReportTitle') : (isHRorAdmin ? t('payroll.myPayslipsAudit') : t('payroll.payslipsReportTitle'))}
                            </h3>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50/50 dark:bg-gray-900/50">
                                <TableRow>
                                    <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 tracking-widest">{t('payroll.month')}</TableHead>
                                    {activeSubSection === 'staff' && <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 tracking-widest">{t('payroll.employee')}</TableHead>}
                                    <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 tracking-widest">{t('payroll.grossPay')}</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 tracking-widest">{t('payroll.deductions')}</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 tracking-widest">{t('payroll.netPay')}</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 text-right tracking-widest">{t('payroll.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payslipsLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={activeSubSection === 'staff' ? 6 : 5} className="text-center py-12">
                                            <div className="flex items-center justify-center gap-2 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                                                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                                {t('payroll.retrievingRecords')}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : displayPayslips.length === 0 ? (
                                    <TableRow>
                                            <TableCell colSpan={activeSubSection === 'staff' ? 6 : 5} className="text-center py-12 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                                            {t('payroll.noPayslipData')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    displayPayslips.map((p: Payslip) => (
                                        <TableRow key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 border-gray-50 dark:border-gray-800 transition-colors">
                                            <TableCell className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300 text-xs">
                                                {p.period_month && p.period_year
                                                    ? new Date(p.period_year, p.period_month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
                                                    : p.date || '—'}
                                            </TableCell>
                                            {activeSubSection === 'staff' && <TableCell className="px-6 py-4 font-bold text-sm">{p.employee_name}</TableCell>}
                                            <TableCell className="px-6 py-4 font-bold text-xs">{formatINR(p.gross)}</TableCell>
                                            <TableCell className="px-6 py-4 font-bold text-xs text-red-500">{formatINR(p.deductions)}</TableCell>
                                            <TableCell className="px-6 py-4 font-black text-gray-900 dark:text-white text-xs">{formatINR(p.net)}</TableCell>
                                            <TableCell className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                     <Button size="sm" variant="ghost" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest hover:bg-brand-500/5" onClick={() => viewPayslip(p)}>{t('payroll.audit')}</Button>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-brand-500/5" onClick={() => downloadPayslip(p)}><Download size={14} /></Button>
                                                    {user?.role === 'HR' && (
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-brand-500/5" onClick={() => emailPayslip(p)}><Mail size={14} /></Button>
                                                    )}
                                                    {activeSubSection === 'staff' && (
                                                        <Button size="sm" variant="ghost" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest hover:bg-brand-500/5" onClick={() => { setHistoryEmployee(p); setHistoryDialogOpen(true); }}>{t('payroll.history')}</Button>
                                                    )}
                                                    {activeSubSection === 'staff' && (user?.role === 'ADMIN' || user?.role === 'HR') && (
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={() => confirmDeletePayslip(p)} title={t('payroll.deletePayslipTitle')}>
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            )}


            {/* Generate payslips dialog */}
            <Dialog open={genDialogOpen} onOpenChange={setGenDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('payroll.generateMonthlyPayslips')}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        <div>
                            <Label>{t('payroll.month')}</Label>
                            <select value={genMonth} onChange={(e) => setGenMonth(Number(e.target.value))} className="mt-2 p-2 border rounded-md w-full bg-white dark:bg-gray-900 text-sm dark:text-white dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-500/50">
                                <option value={1}>{t('payroll.months.january')}</option>
                                <option value={2}>{t('payroll.months.february')}</option>
                                <option value={3}>{t('payroll.months.march')}</option>
                                <option value={4}>{t('payroll.months.april')}</option>
                                <option value={5}>{t('payroll.months.may')}</option>
                                <option value={6}>{t('payroll.months.june')}</option>
                                <option value={7}>{t('payroll.months.july')}</option>
                                <option value={8}>{t('payroll.months.august')}</option>
                                <option value={9}>{t('payroll.months.september')}</option>
                                <option value={10}>{t('payroll.months.october')}</option>
                                <option value={11}>{t('payroll.months.november')}</option>
                                <option value={12}>{t('payroll.months.december')}</option>
                            </select>
                        </div>

                        <div>
                            <Label>{t('payroll.year')}</Label>
                            <input type="number" value={genYear} onChange={(e) => setGenYear(Number(e.target.value))} className="mt-2 p-2 border rounded-md w-full bg-white dark:bg-gray-900 text-sm dark:text-white dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-500/50" />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setGenDialogOpen(false)}>{t('payroll.cancel')}</Button>
                        <Button variant="primary" onClick={handleGeneratePayslips} isLoading={generateMut.isPending}>{t('payroll.generate')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payslip history dialog */}
            <Dialog open={historyDialogOpen} onOpenChange={(open) => { setHistoryDialogOpen(open); if (!open) setHistoryEmployee(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('payroll.payrollHistory')}{historyEmployee ? ` — ${(historyEmployee as Payslip).employee_name}` : ''}</DialogTitle>
                    </DialogHeader>

                    {payslipHistoryLoading ? (
                        <div className="p-4">{t('payroll.loading')}</div>
                    ) : !payslipHistory || (payslipHistory as Payslip[]).length === 0 ? (
                        <div className="p-4">{t('payroll.noPayslipHistory')}</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <tr>
                                    <TableHead>{t('payroll.date')}</TableHead>
                                    <TableHead>{t('payroll.gross')}</TableHead>
                                    <TableHead>{t('payroll.deductions')}</TableHead>
                                    <TableHead>{t('payroll.net')}</TableHead>
                                    <TableHead>{t('payroll.actions')}</TableHead>
                                </tr>
                            </TableHeader>
                            <TableBody>
                                {(payslipHistory as Payslip[]).map((h: Payslip) => (
                                    <TableRow key={h.id}>
                                        <TableCell>{h.date}</TableCell>
                                        <TableCell>{formatINR((h as Record<string, unknown>).gross as number)}</TableCell>
                                        <TableCell>{formatINR((h as Record<string, unknown>).deductions as number)}</TableCell>
                                        <TableCell>{formatINR((h as Record<string, unknown>).net as number)}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => downloadPayslip(h as Payslip)}>{t('payroll.download')}</Button>
                                                <Button size="sm" variant="outline" onClick={() => emailPayslip(h as Payslip)}>{t('payroll.email')}</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </DialogContent>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>{t('payroll.close')}</Button>
                </DialogFooter>
            </Dialog>


            {/* Email Payslip Dialog */}
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('payroll.emailPayslipTitle')}{emailTargetPayslip ? ` — ${(emailTargetPayslip as Payslip).employee_name}` : ''}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-4 mt-2">
                        <div>
                            <Label>{t('payroll.recipientEmail')}</Label>
                            <Input type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder={t('payroll.emailPlaceholder')} className="mt-2" />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>{t('payroll.cancel')}</Button>
                        <Button variant="primary" onClick={handleSendEmail} isLoading={emailPayslipMut.isPending}>{t('payroll.sendEmail')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {activeSection === 'settings' && (
                <PayrollSettings />
            )}

            {/* Delete Payslip Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={(open) => { setDeleteConfirmOpen(open); if (!open) setDeleteTargetPayslip(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('payroll.deletePayslip')}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('payroll.deleteConfirmMessage', { name: deleteTargetPayslip?.employee_name ?? '', date: deleteTargetPayslip?.date ?? '' })}
                        </p>
                        <p className="text-xs text-red-500 mt-2 font-semibold">{t('payroll.deleteConfirmWarning')}</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>{t('payroll.cancel')}</Button>
                        <Button
                            variant="primary"
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleDeletePayslip}
                            isLoading={deletePayslipMut.isPending}
                        >
                            {t('payroll.deletePermanently')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};