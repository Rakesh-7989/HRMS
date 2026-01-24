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
import { toast } from 'react-hot-toast';
import { Plus, CheckCircle, FileText, Users, DollarSign } from 'lucide-react';
import api from '@/services/api';

interface Consultant {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company_name?: string;
    pan_number?: string;
    gst_number?: string;
    bank_name?: string;
    bank_account_number?: string;
    bank_ifsc?: string;
    hourly_rate?: number;
    monthly_rate?: number;
    contract_start?: string;
    contract_end?: string;
    is_active: boolean;
    created_at: string;
}

interface Invoice {
    id: string;
    consultant_id: string;
    consultant_name?: string;
    invoice_number: string;
    amount: number;
    invoice_date: string;
    due_date?: string;
    status: 'PENDING' | 'APPROVED' | 'PAID';
    payment_reference?: string;
    created_at: string;
}

export const ConsultantsContent: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'HR';

    const [activeView, setActiveView] = useState<'consultants' | 'invoices'>('consultants');
    const [addConsultantOpen, setAddConsultantOpen] = useState(false);
    const [addInvoiceOpen, setAddInvoiceOpen] = useState(false);

    // Consultant form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [monthlyRate, setMonthlyRate] = useState<number | ''>('');

    // Invoice form state
    const [selectedConsultant, setSelectedConsultant] = useState('');
    const [invoiceAmount, setInvoiceAmount] = useState<number | ''>('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));

    // Fetch consultants
    const { data: consultants = [], isLoading: loadingConsultants } = useQuery<Consultant[]>({
        queryKey: ['payroll', 'consultants'],
        queryFn: async () => {
            try {
                const response = await api.get('/payroll/consultants');
                return response.data.data || [];
            } catch { return []; }
        }
    });

    // Fetch invoices
    const { data: invoices = [], isLoading: loadingInvoices } = useQuery<Invoice[]>({
        queryKey: ['payroll', 'consultant-invoices'],
        queryFn: async () => {
            try {
                const response = await api.get('/payroll/consultants/invoices');
                return response.data.data || [];
            } catch { return []; }
        }
    });

    // Create consultant
    const createConsultantMutation = useMutation({
        mutationFn: async (payload: { name: string; email: string; phone?: string; companyName?: string; monthlyRate?: number }) => {
            const response = await api.post('/payroll/consultants', payload);
            return response.data.data;
        },
        onSuccess: () => {
            toast.success('Consultant added');
            queryClient.invalidateQueries({ queryKey: ['payroll', 'consultants'] });
            setAddConsultantOpen(false);
            resetConsultantForm();
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to add consultant');
        }
    });

    // Create invoice
    const createInvoiceMutation = useMutation({
        mutationFn: async (payload: { consultantId: string; amount: number; invoiceDate: string }) => {
            const response = await api.post('/payroll/consultants/invoices', payload);
            return response.data.data;
        },
        onSuccess: () => {
            toast.success('Invoice created');
            queryClient.invalidateQueries({ queryKey: ['payroll', 'consultant-invoices'] });
            setAddInvoiceOpen(false);
            resetInvoiceForm();
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to create invoice');
        }
    });

    // Approve invoice
    const approveInvoiceMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await api.patch(`/payroll/consultants/invoices/${id}/approve`);
            return response.data.data;
        },
        onSuccess: () => {
            toast.success('Invoice approved');
            queryClient.invalidateQueries({ queryKey: ['payroll', 'consultant-invoices'] });
        }
    });

    // Mark invoice paid
    const markPaidMutation = useMutation({
        mutationFn: async ({ id, paymentReference }: { id: string; paymentReference?: string }) => {
            const response = await api.patch(`/payroll/consultants/invoices/${id}/paid`, { paymentReference });
            return response.data.data;
        },
        onSuccess: () => {
            toast.success('Invoice marked as paid');
            queryClient.invalidateQueries({ queryKey: ['payroll', 'consultant-invoices'] });
        }
    });

    const resetConsultantForm = () => {
        setName('');
        setEmail('');
        setPhone('');
        setCompanyName('');
        setMonthlyRate('');
    };

    const resetInvoiceForm = () => {
        setSelectedConsultant('');
        setInvoiceAmount('');
        setInvoiceDate(new Date().toISOString().slice(0, 10));
    };

    const handleCreateConsultant = () => {
        if (!name || !email) {
            toast.error('Name and email are required');
            return;
        }
        createConsultantMutation.mutate({
            name,
            email,
            phone: phone || undefined,
            companyName: companyName || undefined,
            monthlyRate: monthlyRate ? Number(monthlyRate) : undefined
        });
    };

    const handleCreateInvoice = () => {
        if (!selectedConsultant || !invoiceAmount) {
            toast.error('Consultant and amount are required');
            return;
        }
        createInvoiceMutation.mutate({
            consultantId: selectedConsultant,
            amount: Number(invoiceAmount),
            invoiceDate
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <Badge className="bg-blue-100 text-blue-800">Approved</Badge>;
            case 'PAID': return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
            default: return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
        }
    };

    const formatAmount = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Consultant Payroll</h2>
                <div className="flex gap-2">
                    <div className="flex rounded-md border overflow-hidden">
                        <button
                            className={`px-4 py-2 text-sm ${activeView === 'consultants' ? 'bg-primary text-white' : 'bg-white'}`}
                            onClick={() => setActiveView('consultants')}
                        >
                            <Users className="w-4 h-4 inline mr-1" /> Consultants
                        </button>
                        <button
                            className={`px-4 py-2 text-sm ${activeView === 'invoices' ? 'bg-primary text-white' : 'bg-white'}`}
                            onClick={() => setActiveView('invoices')}
                        >
                            <FileText className="w-4 h-4 inline mr-1" /> Invoices
                        </button>
                    </div>
                    {isAdmin && activeView === 'consultants' && (
                        <Button onClick={() => setAddConsultantOpen(true)} className="flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add Consultant
                        </Button>
                    )}
                    {isAdmin && activeView === 'invoices' && (
                        <Button onClick={() => setAddInvoiceOpen(true)} className="flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Create Invoice
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" /> Active Consultants
                    </div>
                    <div className="text-2xl font-bold">{consultants.filter(c => c.is_active).length}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Pending Invoices</div>
                    <div className="text-2xl font-bold text-yellow-600">
                        {invoices.filter(i => i.status === 'PENDING').length}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Pending Amount</div>
                    <div className="text-2xl font-bold text-orange-600">
                        {formatAmount(invoices.filter(i => i.status !== 'PAID').reduce((sum, i) => sum + i.amount, 0))}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Total Paid (This Month)</div>
                    <div className="text-2xl font-bold text-green-600">
                        {formatAmount(invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0))}
                    </div>
                </Card>
            </div>

            {/* Consultants View */}
            {activeView === 'consultants' && (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Monthly Rate</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingConsultants ? (
                                <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
                            ) : consultants.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No consultants found</TableCell></TableRow>
                            ) : (
                                consultants.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">{c.name}</TableCell>
                                        <TableCell>{c.email}</TableCell>
                                        <TableCell>{c.company_name || '-'}</TableCell>
                                        <TableCell>{c.monthly_rate ? formatAmount(c.monthly_rate) : '-'}</TableCell>
                                        <TableCell>
                                            {c.is_active
                                                ? <Badge className="bg-green-100 text-green-800">Active</Badge>
                                                : <Badge variant="secondary">Inactive</Badge>
                                            }
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Invoices View */}
            {activeView === 'invoices' && (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Consultant</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                {isAdmin && <TableHead>Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingInvoices ? (
                                <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
                            ) : invoices.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No invoices found</TableCell></TableRow>
                            ) : (
                                invoices.map((inv) => (
                                    <TableRow key={inv.id}>
                                        <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                                        <TableCell>{inv.consultant_name || 'N/A'}</TableCell>
                                        <TableCell className="font-semibold">{formatAmount(inv.amount)}</TableCell>
                                        <TableCell>{new Date(inv.invoice_date).toLocaleDateString()}</TableCell>
                                        <TableCell>{getStatusBadge(inv.status)}</TableCell>
                                        {isAdmin && (
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    {inv.status === 'PENDING' && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => approveInvoiceMutation.mutate(inv.id)}
                                                        >
                                                            <CheckCircle className="w-4 h-4 text-blue-600" />
                                                        </Button>
                                                    )}
                                                    {inv.status === 'APPROVED' && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => markPaidMutation.mutate({ id: inv.id })}
                                                        >
                                                            <DollarSign className="w-4 h-4 text-green-600" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Add Consultant Dialog */}
            <Dialog open={addConsultantOpen} onOpenChange={setAddConsultantOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Consultant</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label>Name *</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Consultant name" />
                        </div>
                        <div>
                            <Label>Email *</Label>
                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
                        </div>
                        <div>
                            <Label>Phone</Label>
                            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." />
                        </div>
                        <div>
                            <Label>Company Name</Label>
                            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company/Freelance" />
                        </div>
                        <div>
                            <Label>Monthly Rate (₹)</Label>
                            <Input type="number" value={monthlyRate} onChange={(e) => setMonthlyRate(Number(e.target.value))} placeholder="Monthly rate" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setAddConsultantOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateConsultant} disabled={createConsultantMutation.isPending}>
                            {createConsultantMutation.isPending ? 'Adding...' : 'Add Consultant'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Invoice Dialog */}
            <Dialog open={addInvoiceOpen} onOpenChange={setAddInvoiceOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Invoice</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label>Consultant *</Label>
                            <select
                                className="w-full border rounded p-2 mt-1"
                                value={selectedConsultant}
                                onChange={(e) => setSelectedConsultant(e.target.value)}
                            >
                                <option value="">Select Consultant</option>
                                {consultants.filter(c => c.is_active).map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label>Amount (₹) *</Label>
                            <Input type="number" value={invoiceAmount} onChange={(e) => setInvoiceAmount(Number(e.target.value))} placeholder="Invoice amount" />
                        </div>
                        <div>
                            <Label>Invoice Date</Label>
                            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setAddInvoiceOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateInvoice} disabled={createInvoiceMutation.isPending}>
                            {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ConsultantsContent;
