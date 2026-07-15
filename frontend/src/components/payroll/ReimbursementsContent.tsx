import React, { useState } from 'react'
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { showToast } from '@/utils/toast';
import { Plus, CheckCircle, XCircle, Clock, Upload } from 'lucide-react';
import payrollService from '@/services/payroll.service';

interface Reimbursement {
    id: string;
    employee_id: string;
    employee_name?: string;
    category: string;
    amount: number;
    claim_date: string;
    description?: string;
    receipt_url?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
    include_in_payroll?: boolean;
    created_at: string;
}

const CATEGORIES = ['MEDICAL', 'TRAVEL', 'PHONE', 'FOOD', 'OTHER'] as const;

export const ReimbursementsContent: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'HR';

    const [addOpen, setAddOpen] = useState(false);
    const [category, setCategory] = useState<typeof CATEGORIES[number]>('TRAVEL');
    const [amount, setAmount] = useState<number | ''>('');
    const [claimDate, setClaimDate] = useState(new Date().toISOString().slice(0, 10));
    const [description, setDescription] = useState('');
    const [receiptUrl, setReceiptUrl] = useState('');

    // Fetch reimbursements - my claims for employees, all for HR/Admin
    const { data: reimbursements = [], isLoading, refetch } = useQuery<Reimbursement[]>({
        queryKey: ['payroll', 'reimbursements', isAdmin ? 'all' : 'my'],
        queryFn: async () => {
            const result = await payrollService.listReimbursements(isAdmin ? undefined : { status: 'PENDING' });
            return result as Reimbursement[];
        },
        retry: 1
    });

    // Create reimbursement
    const createMutation = useMutation({
        mutationFn: (payload: { category: string; amount: number; claimDate: string; description?: string; receiptUrl?: string }) =>
            payrollService.createReimbursement(payload),
        onSuccess: () => {
            showToast.success(t('payroll.reimbursementSubmitted'));
            queryClient.invalidateQueries({ queryKey: ['payroll', 'reimbursements'] });
            setAddOpen(false);
            resetForm();
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { message?: string } }; message?: string };
            showToast.error(error?.response?.data?.message || 'Failed to submit claim');
        }
    });

    // Approve/Reject reimbursement (HR/Admin only)
    const approveMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
            payrollService.approveReimbursement(id, { status }),
        onSuccess: () => {
            showToast.success(t('payroll.reimbursementUpdated'));
            queryClient.invalidateQueries({ queryKey: ['payroll', 'reimbursements'] });
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { message?: string } }; message?: string };
            showToast.error(error?.response?.data?.message || 'Failed to update');
        }
    });

    const resetForm = () => {
        setCategory('TRAVEL');
        setAmount('');
        setClaimDate(new Date().toISOString().slice(0, 10));
        setDescription('');
        setReceiptUrl('');
    };

    const handleCreate = () => {
        if (!amount || Number(amount) <= 0) {
            showToast.error(t('payroll.enterValidAmount'));
            return;
        }
        createMutation.mutate({
            category,
            amount: Number(amount),
            claimDate,
            description: description || undefined,
            receiptUrl: receiptUrl || undefined
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <Badge className="flex items-center gap-1 bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" /> Approved</Badge>;
            case 'REJECTED': return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
            case 'PAID': return <Badge variant="outline" className="flex items-center gap-1 bg-green-100">💸 Paid</Badge>;
            default: return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
        }
    };

    const formatAmount = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Reimbursements</h2>
                <div className="flex gap-2">
                    <Button onClick={() => setAddOpen(true)} className="flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Submit Claim
                    </Button>
                    <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Total Claims</div>
                    <div className="text-2xl font-bold">{reimbursements.length}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Pending</div>
                    <div className="text-2xl font-bold text-yellow-600">
                        {reimbursements.filter(r => r.status === 'PENDING').length}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Approved</div>
                    <div className="text-2xl font-bold text-green-600">
                        {formatAmount(reimbursements.filter(r => r.status === 'APPROVED' || r.status === 'PAID').reduce((sum, r) => sum + r.amount, 0))}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Pending Amount</div>
                    <div className="text-2xl font-bold text-orange-600">
                        {formatAmount(reimbursements.filter(r => r.status === 'PENDING').reduce((sum, r) => sum + r.amount, 0))}
                    </div>
                </Card>
            </div>

            {/* Claims Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {isAdmin && <TableHead>Employee</TableHead>}
                            <TableHead>Category</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Claim Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Include in Payroll</TableHead>
                            {isAdmin && <TableHead>Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={8} className="text-center">Loading...</TableCell></TableRow>
                        ) : reimbursements.length === 0 ? (
                            <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No reimbursement claims found</TableCell></TableRow>
                        ) : (
                            reimbursements.map((r) => (
                                <TableRow key={r.id}>
                                    {isAdmin && <TableCell className="font-medium">{r.employee_name || 'N/A'}</TableCell>}
                                    <TableCell>
                                        <Badge variant="outline">{r.category}</Badge>
                                    </TableCell>
                                    <TableCell className="font-semibold">{formatAmount(r.amount)}</TableCell>
                                    <TableCell>{new Date(r.claim_date).toLocaleDateString()}</TableCell>
                                    <TableCell className="max-w-[200px] truncate">{r.description || '-'}</TableCell>
                                    <TableCell>{getStatusBadge(r.status)}</TableCell>
                                    <TableCell>{r.include_in_payroll ? '✅ Yes' : '❌ No'}</TableCell>
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
                        <DialogTitle>Submit Reimbursement Claim</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label>Category</Label>
                            <select
                                className="w-full border rounded p-2 mt-1"
                                value={category}
                                onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])}
                            >
                                {CATEGORIES.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label>Amount (₹)</Label>
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                placeholder="Enter amount"
                            />
                        </div>
                        <div>
                            <Label>Claim Date</Label>
                            <Input
                                type="date"
                                value={claimDate}
                                onChange={(e) => setClaimDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of expense"
                            />
                        </div>
                        <div>
                            <Label>Receipt URL (optional)</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={receiptUrl}
                                    onChange={(e) => setReceiptUrl(e.target.value)}
                                    placeholder="https://..."
                                />
                                <Button variant="outline" size="sm" disabled>
                                    <Upload className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={createMutation.isPending}>
                            {createMutation.isPending ? 'Submitting...' : 'Submit Claim'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ReimbursementsContent;
