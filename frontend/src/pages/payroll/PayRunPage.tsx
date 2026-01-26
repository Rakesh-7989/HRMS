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
import { Play, Lock, FileText, CheckCircle, RefreshCw } from 'lucide-react';
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
            <Sidebar />

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
                                                {run.status === 'DRAFT' && (
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
        </DashboardLayout>
    );
};

export default PayRunPage;
