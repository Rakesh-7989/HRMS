import React from 'react';
import { cn } from '@/utils/cn';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Download, ExternalLink, Calendar, CreditCard, AlertCircle, CheckCircle2, AlertTriangle, Clock, Zap } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { subscriptionService } from '@/services/subscription.service';

import { load } from '@cashfreepayments/cashfree-js';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/ui/DataTable';


export const BillingPortalPage: React.FC = () => {
  const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [errorConfig, setErrorConfig] = React.useState<{
        isOpen: boolean;
        title: string;
        message: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
    });

    const { data: invoices, isLoading } = useQuery<any[]>({
        queryKey: ['my-invoices'],
        queryFn: () => subscriptionService.getInvoices(),
    });

    const { data: subscription } = useQuery({
        queryKey: ['my-subscription'],
        queryFn: () => subscriptionService.getMySubscription(),
    });

    const handleRetryPayment = async (invoiceId: string) => {
        try {
            const result = await subscriptionService.retryPayment(invoiceId);

            if (result.payment_link) {
                window.location.href = result.payment_link;
                return;
            }

            if (result.payment_session_id) {
                const cashfree = await load({
                    mode: (import.meta.env.VITE_CASHFREE_ENVIRONMENT || 'sandbox').toLowerCase() as any
                });

                await cashfree.checkout({
                    paymentSessionId: result.payment_session_id,
                    redirectTarget: "_self"
                });
            }
        } catch (error: any) {
            setErrorConfig({
                isOpen: true,
                title: 'Payment Error',
                message: error.message || 'Error initiating payment'
            });
        }
    };

    return (
        <DashboardLayout
            title="Billing & Subscriptions"
            breadcrumbs={[
                { label: t('common.breadcrumbs.dashboard'), href: user?.role === 'ADMIN' ? '/dashboard/organization' : '/dashboard/personal' },
                { label: t('common.breadcrumbs.settings'), href: '/settings' },
                { label: 'Billing' },
            ]}
        >
            <div className="max-w-6xl mx-auto space-y-8">
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
                    </div>
                ) : (
                    <>
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Current Plan Summary */}
                            <Card className="md:col-span-2 p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Current Plan</h2>
                                        <div className="text-3xl font-bold text-brand-500">{subscription?.plan_name || 'Free Plan'}</div>
                                    </div>
                                    <div className={cn(
                                        "px-3 py-1 rounded-full text-xs font-bold",
                                        subscription?.status === 'ACTIVE' ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" :
                                            subscription?.status === 'PAST_DUE' ? "bg-coral-100 text-coral-600 dark:bg-coral-500/20 dark:text-coral-400" :
                                                subscription?.status === 'TRIAL' ? "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400" :
                                                    "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                    )}>
                                        {subscription?.status || 'INACTIVE'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-50 dark:border-white/5">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="text-brand-500-light" size={20} />
                                        <div>
                                            <p className="text-xs text-gray-500">Renews on</p>
                                            <p className="font-semibold">{subscription?.end_date ? format(new Date(subscription.end_date), 'MMM dd, yyyy') : 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="text-brand-500-light" size={20} />
                                        <div>
                                            <p className="text-xs text-gray-500">Billing Cycle</p>
                                            <p className="font-semibold capitalize">{subscription?.billing_cycle || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Renewal / Reactivation CTA */}
                            {(!subscription?.status || ['INACTIVE', 'PAST_DUE', 'CANCELLED', 'SUSPENDED'].includes(subscription.status)) && (
                                <Card className="md:col-span-3 p-6 border-l-4 border-l-amber-500 bg-coral-50 dark:bg-coral-500/10 mb-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                                                <AlertTriangle size={18} className="text-coral-600" />
                                                Subscription Inactive
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-coral-200/80">
                                                Your subscription is currently inactive. Restore full access to premium features now.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => navigate('/pricing')}
                                            className="bg-coral-500 hover:bg-coral-600 text-white shadow-elev-4 shadow-coral-600/20 w-full sm:w-auto"
                                        >
                                            <Zap size={16} className="mr-2" />
                                            Reactivate Plan
                                        </Button>
                                    </div>
                                </Card>
                            )}

                            {/* Limits Card */}
                            <Card className="p-6">
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Organization Usage</h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1.5">
                                            <span className="text-gray-600 dark:text-muted">Employees</span>
                                            <span className="font-bold">{subscription?.current_employees || 0} / {subscription?.max_employees || '∞'}</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-brand-500 rounded-full transition-all"
                                                style={{ width: `${Math.min(100, ((subscription?.current_employees || 0) / (subscription?.max_employees || 1)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full mt-2"
                                        onClick={() => navigate('/pricing')}
                                    >
                                        <ExternalLink className="mr-2" size={14} />
                                        Upgrade Limits
                                    </Button>
                                </div>
                            </Card>
                        </div>

                        {/* Invoice History */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Clock size={20} className="text-brand-500" />
                                Invoice History
                            </h2>
                            <Card className="overflow-hidden border-none shadow-elev-5">
                                <DataTable
                                    columns={[
                                        { header: 'Date', accessor: (row: any) => format(new Date(row.created_at), 'MMM dd, yyyy'), sortKey: 'created_at' },
                                        { header: 'Invoice #', accessor: (row: any) => <span className="font-mono text-gray-500">{row.invoice_number || row.id.slice(0, 8)}</span> },
                                        { header: 'Amount', accessor: (row: any) => <span className="font-bold">₹{row.amount?.toLocaleString()}</span>, sortKey: 'amount' },
                                        {
                                            header: 'Status',
                                            accessor: (row: any) => (
                                                <div className="flex items-center gap-2">
                                                    {row.status === 'PAID' ? <CheckCircle2 size={14} className="text-green-500" /> :
                                                        row.status === 'FAILED' ? <AlertCircle size={14} className="text-red-500" /> :
                                                            <Clock size={14} className="text-coral-500" />}
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest",
                                                        row.status === 'PAID' ? "text-green-500" :
                                                            row.status === 'FAILED' ? "text-red-500" :
                                                                "text-coral-500"
                                                    )}>
                                                        {row.status}
                                                    </span>
                                                </div>
                                            ),
                                            sortKey: 'status',
                                        },
                                        {
                                            header: '',
                                            accessor: (row: any) => (
                                                <div className="flex justify-end gap-2">
                                                    {(row.status === 'PENDING' || row.status === 'FAILED') && (
                                                        <Button
                                                            size="sm"
                                                            className="h-8 bg-brand-500 hover:bg-brand-600 text-white"
                                                            onClick={() => handleRetryPayment(row.id)}
                                                        >
                                                            Pay Now
                                                        </Button>
                                                    )}
                                                    {row.status === 'PAID' && (
                                                        <Button variant="ghost" size="sm" className="h-8 text-brand-500 hover:bg-brand-500/10">
                                                            <Download size={16} className="mr-1" />
                                                            PDF
                                                        </Button>
                                                    )}
                                                </div>
                                            ),
                                        },
                                    ]}
                                    data={invoices || []}
                                    isLoading={isLoading}
                                    emptyMessage="No billing transactions found for this organization."
                                    pageSize={10}
                                />
                            </Card>
                        </div>
                    </>
                )}
            </div>

            <SuccessModal
                isOpen={errorConfig.isOpen}
                onClose={() => setErrorConfig({ ...errorConfig, isOpen: false })}
                title={errorConfig.title}
                message={errorConfig.message}
                type="error"
            />
        </DashboardLayout>
    );
};
