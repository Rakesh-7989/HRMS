import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import payrollService from '@/services/payroll.service';
import { PayRun } from '@/types/payroll';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Play, Lock, FileText, CheckCircle, RefreshCw, Trash2, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PayRunPage: React.FC = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: runs = [], isLoading } = useQuery<PayRun[]>({
        queryKey: ['payroll', 'runs'],
        queryFn: () => payrollService.getPayRuns(),
    });

    const [createOpen, setCreateOpen] = useState(false);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    const createMut = useMutation({
        mutationFn: (payload: { periodMonth: number; periodYear: number }) => payrollService.createPayRun(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
            setCreateOpen(false);
        },
    });

    const calculateMut = useMutation({
        mutationFn: (id: string) => payrollService.calculatePayRun(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] }),
    });

    const approveMut = useMutation({
        mutationFn: (id: string) => payrollService.approvePayRun(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] }),
    });

    const lockMut = useMutation({
        mutationFn: (id: string) => payrollService.lockPayRun(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] }),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => payrollService.deletePayRun(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
            setDeleteConfirmOpen(false);
            setTargetRun(null);
        },
        onError: (err: any) => {
            alert(`Failed to delete payrun: ${err?.response?.data?.message || err?.message}`);
        }
    });

    const voidMut = useMutation({
        mutationFn: (id: string) => payrollService.voidPayRun(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'runs'] });
            setVoidConfirmOpen(false);
            setTargetRun(null);
        },
        onError: (err: any) => {
            alert(`Failed to void payrun: ${err?.response?.data?.message || err?.message}`);
        }
    });

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);
    const [targetRun, setTargetRun] = useState<PayRun | null>(null);

    const checkDelete = (run: PayRun) => {
        setTargetRun(run);
        setDeleteConfirmOpen(true);
    };

    const checkVoid = (run: PayRun) => {
        setTargetRun(run);
        setVoidConfirmOpen(true);
    };

    const handleCreate = () => {
        createMut.mutate({ periodMonth: Number(month), periodYear: Number(year) });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'text-green-600 bg-green-50 border-green-200';
            case 'APPROVED': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'LOCKED': return 'text-purple-600 bg-purple-50 border-purple-200';
            case 'DRAFT': return 'text-gray-600 bg-gray-50 border-gray-200';
            default: return 'text-gray-600';
        }
    };

    return (
        <DashboardLayout title="Pay Runs" breadcrumbs={[{ label: 'Payroll', href: '/payroll' }, { label: 'Pay Runs' }]}>

            <div className="flex justify-end mb-4">
                <Button onClick={() => setCreateOpen(true)}><Play size={16} className="mr-2" /> Run Payroll</Button>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead>Total Net Pay</TableHead>
                            <TableHead>Employees</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={5}>Loading...</TableCell></TableRow> :
                            runs.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center p-4">No pay runs found</TableCell></TableRow> :
                                runs.map(run => (
                                    <TableRow key={run.id}>
                                        <TableCell className="font-medium">{new Date(run.period_year, run.period_month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</TableCell>
                                        <TableCell>{(run.total_net || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                                        <TableCell>{run.total_employees || 0}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(run.status)}`}>{run.status}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {/* Calculate Action */}
                                                {run.status === 'DRAFT' && (
                                                    <Button size="sm" variant="ghost" onClick={() => calculateMut.mutate(run.id)} isLoading={calculateMut.isPending} title="Calculate">
                                                        <RefreshCw size={16} className={calculateMut.isPending ? 'animate-spin' : ''} />
                                                    </Button>
                                                )}

                                                {/* Approve Action */}
                                                {(run.status === 'PENDING_APPROVAL' || run.status === 'DRAFT') && (
                                                    <Button size="sm" variant="ghost" className="text-green-600" onClick={() => approveMut.mutate(run.id)} title="Approve">
                                                        <CheckCircle size={16} />
                                                    </Button>
                                                )}

                                                {/* Lock Action */}
                                                {run.status === 'APPROVED' && (
                                                    <Button size="sm" variant="ghost" className="text-purple-600" onClick={() => lockMut.mutate(run.id)} title="Lock & Finalize">
                                                        <Lock size={16} />
                                                    </Button>
                                                )}

                                                {/* View Details/Payslips */}
                                                <Button size="sm" variant="ghost" onClick={() => navigate(`/payroll/payrun/${run.id}`)} title="View Details">
                                                    <FileText size={16} />
                                                </Button>
                                            </div>
                                            {/* Second Row of Actions (Delete/Void) */}
                                            <div className="flex gap-2 mt-1">
                                                {/* Delete Action (Draft/Calculated/Pending) */}
                                                {(run.status === 'DRAFT' || run.status === 'PENDING_APPROVAL') && (
                                                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => checkDelete(run)} title="Delete Pay Run">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                )}

                                                {/* Void Action (Approved/Paid) */}
                                                {(run.status === 'APPROVED' || run.status === 'PAID') && (
                                                    <Button size="sm" variant="ghost" className="text-orange-500 hover:text-orange-700 hover:bg-orange-50" onClick={() => checkVoid(run)} title="Void Pay Run">
                                                        <Ban size={16} />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                        }
                    </TableBody>
                </Table>
            </Card>

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
                        <Button onClick={handleCreate} isLoading={createMut.isPending}>Create Draft</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={(open) => { setDeleteConfirmOpen(open); if (!open) setTargetRun(null); }}>
                <DialogContent>
                    <DialogHeader><DialogTitle className="text-red-600">Delete Pay Run?</DialogTitle></DialogHeader>
                    <div className="py-4">
                        <p className="text-gray-700">
                            Are you sure you want to <strong>delete</strong> the pay run for
                            <span className="font-bold"> {targetRun ? new Date(targetRun.period_year, targetRun.period_month - 1).toLocaleString('default', { month: 'long', year: 'numeric' }) : ''}</span>?
                        </p>
                        <p className="text-sm text-red-500 mt-2 font-semibold">
                            This will permanently remove all payslip data, calculations, and component records for this month.
                            This action cannot be undone.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => targetRun && deleteMut.mutate(targetRun.id)} isLoading={deleteMut.isPending}>Delete Permanently</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Void Confirmation Dialog */}
            <Dialog open={voidConfirmOpen} onOpenChange={(open) => { setVoidConfirmOpen(open); if (!open) setTargetRun(null); }}>
                <DialogContent>
                    <DialogHeader><DialogTitle className="text-orange-600">Void Pay Run?</DialogTitle></DialogHeader>
                    <div className="py-4">
                        <p className="text-gray-700">
                            Are you sure you want to <strong>void</strong> the pay run for
                            <span className="font-bold"> {targetRun ? new Date(targetRun.period_year, targetRun.period_month - 1).toLocaleString('default', { month: 'long', year: 'numeric' }) : ''}</span>?
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                            This will mark the pay run as <strong>VOIDED</strong>.
                            The data will be preserved for audit purposes, but payslips will be removed from reports and employee portals.
                            You can then create a new pay run for this month.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setVoidConfirmOpen(false)}>Cancel</Button>
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => targetRun && voidMut.mutate(targetRun.id)} isLoading={voidMut.isPending}>Void Pay Run</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout >
    );
};

export default PayRunPage;
