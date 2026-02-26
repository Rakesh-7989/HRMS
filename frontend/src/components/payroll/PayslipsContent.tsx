import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { payrollService } from '@/services/finance/payroll.service';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { Download, Filter, FileText, Mail, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { PayrollSettings } from './PayrollSettings';
import { Settings } from 'lucide-react';
import { usePermission } from '@/contexts/PermissionContext';

export const PayslipsContent: React.FC = () => {
    const { hasAnyPermission } = usePermission();
    const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
    const [customFromDate, setCustomFromDate] = useState('');
    const [customToDate, setCustomToDate] = useState('');

    const isHRorAdmin = hasAnyPermission(['manage_payroll_components', 'process_payroll']);
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

    const { data: payslips = [], isLoading: payslipsLoading } = useQuery({
        queryKey: ['payslips', dateRange, isHRorAdmin, activeSubSection],
        queryFn: () => {
            if (activeSubSection === 'staff' && isHRorAdmin) {
                return payrollService.listPayslips(dateRange);
            }
            return payrollService.getMyPayslips();
        },
        enabled: activeSection === 'payslips'
    });

    // Simplified sections logic - removed pay_schedule, deductions, income_tax, salary_revision

    const formatINR = (amount: number | null | undefined) =>
        amount == null ? '—' : amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

    // Demo/mock data to display while backend is not populated
    const displayPayslips = payslips || [];

    const exportCSV = (rows: any[], filename = 'export.csv') => {
        if (!rows?.length) return;
        // Exclude internal IDs and technical fields
        const excludeFields = ['id', 'tenant_id', 'payroll_run_id', 'payrun_id', 'created_by', 'updated_by', 'created_at', 'updated_at', 'employee_id', 'assignment_id'];
        const headers = Object.keys(rows[0]).filter(h => !excludeFields.includes(h));

        const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))].join('\n');
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
            alert(`Payslips generated successfully! Total employees: ${data?.total_employees ?? 0}`);
        },
        onError: (err: any) => {
            alert(`Failed to generate payslips: ${err?.response?.data?.message || err?.message || 'Unknown error'}`);
        }
    });

    const handleGeneratePayslips = () => {
        generateMut.mutate({ month: genMonth, year: genYear });
    };

    const downloadPayslip = async (p: any) => {
        try {
            const blob = await payrollService.downloadPayslip(p.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `payslip-${(p.employee_name || '').replace(/\s+/g, '-') || p.id}-${p.date}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert('Failed to download payslip.');
        }
    };

    const viewPayslip = async (p: any) => {
        try {
            const blob = await payrollService.downloadPayslip(p.id);
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err) {
            console.error(err);
            alert('Failed to view payslip.');
        }
    };

    const emailPayslipMut = useMutation({
        mutationFn: ({ payslipId, to }: { payslipId: string; to?: string }) => payrollService.emailPayslip(payslipId, { to }),
        onSuccess: () => {
            alert('Payslip emailed successfully.');
        },
        onError: () => alert('Failed to send payslip email.')
    });

    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [emailTargetPayslip, setEmailTargetPayslip] = useState<any | null>(null);
    const [emailAddress, setEmailAddress] = useState('');

    const emailPayslip = (p: any) => {
        setEmailTargetPayslip(p);
        setEmailAddress(p.employee_email || '');
        setEmailDialogOpen(true);
    };

    const handleSendEmail = () => {
        if (!emailTargetPayslip || !emailAddress) return;
        emailPayslipMut.mutate({ payslipId: emailTargetPayslip.id, to: emailAddress });
        setEmailDialogOpen(false);
    };

    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [historyEmployee, setHistoryEmployee] = useState<any | null>(null);

    const { data: payslipHistory = [], isLoading: payslipHistoryLoading } = useQuery({
        queryKey: ['payslip-history', historyEmployee?.id],
        queryFn: () => payrollService.listPayslipHistory({ employee_id: historyEmployee?.id }),
        enabled: !!historyEmployee && historyDialogOpen,
    });

    // Delete payslip confirmation
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteTargetPayslip, setDeleteTargetPayslip] = useState<any | null>(null);

    const deletePayslipMut = useMutation({
        mutationFn: ({ payrunId, itemId }: { payrunId: string; itemId: string }) =>
            payrollService.deletePayslipItem(payrunId, itemId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payslips'] });
            setDeleteConfirmOpen(false);
            setDeleteTargetPayslip(null);
        },
        onError: (err: any) => {
            alert(`Failed to delete payslip: ${err?.response?.data?.message || err?.message || 'Unknown error'}`);
        }
    });

    const confirmDeletePayslip = (p: any) => {
        setDeleteTargetPayslip(p);
        setDeleteConfirmOpen(true);
    };

    const handleDeletePayslip = () => {
        if (!deleteTargetPayslip) return;
        const payrunId = deleteTargetPayslip.payroll_run_id || deleteTargetPayslip.payrollRunId || deleteTargetPayslip.payrun_id;
        if (!payrunId) {
            alert('Unable to determine the pay run for this payslip. Please refresh the page and try again.');
            return;
        }
        deletePayslipMut.mutate({ payrunId, itemId: deleteTargetPayslip.id });
    };



    return (
        <div className="space-y-6">
            {/* Top controls: Navigation and Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                {[
                    { id: 'payslips', label: 'Payslips Report', visible: true },
                    { id: 'settings', label: 'Settings', icon: Settings, visible: isHRorAdmin },
                ].filter(b => b.visible).length > 1 && (
                        <div className="flex items-center gap-1 p-1 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
                            {[
                                { id: 'payslips', label: 'Payslips Report', visible: true },
                                { id: 'settings', label: 'Settings', icon: Settings, visible: isHRorAdmin },
                            ].map((b) => {
                                if (!b.visible) return null;
                                return (
                                    <button
                                        key={b.id}
                                        onClick={() => setActiveSection(b.id as any)}
                                        className={`flex items-center px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${activeSection === b.id
                                            ? 'bg-white dark:bg-gray-800 text-primary shadow-sm ring-1 ring-black/5'
                                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                                            }`}
                                    >
                                        {b.icon && <b.icon className="mr-1.5" size={14} />}
                                        {b.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                <div className="flex flex-wrap gap-2">
                    {isHRorAdmin && activeSection === 'payslips' && activeSubSection === 'staff' && (
                        <Button variant="primary" size="sm" onClick={() => setGenDialogOpen(true)} className="shadow-sm">
                            <FileText className="mr-2" size={14} />Generate Monthly
                        </Button>
                    )}

                    <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                        <Filter className="mr-2" size={14} />Filters
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
                        <Download className="mr-2" size={14} />Export CSV
                    </Button>
                </div>
            </div>

            {/* Sub-tabs for HR/Admin under Payslips Report */}
            {activeSection === 'payslips' && isHRorAdmin && (
                <div className="flex gap-2 p-1 bg-white/50 dark:bg-gray-800/30 rounded-lg w-fit border border-gray-100 dark:border-gray-800/50">
                    <button
                        onClick={() => setActiveSubSection('personal')}
                        className={`text-xs font-semibold px-4 py-1.5 rounded-md transition-all duration-200 ${activeSubSection === 'personal'
                            ? 'bg-primary text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                    >
                        My Payslips
                    </button>
                    <button
                        onClick={() => setActiveSubSection('staff')}
                        className={`text-xs font-semibold px-4 py-1.5 rounded-md transition-all duration-200 ${activeSubSection === 'staff'
                            ? 'bg-primary text-white shadow-md'
                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                    >
                        Staff Payslips (Report)
                    </button>
                </div>
            )}

            {/* Filters area */}
            {showFilters && (
                <Card>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium">Time Period</label>
                            <div className="flex gap-3 mt-2">
                                <Button size="sm" variant={selectedPeriod === '7d' ? 'primary' : 'outline'} onClick={() => setSelectedPeriod('7d')}>7d</Button>
                                <Button size="sm" variant={selectedPeriod === '30d' ? 'primary' : 'outline'} onClick={() => setSelectedPeriod('30d')}>30d</Button>
                                <Button size="sm" variant={selectedPeriod === '90d' ? 'primary' : 'outline'} onClick={() => setSelectedPeriod('90d')}>90d</Button>
                                <Button size="sm" variant={selectedPeriod === 'custom' ? 'primary' : 'outline'} onClick={() => setSelectedPeriod('custom')}>Custom</Button>
                            </div>
                        </div>

                        {selectedPeriod === 'custom' && (
                            <div className="mt-4">
                                <label className="text-sm font-medium mb-2 block">Custom Date Range</label>
                                <DateRangePicker
                                    startDate={customFromDate}
                                    endDate={customToDate}
                                    onStartDateChange={setCustomFromDate}
                                    onEndDateChange={setCustomToDate}
                                    placeholder="Select period"
                                />
                            </div>
                        )}

                        {/* placeholders for more filters */}

                    </div>
                </Card>
            )}

            {/* Section content */}
            {activeSection === 'payslips' && (
                <Card className="p-0 border-none shadow-sm ring-1 ring-black/5 overflow-hidden bg-white dark:bg-gray-800/50">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                                <FileText size={18} className="stroke-[2.5px]" />
                            </div>
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                {activeSubSection === 'staff' ? 'Staff Payslips Report' : (isHRorAdmin ? 'My Payslips Audit' : 'Payslips Report')}
                            </h3>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50/50 dark:bg-gray-900/50">
                                <TableRow>
                                    <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 tracking-widest">Date</TableHead>
                                    {activeSubSection === 'staff' && <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 tracking-widest">Employee</TableHead>}
                                    <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 tracking-widest">Gross Pay</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 tracking-widest">Deductions</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 tracking-widest">Net Pay</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-gray-400 px-6 py-4 text-right tracking-widest">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payslipsLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={activeSubSection === 'staff' ? 6 : 5} className="text-center py-12">
                                            <div className="flex items-center justify-center gap-2 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                Retrieving Records...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : displayPayslips.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={activeSubSection === 'staff' ? 6 : 5} className="text-center py-12 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                                            No payslip data detected for selected cycle.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    displayPayslips.map((p: any) => (
                                        <TableRow key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 border-gray-50 dark:border-gray-800 transition-colors">
                                            <TableCell className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300 text-xs">{p.date}</TableCell>
                                            {activeSubSection === 'staff' && <TableCell className="px-6 py-4 font-bold text-sm">{p.employee_name}</TableCell>}
                                            <TableCell className="px-6 py-4 font-bold text-xs">{formatINR(p.gross)}</TableCell>
                                            <TableCell className="px-6 py-4 font-bold text-xs text-red-500">{formatINR(p.deductions)}</TableCell>
                                            <TableCell className="px-6 py-4 font-black text-gray-900 dark:text-white text-xs">{formatINR(p.net)}</TableCell>
                                            <TableCell className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button size="sm" variant="ghost" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest hover:bg-primary/5" onClick={() => viewPayslip(p)}>Audit</Button>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-primary/5" onClick={() => downloadPayslip(p)}><Download size={14} /></Button>
                                                    {isHRorAdmin && (
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-primary/5" onClick={() => emailPayslip(p)}><Mail size={14} /></Button>
                                                    )}
                                                    {activeSubSection === 'staff' && (
                                                        <Button size="sm" variant="ghost" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest hover:bg-primary/5" onClick={() => { setHistoryEmployee(p); setHistoryDialogOpen(true); }}>History</Button>
                                                    )}
                                                    {activeSubSection === 'staff' && isHRorAdmin && (
                                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={() => confirmDeletePayslip(p)} title="Delete payslip">
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
                        <DialogTitle>Generate Monthly Payslips</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        <div>
                            <Label>Month</Label>
                            <select value={genMonth} onChange={(e) => setGenMonth(Number(e.target.value))} className="mt-2 p-2 border rounded-md w-full bg-white dark:bg-gray-900 text-sm dark:text-white dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-primary">
                                <option value={1}>January</option>
                                <option value={2}>February</option>
                                <option value={3}>March</option>
                                <option value={4}>April</option>
                                <option value={5}>May</option>
                                <option value={6}>June</option>
                                <option value={7}>July</option>
                                <option value={8}>August</option>
                                <option value={9}>September</option>
                                <option value={10}>October</option>
                                <option value={11}>November</option>
                                <option value={12}>December</option>
                            </select>
                        </div>

                        <div>
                            <Label>Year</Label>
                            <input type="number" value={genYear} onChange={(e) => setGenYear(Number(e.target.value))} className="mt-2 p-2 border rounded-md w-full bg-white dark:bg-gray-900 text-sm dark:text-white dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setGenDialogOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleGeneratePayslips} isLoading={generateMut.isPending}>Generate</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payslip history dialog */}
            <Dialog open={historyDialogOpen} onOpenChange={(open) => { setHistoryDialogOpen(open); if (!open) setHistoryEmployee(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Payslip History {historyEmployee ? `— ${historyEmployee.employee_name}` : ''}</DialogTitle>
                    </DialogHeader>

                    {payslipHistoryLoading ? (
                        <div className="p-4">Loading...</div>
                    ) : !payslipHistory || payslipHistory.length === 0 ? (
                        <div className="p-4">No payslip history for this employee.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <tr>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Gross</TableHead>
                                    <TableHead>Deductions</TableHead>
                                    <TableHead>Net</TableHead>
                                    <TableHead>Actions</TableHead>
                                </tr>
                            </TableHeader>
                            <TableBody>
                                {payslipHistory.map((h: any) => (
                                    <TableRow key={h.id}>
                                        <TableCell>{h.date}</TableCell>
                                        <TableCell>{formatINR(h.gross)}</TableCell>
                                        <TableCell>{formatINR(h.deductions)}</TableCell>
                                        <TableCell>{formatINR(h.net)}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => downloadPayslip(h)}>Download</Button>
                                                <Button size="sm" variant="outline" onClick={() => emailPayslip(h)}>Email</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>



            {/* Email Payslip Dialog */}
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Email Payslip {emailTargetPayslip ? `— ${emailTargetPayslip.employee_name}` : ''}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-4 mt-2">
                        <div>
                            <Label>Recipient Email Address</Label>
                            <Input type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="employee@example.com" className="mt-2" />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleSendEmail} isLoading={emailPayslipMut.isPending}>Send Email</Button>
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
                        <DialogTitle>Delete Payslip</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Are you sure you want to permanently delete{' '}
                            <span className="font-bold text-gray-900 dark:text-white">{deleteTargetPayslip?.employee_name}'s</span>{' '}
                            payslip for <span className="font-bold text-gray-900 dark:text-white">{deleteTargetPayslip?.date}</span>?
                        </p>
                        <p className="text-xs text-red-500 mt-2 font-semibold">This action cannot be undone. The payslip and all its component data will be permanently removed.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                        <Button
                            variant="primary"
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleDeletePayslip}
                            isLoading={deletePayslipMut.isPending}
                        >
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
