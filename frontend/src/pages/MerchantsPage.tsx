import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Sidebar } from '@/components/layout/Sidebar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import payrollService from '@/services/payroll.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

const MerchantsPage: React.FC = () => {
  const qc = useQueryClient();
  const { data: merchants = [], isLoading } = useQuery<any[]>({ queryKey: ['payroll', 'merchants'], queryFn: () => payrollService.listMerchants() });
  const { data: vendorPayments = [] } = useQuery<any[]>({ queryKey: ['payroll', 'vendor-payments'], queryFn: () => payrollService.listVendorPayments() });
  const { data: thirdPartyPayouts = [] } = useQuery<any[]>({ queryKey: ['payroll', 'third-party-payouts'], queryFn: () => payrollService.listThirdPartyPayouts() });
  // Try merchant transactions under merchants router first; payrollService.listMerchantTransactions handles fallback
  const { data: merchantTransactions = [] } = useQuery<any[]>({ queryKey: ['payroll', 'merchant-transactions'], queryFn: () => payrollService.listMerchantTransactions() });

  const { user } = useAuth();
  const role = user?.role || '';

  // Mutations
  const createVendorMut = useMutation({
    mutationFn: (payload: any) => payrollService.createVendorPayout(payload),
    onMutate: async (payload: any) => {
      await qc.cancelQueries({ queryKey: ['payroll', 'vendor-payments'] });
      const previous = qc.getQueryData<any[]>(['payroll', 'vendor-payments']);
      const tempId = `tmp-vendor-${Date.now()}`;
      const tempItem = { id: tempId, vendorName: payload.vendorName, amount: payload.amount, paymentDate: payload.paymentDate, notes: payload.notes, paid: false };
      qc.setQueryData(['payroll', 'vendor-payments'], (old: any[] | undefined) => { return [...(old || []), tempItem]; });
      return { previous, tempId };
    },
    onError: (_err, _variables, context: any) => {
      if (context?.previous) qc.setQueryData(['payroll', 'vendor-payments'], context.previous);
    },
    onSuccess: (data: any, _variables, context: any) => {
      qc.setQueryData(['payroll', 'vendor-payments'], (old: any[] | undefined) => {
        if (!old) return [data];
        return old.map((it: any) => (it.id === context?.tempId ? data : it));
      });
      qc.invalidateQueries({ queryKey: ['payroll', 'vendor-payments'] });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['payroll', 'vendor-payments'] }),
  });
  const createThirdMut = useMutation({
    mutationFn: (payload: any) => payrollService.createThirdPartyPayout(payload),
    onMutate: async (payload: any) => {
      await qc.cancelQueries({ queryKey: ['payroll', 'third-party-payouts'] });
      const previous = qc.getQueryData<any[]>(['payroll', 'third-party-payouts']);
      const tempId = `tmp-third-${Date.now()}`;
      const tempItem = { id: tempId, providerName: payload.providerName, amount: payload.amount, payoutDate: payload.payoutDate, notes: payload.notes, paid: false };
      qc.setQueryData(['payroll', 'third-party-payouts'], (old: any[] | undefined) => { return [...(old || []), tempItem]; });
      return { previous, tempId };
    },
    onError: (_err, _variables, context: any) => {
      if (context?.previous) qc.setQueryData(['payroll', 'third-party-payouts'], context.previous);
    },
    onSuccess: (data: any, _variables, context: any) => {
      qc.setQueryData(['payroll', 'third-party-payouts'], (old: any[] | undefined) => {
        if (!old) return [data];
        return old.map((it: any) => (it.id === context?.tempId ? data : it));
      });
      qc.invalidateQueries({ queryKey: ['payroll', 'third-party-payouts'] });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['payroll', 'third-party-payouts'] }),
  });
  const markVendorPaidMut = useMutation({ mutationFn: (paymentId: string) => payrollService.markVendorPaymentPaid(paymentId), onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'vendor-payments'] }) });
  const markThirdPaidMut = useMutation({ mutationFn: (payoutId: string) => payrollService.markThirdPartyPayoutPaid(payoutId), onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll', 'third-party-payouts'] }) });

  // local paid flags fallback if backend doesn't support marking paid
  const [localVendorPaid, setLocalVendorPaid] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('vendorPaymentsPaid') || '[]'); } catch { return []; } });
  const [localThirdPaid, setLocalThirdPaid] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('thirdPartyPayoutsPaid') || '[]'); } catch { return []; } });

  // local hidden flags (soft-delete) and UI toggle
  const [localVendorHidden, setLocalVendorHidden] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('vendorPaymentsHidden') || '[]'); } catch { return []; } });
  const [localThirdHidden, setLocalThirdHidden] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('thirdPartyPayoutsHidden') || '[]'); } catch { return []; } });
  const [showHidden, setShowHidden] = useState(false);


  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorAmount, setVendorAmount] = useState<number | ''>('');
  const [vendorDate, setVendorDate] = useState('');
  const [vendorNotes, setVendorNotes] = useState('');

  const [thirdOpen, setThirdOpen] = useState(false);
  const [thirdName, setThirdName] = useState('');
  const [thirdAmount, setThirdAmount] = useState<number | ''>('');
  const [thirdDate, setThirdDate] = useState('');
  const [thirdNotes, setThirdNotes] = useState('');

  const handleVendorCreate = () => {
    if (!vendorName || !vendorAmount) return;
    createVendorMut.mutate({ vendorName: vendorName, amount: Number(vendorAmount), paymentDate: vendorDate || new Date().toISOString().slice(0, 10), notes: vendorNotes }, { onSuccess: () => { setVendorOpen(false); setVendorName(''); setVendorAmount(''); setVendorDate(''); setVendorNotes(''); try { alert('Vendor payout created'); } catch (e) { /* ignore */ } } });
  };

  const handleThirdCreate = () => {
    if (!thirdName || !thirdAmount) return;
    createThirdMut.mutate({ providerName: thirdName, amount: Number(thirdAmount), payoutDate: thirdDate || new Date().toISOString().slice(0, 10), notes: thirdNotes }, { onSuccess: () => { setThirdOpen(false); setThirdName(''); setThirdAmount(''); setThirdDate(''); setThirdNotes(''); try { alert('Third-party payout created'); } catch (e) { /* ignore */ } } });
  };

  const toggleVendorPaid = async (id: string, serverPaid?: boolean) => {
    const isPaidLocally = localVendorPaid.includes(id);
    const currentlyPaid = serverPaid || isPaidLocally;
    if (currentlyPaid) {
      // unmark locally
      const next = localVendorPaid.filter((x) => x !== id);
      setLocalVendorPaid(next); try { localStorage.setItem('vendorPaymentsPaid', JSON.stringify(next)); } catch (e) { /* ignore */ }
      return;
    }
    // attempt server call; fallback to local
    try {
      await markVendorPaidMut.mutateAsync(id);
    } catch (err) {
      const next = Array.from(new Set([...localVendorPaid, id]));
      setLocalVendorPaid(next); try { localStorage.setItem('vendorPaymentsPaid', JSON.stringify(next)); } catch (e) { /* ignore */ }
    }
  };

  const toggleThirdPaid = async (id: string, serverPaid?: boolean) => {
    const isPaidLocally = localThirdPaid.includes(id);
    const currentlyPaid = serverPaid || isPaidLocally;
    if (currentlyPaid) {
      const next = localThirdPaid.filter((x) => x !== id);
      setLocalThirdPaid(next); try { localStorage.setItem('thirdPartyPayoutsPaid', JSON.stringify(next)); } catch (e) { /* ignore */ }
      return;
    }
    try {
      await markThirdPaidMut.mutateAsync(id);
    } catch (err) {
      const next = Array.from(new Set([...localThirdPaid, id]));
      setLocalThirdPaid(next); try { localStorage.setItem('thirdPartyPayoutsPaid', JSON.stringify(next)); } catch (e) { /* ignore */ }
    }
  };

  const toggleVendorHidden = (id: string) => {
    if (localVendorHidden.includes(id)) {
      const next = localVendorHidden.filter((x) => x !== id);
      setLocalVendorHidden(next); try { localStorage.setItem('vendorPaymentsHidden', JSON.stringify(next)); } catch (e) { /* ignore */ }
    } else {
      const next = Array.from(new Set([...localVendorHidden, id]));
      setLocalVendorHidden(next); try { localStorage.setItem('vendorPaymentsHidden', JSON.stringify(next)); } catch (e) { /* ignore */ }
    }
  };

  const toggleThirdHidden = (id: string) => {
    if (localThirdHidden.includes(id)) {
      const next = localThirdHidden.filter((x) => x !== id);
      setLocalThirdHidden(next); try { localStorage.setItem('thirdPartyPayoutsHidden', JSON.stringify(next)); } catch (e) { /* ignore */ }
    } else {
      const next = Array.from(new Set([...localThirdHidden, id]));
      setLocalThirdHidden(next); try { localStorage.setItem('thirdPartyPayoutsHidden', JSON.stringify(next)); } catch (e) { /* ignore */ }
    }
  };

  const displayedVendorPayments = (vendorPayments || []).filter((v: any) => showHidden || !localVendorHidden.includes(v.id));
  const displayedThirdPartyPayouts = (thirdPartyPayouts || []).filter((t: any) => showHidden || !localThirdHidden.includes(t.id));

  return (
    <DashboardLayout title="Merchants & Vendors">
      <Sidebar />

      <div className="flex items-center justify-between mb-4">
        <div className="space-x-2">
          <Button onClick={() => setVendorOpen(true)}>Vendor Payout</Button>
          <Button onClick={() => setThirdOpen(true)}>3rd-party Payout</Button>
          <Button variant="outline" onClick={() => { qc.invalidateQueries({ queryKey: ['payroll', 'merchants'] }); qc.invalidateQueries({ queryKey: ['payroll', 'vendor-payments'] }); qc.invalidateQueries({ queryKey: ['payroll', 'third-party-payouts'] }); qc.invalidateQueries({ queryKey: ['payroll', 'merchant-transactions'] }); }}>Refresh</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowHidden(s => !s)}>{showHidden ? 'Hide Deleted' : 'Show Deleted'}</Button>
        </div>
      </div>

      <Card className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Merchants</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Info</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell>Loading...</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            ) : merchants.length === 0 ? (
              <TableRow>
                <TableCell>No merchants found</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            ) : (
              merchants.map((m: any) => (
                <TableRow key={m.id}><TableCell>{m.name}</TableCell><TableCell>{m.info || '—'}</TableCell></TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Vendor Payments</h3>
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
            {displayedVendorPayments.length === 0 ? (
              <TableRow>
                <TableCell>No vendor payments</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            ) : (
              displayedVendorPayments.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell>{v.vendorName || v.vendor_name || v.vendor || '—'}</TableCell>
                  <TableCell>{v.amount}</TableCell>
                  <TableCell>{v.paymentDate || v.payout_date || v.date || '—'}</TableCell>
                  <TableCell>{(v.paid || localVendorPaid.includes(v.id)) ? 'Paid' : 'Pending'}{localVendorHidden.includes(v.id) && !showHidden ? ' (Deleted)' : ''}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {(['ADMIN', 'HR'].includes(role)) && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => toggleVendorPaid(v.id, v.paid)} isLoading={markVendorPaidMut.isPending}>{(v.paid || localVendorPaid.includes(v.id)) ? 'Mark Unpaid' : 'Mark Paid'}</Button>
                          {!localVendorHidden.includes(v.id) ? (
                            <Button size="sm" variant="destructive" onClick={() => { if (!confirm('Delete this vendor payment?')) return; toggleVendorHidden(v.id); }}>Delete</Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => toggleVendorHidden(v.id)}>Restore</Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="mb-4">
        <h3 className="text-lg font-semibold mb-2">3rd-Party Payouts</h3>
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
            {displayedThirdPartyPayouts.length === 0 ? (
              <TableRow>
                <TableCell>No third-party payouts</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            ) : (
              displayedThirdPartyPayouts.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>{t.providerName || t.provider_name || t.provider || '—'}</TableCell>
                  <TableCell>{t.amount}</TableCell>
                  <TableCell>{t.payoutDate || t.paymentDate || t.date || '—'}</TableCell>
                  <TableCell>{(t.paid || localThirdPaid.includes(t.id)) ? 'Paid' : 'Pending'}{localThirdHidden.includes(t.id) && !showHidden ? ' (Deleted)' : ''}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {(['ADMIN', 'HR'].includes(role)) && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => toggleThirdPaid(t.id, t.paid)} isLoading={markThirdPaidMut.isPending}>{(t.paid || localThirdPaid.includes(t.id)) ? 'Mark Unpaid' : 'Mark Paid'}</Button>
                          {!localThirdHidden.includes(t.id) ? (
                            <Button size="sm" variant="destructive" onClick={() => { if (!confirm('Delete this third-party payout?')) return; toggleThirdHidden(t.id); }}>Delete</Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => toggleThirdHidden(t.id)}>Restore</Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Merchant Transactions</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              const combined = [
                ...(merchantTransactions || []).map((r: any) => ({ ...r, __source: 'merchant' })),
                ...(vendorPayments || []).map((r: any) => ({ ...r, __source: 'vendor' })),
                ...(thirdPartyPayouts || []).map((r: any) => ({ ...r, __source: 'third_party' })),
              ];
              if (!combined.length) { alert('No transactions to export'); return; }
              const headers = Array.from(new Set(combined.flatMap((r: any) => Object.keys(r))));
              const csv = [headers.join(','), ...combined.map((r: any) => headers.map(h => `"${r[h] ?? ''}"`).join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'merchant-transactions.csv'; a.click(); window.URL.revokeObjectURL(url);
            }}>Export Transactions</Button>
            <Button size="sm" variant="ghost" onClick={() => qc.invalidateQueries({ queryKey: ['payroll', 'merchant-transactions'] })}>Refresh</Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchantTransactions.length === 0 ? (
              <TableRow>
                <TableCell>No transactions</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            ) : (
              merchantTransactions.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>{m.id}</TableCell>
                  <TableCell>{m.employee_name || m.employee_id || '—'}</TableCell>
                  <TableCell>{m.type}</TableCell>
                  <TableCell>{m.amount}</TableCell>
                  <TableCell>{m.tx_date || m.date || '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={vendorOpen} onOpenChange={setVendorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vendor Payout</DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleVendorCreate(); }}>
            <div className="grid gap-2">
              <Label>Vendor name</Label>
              <Input autoFocus value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
              <Label>Amount</Label>
              <Input value={vendorAmount as any} onChange={(e) => setVendorAmount(Number(e.target.value) || '')} type="number" />
              <Label>Payment date</Label>
              <Input type="date" value={vendorDate} onChange={(e) => setVendorDate(e.target.value)} />
              <Label>Notes (optional)</Label>
              <Input value={vendorNotes} onChange={(e) => setVendorNotes(e.target.value)} />
            </div>

            <DialogFooter>
              <Button type="submit" isLoading={createVendorMut.isPending} disabled={!vendorName || !vendorAmount}>Submit</Button>
              <Button variant="ghost" onClick={() => setVendorOpen(false)}>Cancel</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={thirdOpen} onOpenChange={setThirdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>3rd Party Payout</DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleThirdCreate(); }}>
            <div className="grid gap-2">
              <Label>Provider name</Label>
              <Input autoFocus value={thirdName} onChange={(e) => setThirdName(e.target.value)} />
              <Label>Amount</Label>
              <Input value={thirdAmount as any} onChange={(e) => setThirdAmount(Number(e.target.value) || '')} type="number" />
              <Label>Payout date</Label>
              <Input type="date" value={thirdDate} onChange={(e) => setThirdDate(e.target.value)} />
              <Label>Notes (optional)</Label>
              <Input value={thirdNotes} onChange={(e) => setThirdNotes(e.target.value)} />
            </div>

            <DialogFooter>
              <Button type="submit" isLoading={createThirdMut.isPending} disabled={!thirdName || !thirdAmount}>Submit</Button>
              <Button variant="ghost" onClick={() => setThirdOpen(false)}>Cancel</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
};

export default MerchantsPage;