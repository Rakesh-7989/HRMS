import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Dialog, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { superAdminService } from '@/services/superAdmin.service';
import { DataTable } from '@/components/ui/DataTable';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
    const { data: billingHistory = [], isLoading } = useQuery({
        queryKey: ['super-admin', 'billing-history', tenantId],
        queryFn: () => superAdminService.getTenantBillingHistory(tenantId),
        enabled: isOpen && !!tenantId,
    });

    const cn = (...classes: (string | boolean | null | undefined)[]) => classes.filter(Boolean).join(' ');

    return (
        <Dialog
            open={isOpen}
            onOpenChange={onClose}
            title={`${t('billing.history')} - ${tenantName}`}
            description={t('billing.description')}
        >
            <div className="py-4">
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                    </div>
                ) : billingHistory.length === 0 ? (
                    <div className="text-center py-10 text-muted italic">
                        {t('billing.noHistory')}
                    </div>
                ) : (
                    <DataTable
                        columns={[
                            { header: t('common.date'), accessorKey: 'created_at' as unknown as string, cell: (row: Record<string, unknown>) => format(new Date(row.created_at as string), 'MMM dd, yyyy') },
                            { header: t('common.amount'), accessorKey: 'amount' as unknown as string, cell: (row: Record<string, unknown>) => <span className="font-bold">₹{parseFloat(row.amount as string).toLocaleString()}</span> },
                            {
                                header: t('common.status'),
                                cell: (row: Record<string, unknown>) => (
                                    <div className="flex items-center gap-1.5">
                                        {row.status === 'PAID' ? <CheckCircle2 size={12} className="text-green-500" /> :
                                            row.status === 'FAILED' ? <AlertCircle size={12} className="text-red-500" /> :
<Clock size={12} className="text-coral-500" />}
                                    <span className={cn(
                                        "text-[9px] font-black uppercase tracking-tighter",
                                        row.status === 'PAID' ? "text-green-500" :
                                            row.status === 'FAILED' ? "text-red-500" :
                                                "text-coral-500"
                                    )}>
                                        {String(row.status)}
                                    </span>
                                    </div>
                                ),
                            },
                            { header: 'Method', cell: (row: Record<string, unknown>) => <span className="text-xs text-muted">{(row.payment_method as string) || 'N/A'}</span> },
                        ]}
                        data={billingHistory}
                        loading={isLoading}
                        emptyMessage="No billing history found for this tenant."
                    />
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
