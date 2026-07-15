import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import payrollService, { LoanType } from '@/services/payroll.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useAuth } from '@/contexts/AuthContext';
import LoanTypesPanel from '@/components/LoanTypesPanel';

interface Loan {
    id: string;
    employee_id?: string;
    employee_name?: string;
    loan_type_id?: string;
    loanTypeId?: string;
    principal_amount?: number;
    amount?: number;
    interest_rate?: number;
    interest_type?: string;
    tenure_months?: number;
    emi_amount?: number;
    total_payable_amount?: number;
    outstanding_amount?: number;
    outstanding?: number;
    start_date?: string;
    end_date?: string;
    status?: string;
    remarks?: string;
    created_at?: string;
    loan_type_name?: string;
    loanTypeName?: string;
}

export const LoansContent: React.FC = () => {
    const { user } = useAuth();
    const userRole = user?.role || 'EMPLOYEE';


    // Helper: check if role can create loans (EMPLOYEE, HR, ADMIN)
    const canCreateLoan = (role?: string) => ['EMPLOYEE', 'HR', 'ADMIN'].includes(role || '');
    // Simple UUID v4-ish check used for validating loanTypeId or employee id inputs
    const isUuid = (s: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);

    const queryClient = useQueryClient();
    // Fetch loan types for selection and display (HR/Admin only per backend)
    const canManage = ['HR', 'ADMIN'].includes(userRole);
    const { data: loanTypes = [] } = useQuery<LoanType[]>({ queryKey: ['payroll', 'loan-types'], queryFn: () => payrollService.listLoanTypes(), enabled: canManage });
    const { data: loans = [], isLoading } = useQuery<Loan[]>({
        queryKey: ['payroll', 'loans', userRole], queryFn: () => {
            if (userRole === 'EMPLOYEE') return payrollService.listLoans('employee');
            if (userRole === 'MANAGER') return payrollService.listLoans('team');
            return payrollService.listLoans('all');
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
            const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
            setLoansError(axiosErr?.response?.data?.message || axiosErr?.message || 'Failed to create loan');
        },
    });

    const approveLoanMut = useMutation({
        mutationFn: ({ loanId, payload }: { loanId: string; payload: { status: 'APPROVED' | 'REJECTED'; remarks?: string } }) => payrollService.approveLoan(loanId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'loans'] });
            setLoansError(null);
        },
        onError: (err: unknown) => {
            const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
            setLoansError(axiosErr?.response?.data?.message || axiosErr?.message || 'Failed to approve loan')
        }
    });

    const closeLoanMut = useMutation({
        mutationFn: (loanId: string) => payrollService.closeLoan(loanId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'loans'] });
            queryClient.invalidateQueries({ queryKey: ['payroll', 'summary'] });
            setLoansError(null);
        },
        onError: (err: unknown) => {
            const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
            setLoansError(axiosErr?.response?.data?.message || axiosErr?.message || 'Failed to close loan')
        }
    });

    const handleSaveLoan = () => {
        setLoansError(null);
        if (!canCreateLoan(userRole)) {
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
    const [selectedLoanForApproval, setSelectedLoanForApproval] = useState<Loan | null>(null);
    const [approvalRemarks, setApprovalRemarks] = useState('');

    const handleOpenReject = (loan: Loan) => {
        setSelectedLoanForApproval(loan);
        setApprovalRemarks('');
        setApprovalDialogOpen(true);
    };

    const handleConfirmReject = () => {
        if (!selectedLoanForApproval) return;
        approveLoanMut.mutate({ loanId: selectedLoanForApproval.id, payload: { status: 'REJECTED', remarks: approvalRemarks } });
        setApprovalDialogOpen(false);
        setSelectedLoanForApproval(null);
        setApprovalRemarks('');
    };

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="space-x-2">
                    {canCreateLoan(userRole) ? (
                        <Button onClick={() => setAddOpen(true)}>Add Loan</Button>
                    ) : (
                        <div className="text-sm text-muted-foreground">Only Employee, HR and Admin can add loans.</div>
                    )}
                    {/* Loan Types trigger - visible to all users (read-only for non-HR/Admin) */}
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
                                <TableCell>Loading...</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>-</TableCell>
                            </TableRow>
                        ) : loans.length === 0 ? (
                            <TableRow>
                                <TableCell>No loans found</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>-</TableCell>
                                <TableCell>-</TableCell>
                            </TableRow>
                        ) : (
                            loans.map((l: Loan) => {
                                const outstanding = l.outstanding_amount ?? l.outstanding ?? 0;
                                return (
                                    <TableRow key={l.id}>
                                        <TableCell>{l.employee_name || l.employee_id || '—'}</TableCell>
                                        <TableCell>{(() => { const found = loanTypes.find((t: LoanType) => t.id === (l.loan_type_id || l.loanTypeId)); return found ? (found.name as string) : (l.loan_type_name || l.loanTypeName || '—'); })()}</TableCell>
                                        <TableCell>{l.principal_amount ?? l.amount ?? '—'}</TableCell>
                                        <TableCell>{outstanding ?? '—'}</TableCell>
                                        <TableCell>{l.status ?? '—'}</TableCell>
                                        <TableCell>
                                            {(userRole === 'MANAGER' || userRole === 'HR') && (
                                                <>
                                                    <Button size="sm" variant="ghost" onClick={() => handleApprove(l.id)} disabled={l.status === 'APPROVED' || approveLoanMut.isPending}>Approve</Button>
                                                    <Button size="sm" variant="outline" className="ml-2" onClick={() => handleOpenReject(l)} disabled={l.status === 'REJECTED' || approveLoanMut.isPending}>Reject</Button>
                                                </>
                                            )}
                                            {(userRole === 'HR' || userRole === 'ADMIN') && Number(outstanding) <= 0 ? (
                                                <Button size="sm" variant="ghost" onClick={() => handleClose(l.id)} disabled={closeLoanMut.isPending}>Close</Button>
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
                        <Button variant="ghost" onClick={() => setLoanTypesOpen(false)}>Close</Button>
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
                                    {loanTypes.map((lt: LoanType) => (
                                        <option key={lt.id} value={lt.id}>{lt.name}</option>
                                    ))}
                                </select>
                            </>
                        )}

                        {/* Employee detailed application fields */}
                        {userRole === 'EMPLOYEE' && (
                            <>
                                <Label>Loan Type Id</Label>
                                <Input value={loanTypeIdInput} onChange={(e) => setLoanTypeIdInput(e.target.value)} placeholder={canManage ? "Select or enter loan type id" : "Enter loan type id (contact HR for available loan types)"} />

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
                        <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
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
                        <div>You're about to reject the loan for <strong>{selectedLoanForApproval?.employee_name || selectedLoanForApproval?.employee_id || '—'}</strong>. Add optional remarks below:</div>
                        <Label>Remarks</Label>
                        <Input value={approvalRemarks} onChange={(e) => setApprovalRemarks(e.target.value)} placeholder="Optional remarks" />
                        {loansError && (<div className="w-full text-sm text-red-600">{loansError}</div>)}
                    </div>

                    <DialogFooter>
                        <Button variant="destructive" isLoading={approveLoanMut.isPending} onClick={handleConfirmReject}>Reject</Button>
                        <Button variant="ghost" onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
