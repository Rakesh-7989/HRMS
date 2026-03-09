import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import payrollService, { FnFSettlement } from '@/services/payroll.service';
import { usersService } from '@/services/users.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { Plus, CheckCircle, XCircle, Banknote, FileText, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const FnFSettlementsContent: React.FC = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ employeeId: '', lastWorkingDay: '', resignationDate: '' });

    const { data: settlements = [], isLoading } = useQuery<FnFSettlement[]>({
        queryKey: ['payroll', 'fnf'],
        queryFn: () => payrollService.getFnFSettlements()
    });

    const { data: usersResponse } = useQuery({
        queryKey: ['users-for-fnf'],
        queryFn: () => usersService.getUsers({ is_active: true })
    });
    const employees = usersResponse?.data || [];

    // Filter only those with employee profile
    const availableEmployees = employees.filter(e => e.employee_uuid);

    const createMut = useMutation({
        mutationFn: (payload: any) => payrollService.createFnFSettlement(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'fnf'] });
            setOpen(false); setForm({ employeeId: '', lastWorkingDay: '', resignationDate: '' });
            toast.success('F&F Initiated');
        },
        onError: (err: any) => toast.error('Failed to initiate: ' + (err.response?.data?.message || err.message))
    });

    const approveMut = useMutation({
        mutationFn: ({ id, status }: { id: string, status: 'APPROVED' | 'REJECTED' }) => payrollService.approveFnF(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'fnf'] });
            toast.success('Status updated');
        }
    });

    const payMut = useMutation({
        mutationFn: (id: string) => payrollService.payFnF(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'fnf'] });
            toast.success('Marked as Paid');
        }
    });

    const submitMut = useMutation({
        mutationFn: (id: string) => payrollService.submitFnF(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'fnf'] });
            toast.success('Submitted for Approval');
        },
        onError: (err: any) => toast.error('Failed to submit: ' + (err.response?.data?.message || err.message))
    });

    const handleCreate = () => {
        if (!form.employeeId || !form.lastWorkingDay) {
            toast.error('Employee ID and Last Working Day are required');
            return;
        }
        createMut.mutate({
            employeeId: form.employeeId,
            lastWorkingDay: form.lastWorkingDay,
            resignationDate: form.resignationDate || undefined
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PAID': return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
            case 'APPROVED': return <Badge className="bg-violet-100 text-violet-800">Approved</Badge>;
            case 'REJECTED': return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
            case 'PENDING_APPROVAL': return <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>;
            default: return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Full & Final Settlements</h2>
                <Button size="sm" onClick={() => setOpen(true)}><Plus size={16} className="mr-2" /> Initiate F&F</Button>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Resignation Date</TableHead>
                            <TableHead>Last Working Day</TableHead>
                            <TableHead>Net Payable</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow> :
                            settlements.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center">No settlements found</TableCell></TableRow> :
                                settlements.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="font-medium">{item.first_name} {item.last_name}</div>
                                            <div className="text-xs text-gray-500">{item.emp_code}</div>
                                        </TableCell>
                                        <TableCell>{item.resignation_date ? new Date(item.resignation_date).toLocaleDateString() : '-'}</TableCell>
                                        <TableCell>{new Date(item.last_working_day).toLocaleDateString()}</TableCell>
                                        <TableCell>₹{item.net_payable?.toLocaleString('en-IN')}</TableCell>
                                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {item.status === 'DRAFT' && (
                                                <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => submitMut.mutate(item.id)}>
                                                    <Send size={14} className="mr-1" /> Submit
                                                </Button>
                                            )}
                                            {item.status === 'PENDING_APPROVAL' && (
                                                <>
                                                    <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => approveMut.mutate({ id: item.id, status: 'APPROVED' })}>
                                                        <CheckCircle size={14} className="mr-1" /> Approve
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => approveMut.mutate({ id: item.id, status: 'REJECTED' })}>
                                                        <XCircle size={14} className="mr-1" /> Reject
                                                    </Button>
                                                </>
                                            )}
                                            {item.status === 'APPROVED' && (
                                                <Button size="sm" onClick={() => payMut.mutate(item.id)}>
                                                    <Banknote size={14} className="mr-1" /> Pay
                                                </Button>
                                            )}
                                            <Button size="sm" variant="ghost" onClick={() => navigate(`/payroll/fnf/${item.id}`)}>
                                                <FileText size={14} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                        }
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Initiate Full & Final Settlement</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label>Employee</Label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                value={form.employeeId}
                                onChange={e => setForm({ ...form, employeeId: e.target.value })}
                            >
                                <option value="">Select Employee</option>
                                {availableEmployees.map(emp => (
                                    <option key={emp.id} value={emp.employee_uuid}>
                                        {emp.first_name} {emp.last_name} ({emp.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label>Resignation Date</Label>
                            <Input type="date" value={form.resignationDate} onChange={e => setForm({ ...form, resignationDate: e.target.value })} />
                        </div>
                        <div>
                            <Label>Last Working Day</Label>
                            <Input type="date" value={form.lastWorkingDay} onChange={e => setForm({ ...form, lastWorkingDay: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCreate} isLoading={createMut.isPending}>Initiate</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
