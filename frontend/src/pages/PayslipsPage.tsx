import React, { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { payrollService } from '@/services/payroll.service';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { Download, Filter, FileText, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { useTranslation } from 'react-i18next';

export const PayslipsPage: React.FC = () => {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');

  const [activeSection, setActiveSection] = useState<'payslips' | 'pay_schedule' | 'deductions' | 'income_tax' | 'salary_revision'>('payslips');
  const [showFilters, setShowFilters] = useState(false);

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

    return { from_date: format(fromDate, 'yyyy-MM-dd'), to_date: format(now, 'yyyy-MM-dd') };
  }, [selectedPeriod, customFromDate, customToDate]);

  // Fetch data for each section (placeholders / keyed queries)
  const { data: payslips = [], isLoading: payslipsLoading } = useQuery({
    queryKey: ['payslips', dateRange],
    queryFn: () => payrollService.listPayslips(dateRange) as Promise<Record<string, unknown>[]>,
    enabled: activeSection === 'payslips'
  });

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['pay_schedules'],
    queryFn: () => payrollService.listPaySchedules() as Promise<Record<string, unknown>[]>,
    enabled: activeSection === 'pay_schedule'
  });

  // Schedule edit dialog state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Record<string, unknown> | null>(null);
  const [scheduleCycle, setScheduleCycle] = useState<string>('Monthly');
  const [scheduleCreditDay, setScheduleCreditDay] = useState<number | ''>('');
  const [scheduleCutoffDay, setScheduleCutoffDay] = useState<number | ''>('');

  const updateScheduleMut = useMutation({
    mutationFn: ({ scheduleId, payload }: { scheduleId: string; payload: Record<string, unknown> }) => payrollService.updatePaySchedule(scheduleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pay_schedules'] });
      setScheduleDialogOpen(false);
      setEditingSchedule(null);
    }
  });

  const openScheduleDialog = (s: Record<string, unknown>) => {
    setEditingSchedule(s);
    setScheduleCycle((s.cycle as string) || (s.frequency as string) || 'Monthly');
    setScheduleCreditDay(typeof s.credit_day === 'number' ? s.credit_day as number : (s.credit_day ? Number(s.credit_day) : ''));
    setScheduleCutoffDay(typeof s.cutoff_day === 'number' ? s.cutoff_day as number : (s.cutoff_day ? Number(s.cutoff_day) : ''));
    setScheduleDialogOpen(true);
  };

  const handleSaveSchedule = () => {
    if (!editingSchedule) return;
    updateScheduleMut.mutate({ scheduleId: editingSchedule.id as string, payload: { cycle: scheduleCycle, credit_day: Number(scheduleCreditDay || 0), cutoff_day: Number(scheduleCutoffDay || 0) } });
  };

  const { data: deductions = [], isLoading: deductionsLoading } = useQuery({
    queryKey: ['deductions', dateRange],
    queryFn: () => payrollService.listDeductions(dateRange) as Promise<Record<string, unknown>[]>,
    enabled: activeSection === 'deductions'
  });

  const { data: incomeTax = [], isLoading: incomeTaxLoading } = useQuery({
    queryKey: ['income_tax', dateRange],
    queryFn: () => payrollService.listIncomeTax(dateRange) as Promise<Record<string, unknown>[]>,
    enabled: activeSection === 'income_tax'
  });

  const { data: revisions = [], isLoading: revisionsLoading } = useQuery({
    queryKey: ['salary_revisions', dateRange],
    queryFn: () => payrollService.listSalaryRevisions(dateRange) as Promise<Record<string, unknown>[]>,
    enabled: activeSection === 'salary_revision'
  });

  const formatINR = (amount: number | null | undefined) =>
    amount == null ? 'â€”' : amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });



  const displayPayslips: Record<string, unknown>[] = payslips || [];
  const displaySchedules: Record<string, unknown>[] = schedules || [];
  const displayDeductions: Record<string, unknown>[] = deductions || [];
  const displayIncomeTax: Record<string, unknown>[] = incomeTax || [];
  const displayRevisions: Record<string, unknown>[] = revisions || [];

  const exportCSV = (rows: Record<string, unknown>[], filename = 'export.csv') => {
    if (!rows?.length) return;
    const headers = Object.keys(rows[0]);
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

  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [genMonth, setGenMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [genYear, setGenYear] = useState<number>(new Date().getFullYear());

  const generatePayslipsMut = useMutation({
    mutationFn: (payload: { month: number; year: number }) => payrollService.generateMonthlyPayslips(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      setGenDialogOpen(false);
      alert('Monthly payslip generation started. It may take a few moments.');
    }
  });

  const downloadPayslip = async (p: Record<string, unknown>) => {
    try {
      const blob = await payrollService.downloadPayslip(p.id as string);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${((p.employee_name as string) || '').replace(/\s+/g, '-') || (p.id as string)}-${p.date as string}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download payslip.');
    }
  };

  const emailPayslipMut = useMutation({
    mutationFn: ({ payslipId, to }: { payslipId: string; to?: string }) => payrollService.emailPayslip(payslipId, { to }),
    onSuccess: () => {
      alert('Payslip emailed successfully.');
    },
    onError: () => alert('Failed to send payslip email.')
  });

  const emailPayslip = (p: Record<string, unknown>) => {
    const to = (p.employee_email as string) || prompt('Enter recipient email address', (p.employee_email as string) || '');
    if (!to) return;
    emailPayslipMut.mutate({ payslipId: p.id as string, to });
  };

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState<Record<string, unknown> | null>(null);

  const { data: payslipHistory = [], isLoading: payslipHistoryLoading } = useQuery({
    queryKey: ['payslip-history', historyEmployee?.id as string],
    queryFn: () => payrollService.listPayslipHistory({ employee_id: historyEmployee?.id as string }) as Promise<Record<string, unknown>[]>,
    enabled: !!historyEmployee && historyDialogOpen,
  });

  // Deduction types & Add Deduction dialog state
  const { data: deductionTypes = [] } = useQuery({
    queryKey: ['deduction-types'],
    queryFn: () => payrollService.listDeductionTypes() as unknown as Promise<Record<string, unknown>[]>,
    enabled: activeSection === 'deductions',
  });

  const [addDeductionOpen, setAddDeductionOpen] = useState(false);
  const [newDeductionEmployee, setNewDeductionEmployee] = useState('');
  const [newDeductionType, setNewDeductionType] = useState<string>('pf');
  const [newDeductionAmount, setNewDeductionAmount] = useState<number | ''>('');
  const [newDeductionDate, setNewDeductionDate] = useState<string>('');
  const [newDeductionNotes, setNewDeductionNotes] = useState<string>('');

  const createDeductionMut = useMutation({
    mutationFn: (payload: { employee_name?: string; type: string; amount: number; effective_date?: string; note?: string }) => payrollService.createDeduction(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deductions'] });
      queryClient.invalidateQueries({ queryKey: ['payroll', 'summary'] });
      setAddDeductionOpen(false);
      setNewDeductionEmployee(''); setNewDeductionType('pf'); setNewDeductionAmount(''); setNewDeductionDate(''); setNewDeductionNotes('');
    }
  });

  const handleAddDeduction = () => {
    if (!newDeductionEmployee || !newDeductionAmount) return alert('Please enter employee and amount.');
    createDeductionMut.mutate({ employee_name: newDeductionEmployee, type: newDeductionType, amount: Number(newDeductionAmount), effective_date: newDeductionDate || undefined, note: newDeductionNotes });
  };

  return (
    <DashboardLayout
      title="Payslips & Payroll Reports"
      breadcrumbs={[{ label: t('common.breadcrumbs.dashboard'), href: '/dashboard/personal' }, { label: 'Payslips' }]}
    >
      <div className="space-y-6">
        {/* Top controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2">
            {[
              { id: 'payslips', label: 'Payslips Report' },
              { id: 'pay_schedule', label: 'Pay Schedule' },
              { id: 'deductions', label: 'Deductions' },
              { id: 'income_tax', label: 'Income Tax' },
              { id: 'salary_revision', label: 'Salary Revision' },
            ].map((b) => (
              <Button key={b.id} variant={activeSection === b.id ? 'primary' : 'outline'} size="sm" onClick={() => setActiveSection(b.id as 'payslips' | 'pay_schedule' | 'deductions' | 'income_tax' | 'salary_revision')}>
                <FileText className="mr-2" size={14} />
                {b.label}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            {activeSection === 'payslips' && (
              <Button variant="primary" size="sm" onClick={() => setGenDialogOpen(true)}>
                <FileText className="mr-2" size={14} />Generate Monthly
              </Button>
            )}

            {activeSection === 'deductions' && (
              <Button variant="primary" size="sm" onClick={() => setAddDeductionOpen(true)}>
                <FileText className="mr-2" size={14} />Add Deduction
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}><Filter className="mr-2" size={14} />Filters</Button>
            <Button variant="outline" size="sm" onClick={() => {
              if (activeSection === 'payslips') exportCSV(displayPayslips, `payslips-${dateRange.from_date}-to-${dateRange.to_date}.csv`);
              else if (activeSection === 'pay_schedule') exportCSV(displaySchedules, 'pay-schedules.csv');
              else if (activeSection === 'deductions') exportCSV(displayDeductions, 'deductions.csv');
              else if (activeSection === 'income_tax') exportCSV(displayIncomeTax, 'income-tax.csv');
            }} disabled={
              (activeSection === 'payslips' && !displayPayslips.length) ||
              (activeSection === 'pay_schedule' && !displaySchedules.length) ||
              (activeSection === 'deductions' && !displayDeductions.length) ||
              (activeSection === 'income_tax' && !displayIncomeTax.length)
            }><Download className="mr-2" size={14} />Export CSV</Button>
          </div>
        </div>

        {/* Filters area - minimal to start */}
        {showFilters && (
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm font-medium">Time Period</span>
                <div className="flex gap-3 mt-2">
                  <Button size="sm" variant={selectedPeriod === '7d' ? 'primary' : 'outline'} onClick={() => setSelectedPeriod('7d')}>7d</Button>
                  <Button size="sm" variant={selectedPeriod === '30d' ? 'primary' : 'outline'} onClick={() => setSelectedPeriod('30d')}>30d</Button>
                  <Button size="sm" variant={selectedPeriod === '90d' ? 'primary' : 'outline'} onClick={() => setSelectedPeriod('90d')}>90d</Button>
                  <Button size="sm" variant={selectedPeriod === 'custom' ? 'primary' : 'outline'} onClick={() => setSelectedPeriod('custom')}>Custom</Button>
                </div>
              </div>

              {selectedPeriod === 'custom' && (
                <>
                  <div>
                    <label htmlFor="from-date" className="text-sm font-medium">From</label>
                    <input id="from-date" type="date" value={customFromDate} onChange={(e) => setCustomFromDate(e.target.value)} className="mt-2 p-2 border rounded-md w-full bg-white dark:bg-gray-900 text-sm dark:text-white dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-500/50 [color-scheme:light] dark:[color-scheme:dark]" />
                  </div>
                  <div>
                    <label htmlFor="to-date" className="text-sm font-medium">To</label>
                    <input id="to-date" type="date" value={customToDate} onChange={(e) => setCustomToDate(e.target.value)} className="mt-2 p-2 border rounded-md w-full bg-white dark:bg-gray-900 text-sm dark:text-white dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-500/50 [color-scheme:light] dark:[color-scheme:dark]" />
                  </div>
                </>
              )}

              {/* placeholders for more filters */}
              <div className="md:col-span-3 text-sm text-muted-foreground">You can add employee, department and export filters here.</div>
            </div>
          </Card>
        )}

        {/* Section content */}
        {activeSection === 'payslips' && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Payslips Report</h3>
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {payslipsLoading ? (
                  <TableRow><td className="p-4 text-center" colSpan={6}>{t('common.loading')}</td></TableRow>
                ) : displayPayslips.length === 0 ? (
                  <TableRow><td className="p-4 text-center" colSpan={6}>No payslips for selected period</td></TableRow>
                ) : (
                  displayPayslips.map((p: Record<string, unknown>) => (
                    <TableRow key={p.id as string}>
                      <TableCell>{p.date as string}</TableCell>
                      <TableCell>{p.employee_name as string}</TableCell>
                      <TableCell>{formatINR(p.gross as number)}</TableCell>
                      <TableCell>{formatINR(p.deductions as number)}</TableCell>
                      <TableCell>{formatINR(p.net as number)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">View</Button>
                          <Button size="sm" variant="outline" className="ml-2" onClick={() => downloadPayslip(p)}><Download size={14} /></Button>
                          <Button size="sm" variant="outline" className="ml-2" onClick={() => emailPayslip(p)}><Mail size={14} /></Button>
                          <Button size="sm" variant="outline" className="ml-2" onClick={() => { setHistoryEmployee(p); setHistoryDialogOpen(true); }}>History</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {activeSection === 'pay_schedule' && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Pay Schedule</h3>
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Salary Credit (day)</TableHead>
                  <TableHead>Payroll Cutoff (day)</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {schedulesLoading ? (
                  <TableRow><td className="p-4 text-center" colSpan={6}>{t('common.loading')}</td></TableRow>
                ) : displaySchedules.length === 0 ? (
                  <TableRow><td className="p-4 text-center" colSpan={6}>No schedules configured</td></TableRow>
                ) : (
                  displaySchedules.map((s: Record<string, unknown>) => (
                    <TableRow key={s.id as string}>
                      <TableCell>{s.name as string}</TableCell>
                      <TableCell>{s.next_run as string}</TableCell>
                      <TableCell>{(s.cycle as string) || (s.frequency as string) || '—'}</TableCell>
                      <TableCell>{s.credit_day as number ?? s.payment_day as number ?? '—'}</TableCell>
                      <TableCell>{s.cutoff_day as number ?? '—'}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openScheduleDialog(s)}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Schedule Edit Dialog */}
            <Dialog open={scheduleDialogOpen} onOpenChange={(open) => { setScheduleDialogOpen(open); if (!open) setEditingSchedule(null); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Pay Schedule {editingSchedule ? `â€” ${editingSchedule.name}` : ''}</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div>
                    <Label>Cycle</Label>
                    <select value={scheduleCycle} onChange={(e) => setScheduleCycle(e.target.value)} className="mt-2 p-2 border rounded-md w-full bg-white dark:bg-gray-900 text-sm dark:text-white dark:border-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-500/50">
                      <option value="Monthly">Monthly</option>
                      <option value="Fortnightly">Fortnightly</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Quarterly">Quarterly</option>
                    </select>
                  </div>

                  <div>
                    <Label>Salary Credit Day (1-31)</Label>
                    <Input type="number" min={1} max={31} value={scheduleCreditDay} onChange={(e) => setScheduleCreditDay(Number(e.target.value) || '')} className="mt-2" />
                  </div>

                  <div>
                    <Label>Payroll Cutoff Day (1-31)</Label>
                    <Input type="number" min={1} max={31} value={scheduleCutoffDay} onChange={(e) => setScheduleCutoffDay(Number(e.target.value) || '')} className="mt-2" />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>{t('common.cancel')}</Button>
                  <Button variant="primary" onClick={handleSaveSchedule} isLoading={updateScheduleMut.isPending}>{t('common.save')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </Card>
        )}

        {activeSection === 'deductions' && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Deductions</h3>
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Effective</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {deductionsLoading ? (
                  <TableRow><td className="p-4 text-center" colSpan={4}>{t('common.loading')}</td></TableRow>
                ) : displayDeductions.length === 0 ? (
                  <TableRow><td className="p-4 text-center" colSpan={4}>No deductions</td></TableRow>
                ) : (
                  displayDeductions.map((d: Record<string, unknown>) => (
                    <TableRow key={d.id as string}>
                      <TableCell>{d.employee_name as string}</TableCell>
                      <TableCell>{d.type as string}</TableCell>
                      <TableCell>{formatINR(d.amount as number)}</TableCell>
                      <TableCell>{d.effective_date as string}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {activeSection === 'income_tax' && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Income Tax</h3>
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Employee</TableHead>
                  <TableHead>FY</TableHead>
                  <TableHead>Taxable Income</TableHead>
                  <TableHead>Tax Deducted</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {incomeTaxLoading ? (
                  <TableRow><td className="p-4 text-center" colSpan={4}>{t('common.loading')}</td></TableRow>
                ) : displayIncomeTax.length === 0 ? (
                  <TableRow><td className="p-4 text-center" colSpan={4}>No income tax records</td></TableRow>
                ) : (
                  displayIncomeTax.map((tx: Record<string, unknown>) => (
                    <TableRow key={tx.id as string}>
                      <TableCell>{tx.employee_name as string}</TableCell>
                      <TableCell>{tx.fy as string}</TableCell>
                      <TableCell>{formatINR(tx.taxable_income as number)}</TableCell>
                      <TableCell>{formatINR(tx.tax_deducted as number)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {activeSection === 'salary_revision' && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Salary Revisions</h3>
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Employee</TableHead>
                  <TableHead>Old Salary</TableHead>
                  <TableHead>New Salary</TableHead>
                  <TableHead>Effective Date</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {revisionsLoading ? (
                  <TableRow><td className="p-4 text-center" colSpan={4}>{t('common.loading')}</td></TableRow>
                ) : revisions.length === 0 ? (
                  <TableRow><td className="p-4 text-center" colSpan={4}>No salary revisions</td></TableRow>
                ) : (
                  displayRevisions.map((r: Record<string, unknown>) => (
                    <TableRow key={r.id as string}>
                      <TableCell>{r.employee_name as string}</TableCell>
                      <TableCell>{formatINR(r.old_salary as number)}</TableCell>
                      <TableCell>{formatINR(r.new_salary as number)}</TableCell>
                      <TableCell>{r.effective_date as string}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
                <select value={genMonth} onChange={(e) => setGenMonth(Number(e.target.value))} className="mt-2 p-2 border rounded-md w-full">
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
                <input type="number" value={genYear} onChange={(e) => setGenYear(Number(e.target.value))} className="mt-2 p-2 border rounded-md w-full" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setGenDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button variant="primary" onClick={() => generatePayslipsMut.mutate({ month: genMonth, year: genYear })} isLoading={generatePayslipsMut.isPending}>Generate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payslip history dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={(open) => { setHistoryDialogOpen(open); if (!open) setHistoryEmployee(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Payslip History {historyEmployee ? `â€” ${historyEmployee.employee_name}` : ''}</DialogTitle>
            </DialogHeader>

            {payslipHistoryLoading ? (
              <div className="p-4">{t('common.loading')}</div>
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
                  {payslipHistory.map((h: Record<string, unknown>) => (
                    <TableRow key={h.id as string}>
                      <TableCell>{h.date as string}</TableCell>
                      <TableCell>{formatINR(h.gross as number)}</TableCell>
                      <TableCell>{formatINR(h.deductions as number)}</TableCell>
                      <TableCell>{formatINR(h.net as number)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => downloadPayslip(h)}>{t('common.download')}</Button>
                          <Button size="sm" variant="outline" onClick={() => emailPayslip(h)}>Email</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>{t('common.close')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Deduction Dialog */}
        <Dialog open={addDeductionOpen} onOpenChange={setAddDeductionOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Deduction</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4 mt-2">
              <div>
                <Label>Employee Name</Label>
                <Input value={newDeductionEmployee} onChange={(e) => setNewDeductionEmployee(e.target.value)} className="mt-2" />
              </div>

              <div>
                <Label>Type</Label>
                <select value={newDeductionType} onChange={(e) => setNewDeductionType(e.target.value)} className="mt-2 p-2 border rounded-md w-full">
                  {deductionTypes && deductionTypes.length ? deductionTypes.map((d: Record<string, unknown>) => <option key={d.id as string} value={d.id as string}>{d.name as string}</option>) : (
                    <>
                      <option value="pf">Provident Fund</option>
                      <option value="pt">Professional Tax</option>
                      <option value="esi">ESI</option>
                      <option value="tds">Tax (TDS)</option>
                      <option value="loan_emi">Loan EMI</option>
                      <option value="other">Other</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <Label>Amount</Label>
                <Input type="number" value={newDeductionAmount} onChange={(e) => setNewDeductionAmount(Number(e.target.value) || '')} className="mt-2" />
              </div>

              <div>
                <Label>Effective Date</Label>
                <input type="date" value={newDeductionDate} onChange={(e) => setNewDeductionDate(e.target.value)} className="mt-2 p-2 border rounded-md w-full" />
              </div>

              <div>
                <Label>Notes</Label>
                <Input value={newDeductionNotes} onChange={(e) => setNewDeductionNotes(e.target.value)} className="mt-2" />
              </div>

            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDeductionOpen(false)}>{t('common.cancel')}</Button>
              <Button variant="primary" onClick={handleAddDeduction} isLoading={createDeductionMut.isPending}>Add Deduction</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
};


