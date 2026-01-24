import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Sidebar } from '@/components/layout/Sidebar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import payrollService from '@/services/payroll.service';
import { PayRun } from '@/types/payroll';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Play, Lock, FileText, CheckCircle, RefreshCw, Trash2, XCircle, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const PayRunPage: React.FC = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: runs = [], isLoading, refetch } = useQuery<PayRun[]>({
        queryKey: ['payroll', 'runs'],
        queryFn: () => payrollService.getPayRuns(),
    });

    const [createOpen, setCreateOpen] = useState(false);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    // Reject dialog state
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectRunId, setRejectRunId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    // Delete confirmation state
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteRunId, setDeleteRunId] = useState<string | null>(null);

    const createMut = useMutation({
        mutationFn: (payload: { periodMonth: number; periodYear: number }) => payrollService.createPayRun(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
            setCreateOpen(false);
            toast.success('Pay run created');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create pay run'),
    });

    const calculateMut = useMutation({
        mutationFn: (id: string) => payrollService.calculatePayRun(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
            toast.success('Pay run calculated');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Calculation failed'),
    });

    const approveMut = useMutation({
        mutationFn: (id: string) => payrollService.approvePayRun(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
            toast.success('Pay run approved');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Approval failed'),
    });

    const lockMut = useMutation({
        mutationFn: (id: string) => payrollService.lockPayRun(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
            toast.success('Pay run locked');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Lock failed'),
    });

    const rejectMut = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => payrollService.rejectPayRun(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
            setRejectOpen(false);
            setRejectRunId(null);
            setRejectReason('');
            toast.success('Pay run rejected');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Rejection failed'),
    });

    const revokeMut = useMutation({
        mutationFn: (id: string) => payrollService.revokePayRun(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
            toast.success('Pay run revoked');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Revoke failed'),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => payrollService.deletePayRun(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
            setDeleteOpen(false);
            setDeleteRunId(null);
            toast.success('Pay run deleted');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Delete failed'),
    });

    const handleCreate = () => {
        createMut.mutate({ periodMonth: Number(month), periodYear: Number(year) });
    };

    const handleReject = () => {
        if (!rejectRunId || !rejectReason.trim()) {
            toast.error('Please provide a rejection reason');
            return;
        }
        rejectMut.mutate({ id: rejectRunId, reason: rejectReason });
    };

    const handleDelete = () => {
        if (deleteRunId) {
            deleteMut.mutate(deleteRunId);
        }
    };

    const openRejectDialog = (id: string) => {
        setRejectRunId(id);
        setRejectReason('');
        setRejectOpen(true);
    };

    const openDeleteDialog = (id: string) => {
        setDeleteRunId(id);
        setDeleteOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PAID':
            case 'COMPLETED':
                return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
            case 'APPROVED':
                return <Badge className="bg-blue-100 text-blue-800">Approved</Badge>;
            case 'LOCKED':
                return <Badge className="bg-purple-100 text-purple-800">Locked</Badge>;
            case 'PENDING_APPROVAL':
                return <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>;
            case 'REJECTED':
                return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
            case 'REVOKED':
                return <Badge className="bg-orange-100 text-orange-800">Revoked</Badge>;
            case 'DRAFT':
                return <Badge variant="secondary">Draft</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <DashboardLayout title="Pay Runs" breadcrumbs={[{ label: 'Payroll', href: '/payroll' }, { label: 'Pay Runs' }]}>
            <Sidebar />

            <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-muted-foreground">
                    {runs.length} pay run(s) found
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw size={16} className="mr-2" /> Refresh
                    </Button>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Play size={16} className="mr-2" /> Run Payroll
                    </Button>
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead>Gross Pay</TableHead>
                            <TableHead>Total Deductions</TableHead>
                            <TableHead>Net Pay</TableHead>
                            <TableHead>Employees</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={7}>Loading...</TableCell></TableRow> :
                            runs.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center p-4 text-muted-foreground">No pay runs found. Click "Run Payroll" to start.</TableCell></TableRow> :
                                runs.map(run => (
                                    <TableRow key={run.id}>
                                        <TableCell className="font-medium">
                                            {new Date(run.period_year, run.period_month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                        </TableCell>
                                        <TableCell>{(run.total_gross || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                                        <TableCell className="text-red-600">-{(run.total_deductions || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                                        <TableCell className="font-semibold">{(run.total_net_pay || run.total_net || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                                        <TableCell>{run.employee_count || run.total_employees || 0}</TableCell>
                                        <TableCell>{getStatusBadge(run.status)}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                {/* Calculate Action - DRAFT only */}
                                                {run.status === 'DRAFT' && (
                                                    <Button size="sm" variant="ghost" onClick={() => calculateMut.mutate(run.id)} title="Calculate Payroll">
                                                        <RefreshCw size={16} className={calculateMut.isPending ? 'animate-spin' : ''} />
                                                    </Button>
                                                )}

                                                {/* Approve Action - DRAFT or PENDING_APPROVAL */}
                                                {(run.status === 'DRAFT' || run.status === 'PENDING_APPROVAL') && (
                                                    <Button size="sm" variant="ghost" className="text-green-600" onClick={() => approveMut.mutate(run.id)} title="Approve">
                                                        <CheckCircle size={16} />
                                                    </Button>
                                                )}

                                                {/* Reject Action - DRAFT or PENDING_APPROVAL */}
                                                {(run.status === 'DRAFT' || run.status === 'PENDING_APPROVAL') && (
                                                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => openRejectDialog(run.id)} title="Reject">
                                                        <XCircle size={16} />
                                                    </Button>
                                                )}

                                                {/* Lock Action - APPROVED only */}
                                                {run.status === 'APPROVED' && (
                                                    <Button size="sm" variant="ghost" className="text-purple-600" onClick={() => lockMut.mutate(run.id)} title="Lock & Finalize">
                                                        <Lock size={16} />
                                                    </Button>
                                                )}

                                                {/* Revoke Action - APPROVED only */}
                                                {run.status === 'APPROVED' && (
                                                    <Button size="sm" variant="ghost" className="text-orange-600" onClick={() => revokeMut.mutate(run.id)} title="Revoke Approval">
                                                        <RotateCcw size={16} />
                                                    </Button>
                                                )}

                                                {/* Delete Action - DRAFT only */}
                                                {run.status === 'DRAFT' && (
                                                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => openDeleteDialog(run.id)} title="Delete">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                )}

                                                {/* View Details/Payslips - Always available */}
                                                <Button size="sm" variant="ghost" onClick={() => navigate(`/payroll/payrun/${run.id}`)} title="View Details">
                                                    <FileText size={16} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                        }
                    </TableBody>
                </Table>
            </Card>

            {/* Create Pay Run Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Start New Pay Run</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label>Month</Label>
                            <select className="w-full border rounded p-2" value={month} onChange={e => setMonth(Number(e.target.value))}>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label>Year</Label>
                            <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={createMut.isPending}>
                            {createMut.isPending ? 'Creating...' : 'Create Draft'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Pay Run Dialog */}
            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Reject Pay Run</DialogTitle></DialogHeader>
                    <div className="py-4">
                        <Label>Rejection Reason *</Label>
                        <Input
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Enter reason for rejection (min 5 characters)"
                        />
                        <p className="text-xs text-muted-foreground mt-1">This reason will be recorded in the audit log.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleReject} disabled={rejectMut.isPending || rejectReason.length < 5}>
                            {rejectMut.isPending ? 'Rejecting...' : 'Reject Pay Run'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Pay Run Dialog */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Delete Pay Run</DialogTitle></DialogHeader>
                    <div className="py-4">
                        <p>Are you sure you want to delete this pay run? This action cannot be undone.</p>
                        <p className="text-sm text-muted-foreground mt-2">Only draft pay runs can be deleted.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>
                            {deleteMut.isPending ? 'Deleting...' : 'Delete Pay Run'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default PayRunPage;

