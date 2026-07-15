import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { showToast } from '@/utils/toast';
import { Plus, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
// payrollService is available but we use api directly for flexibility
import api from '@/services/api';

interface SalaryRevision {
    id: string;
    employee_id: string;
    employee_name?: string;
    old_ctc: number;
    new_ctc: number;
    increment_amount: number;
    increment_percentage: number;
    revision_type: 'INCREMENT' | 'CORRECTION' | 'PROMOTION';
    effective_from: string;
    remarks?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    approved_by?: string;
    approved_at?: string;
    created_at: string;
}

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    ctc?: number;
}

export const SalaryRevisionsContent: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'HR';

    const [addOpen, setAddOpen] = useState(false);
    const [employeeId, setEmployeeId] = useState('');
    const [newCtc, setNewCtc] = useState<number | ''>('');
    const [revisionType, setRevisionType] = useState<'INCREMENT' | 'CORRECTION' | 'PROMOTION'>('INCREMENT');
    const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
    const [remarks, setRemarks] = useState('');

    // Fetch revisions
    const { data: revisions = [], isLoading, refetch } = useQuery<SalaryRevision[]>({
        queryKey: ['payroll', 'salary-revisions'],
        queryFn: async () => {
            try {
                const response = await api.get('/payroll/salary/revisions');
                return response.data.data || [];
            } catch { return []; }
        }
    });

    // Fetch employees for dropdown
    const { data: employees = [] } = useQuery<Employee[]>({
        queryKey: ['employees', 'list'],
        queryFn: async () => {
            try {
                const response = await api.get('/users/employees');
                return response.data.data || [];
            } catch { return []; }
        }
    });

    // Create revision
    const createMutation = useMutation({
        mutationFn: async (payload: { employeeId: string; newCtc: number; revisionType: string; effectiveFrom: string; remarks?: string }) => {
            const response = await api.post('/payroll/salary/revisions', payload);
            return response.data.data;
        },
        onSuccess: () => {
            showToast.success(t('payroll.revisionCreated'));
            queryClient.invalidateQueries({ queryKey: ['payroll', 'salary-revisions'] });
            setAddOpen(false);
            resetForm();
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { message?: string } }; message?: string };
            showToast.error(error?.response?.data?.message || 'Failed to create revision');
        }
    });

    // Approve/Reject revision
    const approveMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) => {
            const response = await api.patch(`/payroll/salary/revisions/${id}/approve`, { status });
            return response.data.data;
        },
        onSuccess: () => {
            showToast.success(t('payroll.revisionUpdated'));
            queryClient.invalidateQueries({ queryKey: ['payroll', 'salary-revisions'] });
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { message?: string } }; message?: string };
            showToast.error(error?.response?.data?.message || 'Failed to update');
        }
    });

    const resetForm = () => {
        setEmployeeId('');
        setNewCtc('');
        setRevisionType('INCREMENT');
        setEffectiveFrom(new Date().toISOString().slice(0, 10));
        setRemarks('');
    };

    const handleCreate = () => {
        if (!employeeId || !newCtc) {
            showToast.error(t('common.fillRequiredFields'));
            return;
        }
        createMutation.mutate({
            employeeId,
            newCtc: Number(newCtc),
            revisionType,
            effectiveFrom,
            remarks: remarks || undefined
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <Badge className="flex items-center gap-1 bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" /> Approved</Badge>;
            case 'REJECTED': return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
            default: return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'PROMOTION': return <Badge className="bg-brand-100 text-brand-700">Promotion</Badge>;
            case 'CORRECTION': return <Badge className="bg-blue-100 text-blue-800">Correction</Badge>;
            default: return <Badge className="bg-green-100 text-green-800">Increment</Badge>;
        }
    };

    const formatAmount = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Salary Revisions</h2>
                <div className="flex gap-2">
                    {isAdmin && (
                        <Button onClick={() => setAddOpen(true)} className="flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Create Revision
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="w-4 h-4" /> Total Revisions
                    </div>
                    <div className="text-2xl font-bold">{revisions.length}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Pending Approval</div>
                    <div className="text-2xl font-bold text-yellow-600">
                        {revisions.filter(r => r.status === 'PENDING').length}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Approved (This Year)</div>
                    <div className="text-2xl font-bold text-green-600">
                        {revisions.filter(r => r.status === 'APPROVED').length}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Avg Increment %</div>
                    <div className="text-2xl font-bold text-blue-600">
                        {revisions.length > 0
                            ? (revisions.filter(r => r.status === 'APPROVED').reduce((sum, r) => sum + (r.increment_percentage || 0), 0) / Math.max(revisions.filter(r => r.status === 'APPROVED').length, 1)).toFixed(1) + '%'
                            : 'N/A'}
                    </div>
                </Card>
            </div>

            {/* Revisions Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Old CTC</TableHead>
                            <TableHead>New CTC</TableHead>
                            <TableHead>Increment</TableHead>
                            <TableHead>Effective From</TableHead>
                            <TableHead>Status</TableHead>
                            {isAdmin && <TableHead>Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={8} className="text-center">Loading...</TableCell></TableRow>
                        ) : revisions.length === 0 ? (
                            <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No salary revisions found</TableCell></TableRow>
                        ) : (
                            revisions.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-medium">{r.employee_name || 'N/A'}</TableCell>
                                    <TableCell>{getTypeBadge(r.revision_type)}</TableCell>
                                    <TableCell>{formatAmount(r.old_ctc)}</TableCell>
                                    <TableCell className="font-semibold">{formatAmount(r.new_ctc)}</TableCell>
                                    <TableCell>
                                        <span className="text-green-600">+{formatAmount(r.increment_amount)}</span>
                                        <span className="text-muted-foreground text-sm ml-1">({r.increment_percentage?.toFixed(1)}%)</span>
                                    </TableCell>
                                    <TableCell>{new Date(r.effective_from).toLocaleDateString()}</TableCell>
                                    <TableCell>{getStatusBadge(r.status)}</TableCell>
                                    {isAdmin && (
                                        <TableCell>
                                            {r.status === 'PENDING' && (
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-green-600 hover:text-green-700"
                                                        onClick={() => approveMutation.mutate({ id: r.id, status: 'APPROVED' })}
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-red-600 hover:text-red-700"
                                                        onClick={() => approveMutation.mutate({ id: r.id, status: 'REJECTED' })}
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Add Dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Salary Revision</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label>Employee</Label>
                            <select
                                className="w-full border rounded p-2 mt-1"
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                            >
                                <option value="">Select Employee</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.first_name} {emp.last_name} {emp.ctc ? `(Current: ₹${emp.ctc.toLocaleString()})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label>New CTC (Annual)</Label>
                            <Input
                                type="number"
                                value={newCtc}
                                onChange={(e) => setNewCtc(Number(e.target.value))}
                                placeholder="Enter new annual CTC"
                            />
                        </div>
                        <div>
                            <Label>Revision Type</Label>
                            <select
                                className="w-full border rounded p-2 mt-1"
                                value={revisionType}
                                onChange={(e) => setRevisionType(e.target.value as typeof revisionType)}
                            >
                                <option value="INCREMENT">Increment</option>
                                <option value="PROMOTION">Promotion</option>
                                <option value="CORRECTION">Correction</option>
                            </select>
                        </div>
                        <div>
                            <Label>Effective From</Label>
                            <Input
                                type="date"
                                value={effectiveFrom}
                                onChange={(e) => setEffectiveFrom(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Remarks</Label>
                            <Input
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Optional remarks"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={createMutation.isPending}>
                            {createMutation.isPending ? 'Creating...' : 'Create Revision'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SalaryRevisionsContent;
