import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Sidebar } from '@/components/layout/Sidebar';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import payrollService from '@/services/payroll.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import LoanTypesPanel from '@/components/LoanTypesPanel';
import { useTranslation } from 'react-i18next';

const LoansPage: React.FC = () => {
  const { t } = useTranslation();

  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canManageLoans = hasPermission('payroll', 'manage_loans');
  const canManagePayroll = hasPermission('payroll', 'manage');
  const userRole = user?.role || 'EMPLOYEE';

  // Helper: check if role can create loans (EMPLOYEE, HR, ADMIN)
  const canCreateLoan = userRole === 'EMPLOYEE' || canManageLoans || canManagePayroll;
  // Simple UUID v4-ish check used for validating loanTypeId or employee id inputs
  const isUuid = (s: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);

  const queryClient = useQueryClient();
  // Fetch loan types for selection and display (HR/Admin only per backend)
  const { data: loanTypes } = useQuery({ queryKey: ['payroll', 'loan-types'], queryFn: () => payrollService.listLoanTypes() as unknown as Promise<Record<string, unknown>[]>, enabled: canManagePayroll || canManageLoans });
  const { data: loans, isLoading } = useQuery({
    queryKey: ['payroll', 'loans', userRole], queryFn: () => {
      if (userRole === 'EMPLOYEE') return payrollService.listLoans('employee') as unknown as Promise<Record<string, unknown>[]>;
      if (userRole === 'MANAGER') return payrollService.listLoans('team') as unknown as Promise<Record<string, unknown>[]>;
      return payrollService.listLoans('all') as unknown as Promise<Record<string, unknown>[]>;
    }
  });

  // Add / create states (admin simplified or employee detailed)
  const [addOpen, setAddOpen] = useState(false);
  const [loanEmployee, setLoanEmployee] = useState('');
  const [loanAmount, setLoanAmount] = useState<number | ''>('');
  const [loanOutstanding, setLoanOutstanding] = useState<number | ''>('');

  // modal state to show Loan Types management
  const [loanTypesOpen, setLoanTypesOpen] = useState(false);

  const [loanTypeIdInput, setLoanTypeIdInput] = useState('');
  const [loanPrincipal, setLoanPrincipal] = useState<number | ''>('');
  const [loanInterestRate, setLoanInterestRate] = useState<number | ''>('');
  const [loanInterestType, setLoanInterestType] = useState<'FLAT' | 'REDUCING'>('FLAT');
  const [loanTenureMonths, setLoanTenureMonths] = useState<number | ''>('');
  const [loanEmiAmount, setLoanEmiAmount] = useState<number | ''>('');
  const [loanTotalPayable, setLoanTotalPayable] = useState<number | ''>('');
  const [loanStartDate, setLoanStartDate] = useState<string | ''>('');

  // local error state for form / server errors
  const [loansError, setLoansError] = useState<string | null>(null);

  const createLoanMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => payrollService.createLoan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'loans'] });
      queryClient.invalidateQueries({ queryKey: ['payroll', 'summary'] });
      setLoansError(null);
      // reset form fields
      setLoanEmployee(''); setLoanAmount(''); setLoanOutstanding('');
      setLoanTypeIdInput(''); setLoanPrincipal(''); setLoanInterestRate(''); setLoanInterestType('FLAT'); setLoanTenureMonths(''); setLoanEmiAmount(''); setLoanTotalPayable(''); setLoanStartDate('');
      setAddOpen(false);
    },
    onError: (err: unknown) => {
      setLoansError((err as {response?: {data?: {message?: string}}})?.response?.data?.message || (err as {message?: string})?.message || 'Failed to create loan');
    },
  });

  const approveLoanMut = useMutation({
    mutationFn: ({ loanId, payload }: { loanId: string; payload: Record<string, unknown> }) => (payrollService.approveLoan as (loanId: string, payload: Record<string, unknown>) => Promise<unknown>)(loanId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'loans'] });
      setLoansError(null);
    },
    onError: (err: unknown) => setLoansError((err as {response?: {data?: {message?: string}}})?.response?.data?.message || (err as {message?: string})?.message || 'Failed to approve loan')
  });

  const closeLoanMut = useMutation({
    mutationFn: (loanId: string) => payrollService.closeLoan(loanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'loans'] });
      queryClient.invalidateQueries({ queryKey: ['payroll', 'summary'] });
      setLoansError(null);
    },
    onError: (err: unknown) => setLoansError((err as {response?: {data?: {message?: string}}})?.response?.data?.message || (err as {message?: string})?.message || 'Failed to close loan')
  });

  const handleSaveLoan = () => {
    setLoansError(null);
    if (!canCreateLoan) {
      setLoansError('You are not permitted to create loans.');
      return;
    }

    if (userRole === 'EMPLOYEE') {
      if (!loanTypeIdInput || !isUuid(loanTypeIdInput)) {
        setLoansError('Loan Type ID is required and must be a valid UUID.');
        return;
      }
      if (!loanPrincipal || Number(loanPrincipal) <= 0) {
        setLoansError('Principal amount must be a positive number.');
        return;
      }
      if (!loanTenureMonths || Number(loanTenureMonths) <= 0) {
        setLoansError('Tenure (months) must be a positive integer.');
        return;
      }

      const payload = {
        loanTypeId: loanTypeIdInput,
        principalAmount: Number(loanPrincipal),
        interestRate: Number(loanInterestRate || 0),
        interestType: loanInterestType,
        tenureMonths: Number(loanTenureMonths),
        emiAmount: loanEmiAmount ? Number(loanEmiAmount) : undefined,
        totalPayableAmount: loanTotalPayable ? Number(loanTotalPayable) : undefined,
        outstandingAmount: loanOutstanding ? Number(loanOutstanding) : undefined,
        startDate: loanStartDate || new Date().toISOString().slice(0, 10),
      };
      createLoanMut.mutate(payload);
      return;
    }

    // Admin simplified (HR/Admin can add)
    if (!loanEmployee) {
      setLoansError('Employee name or id is required for admin creation.');
      return;
    }
    if (!loanAmount || Number(loanAmount) <= 0) {
      setLoansError('Loan amount is required.');
      return;
    }

    const payloadAdmin: Record<string, unknown> = { amount: Number(loanAmount) };
    if (isUuid(loanEmployee)) payloadAdmin.employee_id = loanEmployee; else payloadAdmin.employee_name = loanEmployee;
    if (loanOutstanding) payloadAdmin.outstanding = Number(loanOutstanding);
    if (loanTypeIdInput) payloadAdmin.loan_type_id = loanTypeIdInput;
    createLoanMut.mutate(payloadAdmin);
  };

  const handleApprove = (loanId: string) => {
    approveLoanMut.mutate({ loanId, payload: { status: 'APPROVED' } });
  };

  const handleClose = (loanId: string) => {
    closeLoanMut.mutate(loanId);
  };

  // Reject workflow: open dialog to capture optional remarks before sending REJECTED status
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedLoanForApproval, setSelectedLoanForApproval] = useState<Record<string, unknown> | null>(null);
  const [approvalRemarks, setApprovalRemarks] = useState('');

  const handleOpenReject = (loan: Record<string, unknown>) => {
    setSelectedLoanForApproval(loan);
    setApprovalRemarks('');
    setApprovalDialogOpen(true);
  };

  const handleConfirmReject = () => {
    if (!selectedLoanForApproval) return;
    approveLoanMut.mutate({ loanId: selectedLoanForApproval.id as string, payload: { status: 'REJECTED', remarks: approvalRemarks } });
    setApprovalDialogOpen(false);
    setSelectedLoanForApproval(null);
    setApprovalRemarks('');
  };

  return (
    <DashboardLayout title={t('loans.title')}>
      <Sidebar />

      <div className="flex items-center justify-between mb-4">
        <div className="space-x-2">
          {canCreateLoan ? (
            <Button onClick={() => setAddOpen(true)}>Add Loan</Button>
          ) : (
            <div className="text-sm text-muted-foreground">You do not have permission to apply for or add loans.</div>
          )}
          {/* Loan Types modal trigger - visible to all users (read-only for non-HR/Admin) */}
          <Button variant="ghost" onClick={() => setLoanTypesOpen(true)}>Loan Types</Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Loan Type</TableHead>
              <TableHead>Principal</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell>{t('common.loading')}</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            ) : (loans || []).length === 0 ? (
              <TableRow>
                <TableCell>No loans found</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            ) : (
              (loans as unknown as Record<string, unknown>[]).map((l: Record<string, unknown>) => {
                const outstanding = l.outstanding_amount as number ?? l.outstanding as number ?? 0;
                return (
                  <TableRow key={l.id as string}>
                    <TableCell>{(l.employee_name as string) || (l.employee_id as string) || '—'}</TableCell>
                    <TableCell>{(() => { const found = (loanTypes as unknown as Record<string, unknown>[] || []).find((t: Record<string, unknown>) => t.id === (l.loan_type_id || l.loanTypeId)); return found ? (found.name as string) : ((l.loan_type_name as string) || (l.loanTypeName as string) || '—'); })()}</TableCell>
                    <TableCell>{(l.principal_amount as number) ?? (l.amount as number) ? `₹${Number((l.principal_amount as number) ?? (l.amount as number)).toLocaleString('en-IN')}` : '—'}</TableCell>
                    <TableCell>{outstanding ? `₹${Number(outstanding).toLocaleString('en-IN')}` : '—'}</TableCell>
                    <TableCell>{(l.status as string) ?? '—'}</TableCell>
                    <TableCell>
                      {canManageLoans && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => handleApprove(l.id as string)} disabled={(l.status as string) === 'APPROVED' || approveLoanMut.isPending}>Approve</Button>
                          <Button size="sm" variant="outline" className="ml-2" onClick={() => handleOpenReject(l)} disabled={(l.status as string) === 'REJECTED' || approveLoanMut.isPending}>Reject</Button>
                        </>
                      )}
                      {canManageLoans && Number(outstanding) <= 0 ? (
                        <Button size="sm" variant="ghost" onClick={() => handleClose(l.id as string)} disabled={closeLoanMut.isPending}>{t('common.close')}</Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Loan Types management modal for HR/Admin */}
      <Dialog open={loanTypesOpen} onOpenChange={setLoanTypesOpen}>
        <DialogContent className="max-w-3xl w-full">
          <DialogHeader>
            <DialogTitle>Loan Types</DialogTitle>
          </DialogHeader>

          <div className="mt-2">
            <LoanTypesPanel onCreated={(lt) => { setLoanTypeIdInput(lt.id); setLoanTypesOpen(false); queryClient.invalidateQueries({ queryKey: ['payroll', 'loan-types'] }); }} />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setLoanTypesOpen(false)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Loan</DialogTitle>
          </DialogHeader>

          <div className="grid gap-2">
            {loansError && (<div className="w-full text-sm text-red-600 mb-2">{loansError}</div>)}
            {/* Admin simplified fields */}
            {userRole !== 'EMPLOYEE' && (
              <>
                <Label>Employee Name or ID</Label>
                <Input value={loanEmployee} onChange={(e) => setLoanEmployee(e.target.value)} placeholder="Employee name or id" />

                <Label>Loan Amount</Label>
                <Input type="number" value={String(loanAmount)} onChange={(e) => setLoanAmount(Number(e.target.value) || '')} placeholder="Amount" />

                <Label>Outstanding (optional)</Label>
                <Input type="number" value={String(loanOutstanding)} onChange={(e) => setLoanOutstanding(Number(e.target.value) || '')} placeholder="Outstanding" />

                <Label>Loan Type (optional)</Label>
                <select value={loanTypeIdInput} onChange={(e) => setLoanTypeIdInput(e.target.value)} className="w-full px-3 py-2 border rounded-md mt-1">
                  <option value="">(none)</option>
                  {(loanTypes || []).map((lt: Record<string, unknown>) => (
                    <option key={lt.id as string} value={lt.id as string}>{lt.name as string}</option>
                  ))}
                </select>
              </>
            )}

            {/* Employee detailed application fields */}
            {userRole === 'EMPLOYEE' && (
              <>
                <Label>Loan Type Id</Label>
                <Input value={loanTypeIdInput} onChange={(e) => setLoanTypeIdInput(e.target.value)} placeholder={canManageLoans ? "Select or enter loan type id" : "Enter loan type id (contact HR for available loan types)"} />

                <Label>Principal Amount</Label>
                <Input type="number" value={String(loanPrincipal)} onChange={(e) => setLoanPrincipal(Number(e.target.value) || '')} placeholder="Principal" />

                <Label>Interest Rate (%)</Label>
                <Input type="number" value={String(loanInterestRate)} onChange={(e) => setLoanInterestRate(Number(e.target.value) || '')} placeholder="Interest %" />

                <Label>Interest Type</Label>
                <select value={loanInterestType} onChange={(e) => setLoanInterestType(e.target.value as 'FLAT' | 'REDUCING')} className="w-full px-3 py-2 border rounded-md mt-1">
                  <option value="FLAT">FLAT</option>
                  <option value="REDUCING">REDUCING</option>
                </select>

                <Label>Tenure (months)</Label>
                <Input type="number" value={String(loanTenureMonths)} onChange={(e) => setLoanTenureMonths(Number(e.target.value) || '')} placeholder="Months" />

                <Label>EMI Amount (optional)</Label>
                <Input type="number" value={String(loanEmiAmount)} onChange={(e) => setLoanEmiAmount(Number(e.target.value) || '')} placeholder="EMI" />

                <Label>Total Payable (optional)</Label>
                <Input type="number" value={String(loanTotalPayable)} onChange={(e) => setLoanTotalPayable(Number(e.target.value) || '')} placeholder="Total payable" />

                <Label>Outstanding (optional)</Label>
                <Input type="number" value={String(loanOutstanding)} onChange={(e) => setLoanOutstanding(Number(e.target.value) || '')} placeholder="Outstanding" />

                <Label>Start Date</Label>
                <Input type="date" value={loanStartDate} onChange={(e) => setLoanStartDate(e.target.value)} />
              </>
            )}
          </div>

          <DialogFooter>
            <Button isLoading={createLoanMut.isPending} onClick={handleSaveLoan}>Save Loan</Button>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>{t('common.cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Loan</DialogTitle>
          </DialogHeader>

          <div className="grid gap-2">
            <div>You're about to reject the loan for <strong>{(selectedLoanForApproval?.employee_name as string) || (selectedLoanForApproval?.employee_id as string) || '—'}</strong>. Add optional remarks below:</div>
            <Label>Remarks</Label>
            <Input value={approvalRemarks} onChange={(e) => setApprovalRemarks(e.target.value)} placeholder="Optional remarks" />
            {loansError && (<div className="w-full text-sm text-red-600">{loansError}</div>)}
          </div>

          <DialogFooter>
            <Button variant="destructive" isLoading={approveLoanMut.isPending} onClick={handleConfirmReject}>Reject</Button>
            <Button variant="ghost" onClick={() => setApprovalDialogOpen(false)}>{t('common.cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
};

export { LoansPage };
