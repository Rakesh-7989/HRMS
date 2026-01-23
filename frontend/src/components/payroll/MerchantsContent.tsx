import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollService } from '@/services/payroll.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FileText } from 'lucide-react';

const formatINR = (amount: number | null | undefined) =>
    amount == null ? '—' : amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

export const MerchantsContent: React.FC = () => {
    const queryClient = useQueryClient();

    const { data: merchantsList = [], isLoading: merchantsLoading } = useQuery<any[]>({
        queryKey: ['payroll', 'merchants'],
        queryFn: () => payrollService.listMerchants(),
    });

    const { data: merchantTransactions = [], isLoading: merchantTxLoading } = useQuery<any[]>({
        queryKey: ['payroll', 'merchant-transactions'],
        queryFn: () => payrollService.listMerchantTransactions(),
    });

    const { data: vendorPayments = [], isLoading: vendorPaymentsLoading } = useQuery<any[]>({
        queryKey: ['payroll', 'vendor-payments'],
        queryFn: () => payrollService.listVendorPayments(),
    });

    const { data: thirdPartyPayouts = [], isLoading: thirdPartyLoading } = useQuery<any[]>({
        queryKey: ['payroll', 'third-party-payouts'],
        queryFn: () => payrollService.listThirdPartyPayouts(),
    });

    const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
    const [vendorName, setVendorName] = useState('');
    const [vendorAmount, setVendorAmount] = useState<number | ''>('');
    const [vendorDate, setVendorDate] = useState('');
    const [vendorNotes, setVendorNotes] = useState('');

    const [thirdPartyDialogOpen, setThirdPartyDialogOpen] = useState(false);
    const [thirdPartyName, setThirdPartyName] = useState('');
    const [thirdPartyAmount, setThirdPartyAmount] = useState<number | ''>('');
    const [thirdPartyDate, setThirdPartyDate] = useState('');
    const [thirdPartyNotes, setThirdPartyNotes] = useState('');

    const createVendorPayoutMut = useMutation({
        mutationFn: (payload: any) => payrollService.createVendorPayout(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'vendor-payments'] });
            queryClient.invalidateQueries({ queryKey: ['payroll', 'merchants'] });
            setVendorDialogOpen(false);
            setVendorName(''); setVendorAmount(''); setVendorDate(''); setVendorNotes('');
        },
    });

    const createThirdPartyPayoutMut = useMutation({
        mutationFn: (payload: any) => payrollService.createThirdPartyPayout(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'third-party-payouts'] });
            queryClient.invalidateQueries({ queryKey: ['payroll', 'merchants'] });
            setThirdPartyDialogOpen(false);
            setThirdPartyName(''); setThirdPartyAmount(''); setThirdPartyDate(''); setThirdPartyNotes('');
        },
    });

    const markPaymentPaidMut = useMutation({
        mutationFn: ({ paymentId, type }: { paymentId: string; type: 'vendor' | 'third_party' }) => {
            return type === 'vendor' ? payrollService.markVendorPaymentPaid(paymentId) : payrollService.markThirdPartyPayoutPaid(paymentId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', 'vendor-payments'] });
            queryClient.invalidateQueries({ queryKey: ['payroll', 'third-party-payouts'] });
            queryClient.invalidateQueries({ queryKey: ['payroll', 'merchant-transactions'] });
        },
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Merchants & Vendor Payments <span className="text-sm text-muted-foreground ml-2">({merchantsLoading ? 'Loading...' : merchantsList.length})</span></h3>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setVendorDialogOpen(true)}>New Vendor/Consultant Payment</Button>
                    <Button size="sm" variant="outline" onClick={() => setThirdPartyDialogOpen(true)}>Initiate 3rd-Party Payroll Payout</Button>
                    <Button size="sm" variant="outline" onClick={() => {
                        const data = merchantTransactions && merchantTransactions.length ? merchantTransactions : [];
                        if (!data.length) return;
                        const headers = Object.keys(data[0]);
                        const csv = [headers.join(','), ...data.map((r: any) => headers.map(h => `"${r[h] ?? ''}"`).join(','))].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'merchant-transactions.csv'; a.click(); window.URL.revokeObjectURL(url);
                    }}><FileText className="mr-2" size={14} />Export Transactions</Button>
                </div>
            </div>

            <Card>
                <h4 className="text-md font-semibold mb-3">Vendor / Consultant Payments</h4>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {vendorPaymentsLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-center p-4">Loading...</TableCell></TableRow>
                        ) : (vendorPayments.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center p-4">No vendor payments</TableCell></TableRow>
                        ) : (
                            vendorPayments.map((p: any) => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.vendor_name || p.vendor || '—'}</TableCell>
                                    <TableCell>{formatINR(p.amount)}</TableCell>
                                    <TableCell>{p.payout_date || p.date}</TableCell>
                                    <TableCell>{p.status || (p.paid ? 'Paid' : 'Pending')}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" onClick={() => markPaymentPaidMut.mutate({ paymentId: p.id, type: 'vendor' })}>Mark Paid</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ))}
                    </TableBody>
                </Table>
            </Card>

            <Card>
                <h4 className="text-md font-semibold mb-3">3rd-Party Payroll Payouts</h4>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Provider</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {thirdPartyLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-center p-4">Loading...</TableCell></TableRow>
                        ) : (thirdPartyPayouts.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center p-4">No third party payouts</TableCell></TableRow>
                        ) : (
                            thirdPartyPayouts.map((t: any) => (
                                <TableRow key={t.id}>
                                    <TableCell>{t.provider_name || t.provider || '—'}</TableCell>
                                    <TableCell>{formatINR(t.amount)}</TableCell>
                                    <TableCell>{t.payout_date || t.date}</TableCell>
                                    <TableCell>{t.status || (t.paid ? 'Paid' : 'Pending')}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" onClick={() => markPaymentPaidMut.mutate({ paymentId: t.id, type: 'third_party' })}>Mark Paid</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ))}
                    </TableBody>
                </Table>
            </Card>

            <Card>
                <h4 className="text-md font-semibold mb-3">Merchant Transactions</h4>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Merchant</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {merchantTxLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-center p-4">Loading...</TableCell></TableRow>
                        ) : (merchantTransactions.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center p-4">No merchant transactions</TableCell></TableRow>
                        ) : (
                            merchantTransactions.map((m: any) => (
                                <TableRow key={m.id}>
                                    <TableCell>{m.merchant_name || m.merchant || '—'}</TableCell>
                                    <TableCell>{m.type}</TableCell>
                                    <TableCell>{formatINR(m.amount)}</TableCell>
                                    <TableCell>{m.tx_date || m.date}</TableCell>
                                    <TableCell>{m.status || '—'}</TableCell>
                                </TableRow>
                            ))
                        ))}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
                <DialogContent>
                    <form onSubmit={(e) => { e.preventDefault(); createVendorPayoutMut.mutate({ vendorName: vendorName, amount: Number(vendorAmount), paymentDate: vendorDate || new Date().toISOString().slice(0, 10), notes: vendorNotes }); }}>
                        <div className="grid gap-4">
                            <DialogHeader><DialogTitle>New Vendor / Consultant Payment</DialogTitle></DialogHeader>
                            <div>
                                <Label>Vendor / Consultant</Label>
                                <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Vendor name" />
                            </div>
                            <div>
                                <Label>Amount</Label>
                                <Input type="number" value={vendorAmount as any} onChange={(e) => setVendorAmount(Number(e.target.value) || '')} placeholder="Amount" />
                            </div>
                            <div>
                                <Label>Date</Label>
                                <Input type="date" value={vendorDate} onChange={(e) => setVendorDate(e.target.value)} />
                            </div>
                            <div>
                                <Label>Notes</Label>
                                <Input value={vendorNotes} onChange={(e) => setVendorNotes(e.target.value)} placeholder="Notes (optional)" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setVendorDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={createVendorPayoutMut.isPending}>Submit</Button>
                            </div>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={thirdPartyDialogOpen} onOpenChange={setThirdPartyDialogOpen}>
                <DialogContent>
                    <form onSubmit={(e) => { e.preventDefault(); createThirdPartyPayoutMut.mutate({ providerName: thirdPartyName, amount: Number(thirdPartyAmount), payoutDate: thirdPartyDate || new Date().toISOString().slice(0, 10), notes: thirdPartyNotes }); }}>
                        <div className="grid gap-4">
                            <DialogHeader><DialogTitle>Initiate 3rd-Party Payroll Payout</DialogTitle></DialogHeader>
                            <div>
                                <Label>Provider</Label>
                                <Input value={thirdPartyName} onChange={(e) => setThirdPartyName(e.target.value)} placeholder="Provider name" />
                            </div>
                            <div>
                                <Label>Amount</Label>
                                <Input type="number" value={thirdPartyAmount as any} onChange={(e) => setThirdPartyAmount(Number(e.target.value) || '')} placeholder="Amount" />
                            </div>
                            <div>
                                <Label>Date</Label>
                                <Input type="date" value={thirdPartyDate} onChange={(e) => setThirdPartyDate(e.target.value)} />
                            </div>
                            <div>
                                <Label>Notes</Label>
                                <Input value={thirdPartyNotes} onChange={(e) => setThirdPartyNotes(e.target.value)} placeholder="Notes (optional)" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setThirdPartyDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={createThirdPartyPayoutMut.isPending}>Submit</Button>
                            </div>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
