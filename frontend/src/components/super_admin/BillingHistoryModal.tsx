import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Dialog, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { superAdminService } from '@/services/superAdmin.service';

interface BillingHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
    tenantName: string;
}

export const BillingHistoryModal: React.FC<BillingHistoryModalProps> = ({
    isOpen,
    onClose,
    tenantId,
    tenantName
}) => {
    const { data: billingHistory = [], isLoading } = useQuery({
        queryKey: ['super-admin', 'billing-history', tenantId],
        queryFn: () => superAdminService.getTenantBillingHistory(tenantId),
        enabled: isOpen && !!tenantId,
    });

    const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

    return (
        <Dialog
            open={isOpen}
            onOpenChange={onClose}
            title={`Billing History - ${tenantName}`}
            description="View all subscription invoices and payment transactions for this organization."
        >
            <div className="py-4">
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                    </div>
                ) : billingHistory.length === 0 ? (
                    <div className="text-center py-10 text-muted italic">
                        No billing history found for this tenant.
                    </div>
                ) : (
                    <div className="overflow-hidden border border-gray-100 dark:border-gray-800 rounded-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="p-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Date</th>
                                        <th className="p-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Amount</th>
                                        <th className="p-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Status</th>
                                        <th className="p-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Method</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                    {billingHistory.map((invoice: any) => (
                                        <tr key={invoice.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                                            <td className="p-3 whitespace-nowrap">
                                                {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                                            </td>
                                            <td className="p-3 font-bold whitespace-nowrap">
                                                ₹{parseFloat(invoice.amount).toLocaleString()}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1.5">
                                                    {invoice.status === 'PAID' ? <CheckCircle2 size={12} className="text-green-500" /> :
                                                        invoice.status === 'FAILED' ? <AlertCircle size={12} className="text-red-500" /> :
                                                            <Clock size={12} className="text-coral-500" />}
                                                    <span className={cn(
                                                        "text-[9px] font-black uppercase tracking-tighter",
                                                        invoice.status === 'PAID' ? "text-green-500" :
                                                            invoice.status === 'FAILED' ? "text-red-500" :
                                                                "text-coral-500"
                                                    )}>
                                                        {invoice.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-xs text-muted whitespace-nowrap">
                                                {invoice.payment_method || 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <DialogFooter>
                <Button variant="ghost" onClick={onClose}>
                    Close
                </Button>
            </DialogFooter>
        </Dialog>
    );
};
