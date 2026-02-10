import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { subscriptionService, Plan } from '@/services/subscription.service';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

declare global {
    interface Window {
        Razorpay: any;
    }
}

export const SubscriptionPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

    const { data: subscription, isLoading: loadingSub } = useQuery({
        queryKey: ['subscription', 'my'],
        queryFn: () => subscriptionService.getMySubscription(),
    });

    const { data: usage, isLoading: loadingUsage } = useQuery({
        queryKey: ['subscription', 'usage'],
        queryFn: () => subscriptionService.getUsage(),
    });

    const { data: plans = [], isLoading: loadingPlans } = useQuery({
        queryKey: ['subscription', 'plans'],
        queryFn: () => subscriptionService.getPlans(),
    });

    const handlePayment = async (plan: Plan) => {
        try {
            // 1. Create order
            const order = await subscriptionService.createOrder(plan.id, billingCycle);

            // 2. Open Razorpay
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'your_key_id_here', // Use env var if possible
                amount: order.amount,
                currency: order.currency,
                name: 'WellZo HRMS',
                description: `Upgrade to ${plan.name} Plan`,
                order_id: order.order_id,
                handler: async (response: any) => {
                    try {
                        // 3. Verify payment
                        await subscriptionService.verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            plan_id: plan.id,
                            billing_cycle: billingCycle,
                        });

                        toast.success('Subscription upgraded successfully!');
                        queryClient.invalidateQueries({ queryKey: ['subscription'] });
                    } catch (error: any) {
                        toast.error(error.message || 'Payment verification failed');
                    }
                },
                prefill: {
                    name: '',
                    email: '',
                    contact: '',
                },
                theme: {
                    color: '#D4AF37', // Gold color
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (error: any) {
            toast(error.message || 'Error creating payment order', { icon: '⚠️' });
        }
    };

    if (loadingSub || loadingUsage || loadingPlans) {
        return (
            <DashboardLayout title="Subscription">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            title="Subscription Management"
            breadcrumbs={[{ label: 'Dashboard', href: '/dashboard/organization' }, { label: 'Subscription' }]}
        >
            <div className="space-y-8">
                {/* Current Plan & Usage */}
                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                            <Badge status={subscription?.status === 'ACTIVE' ? 'success' : 'warning'}>
                                {subscription?.status || 'Unknown'}
                            </Badge>
                        </div>
                        <div className="mb-6">
                            <h3 className="text-xl font-bold mb-1">Current Plan</h3>
                            <p className="text-4xl font-black text-primary mb-2">
                                {subscription?.plan_name || (usage?.plan_name === 'NONE' ? 'No Active Plan' : 'Unknown')}
                            </p>
                            <p className="text-muted text-sm">
                                {subscription ? `Started on ${format(new Date(subscription.start_date), 'PPP')}` : 'Subscription inactive'}
                            </p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted">Billing Cycle</span>
                                <span className="font-bold">{subscription?.billing_cycle}</span>
                            </div>
                            {subscription?.is_trial && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted">Trial Ends</span>
                                    <span className="font-bold text-yellow-500">
                                        {subscription.trial_ends_at ? format(new Date(subscription.trial_ends_at), 'PPP') : 'N/A'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <h3 className="text-xl font-bold mb-6">Plan Usage</h3>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium">Employee Limit</span>
                                    <span className="text-sm font-bold">
                                        {usage?.current_employees} / {usage?.max_employees || (usage?.plan_name === 'NONE' ? 'Disabled' : usage?.max_employees === null ? 'Unlimited' : '0')}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5">
                                    <div
                                        className={cn(
                                            "h-2.5 rounded-full transition-all duration-500",
                                            usage?.max_employees && usage.current_employees / usage.max_employees > 0.9 ? "bg-red-500" : "bg-primary"
                                        )}
                                        style={{
                                            width: usage?.max_employees
                                                ? `${Math.min((usage.current_employees / usage.max_employees) * 100, 100)}%`
                                                : '100%',
                                        }}
                                    ></div>
                                </div>
                                {usage?.max_employees && usage.current_employees >= usage.max_employees && (
                                    <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                                        <AlertCircle size={12} /> Limit reached! Please upgrade to add more employees.
                                    </p>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Plan Selection */}
                <div className="text-center space-y-4">
                    <h2 className="text-3xl font-bold">Available Plans</h2>
                    <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
                        <button
                            onClick={() => setBillingCycle('MONTHLY')}
                            className={cn(
                                "px-4 py-2 rounded-md transition-all text-sm font-medium",
                                billingCycle === 'MONTHLY' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-muted"
                            )}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingCycle('YEARLY')}
                            className={cn(
                                "px-4 py-2 rounded-md transition-all text-sm font-medium",
                                billingCycle === 'YEARLY' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-muted"
                            )}
                        >
                            Yearly (Save 15%)
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {plans.map((p) => (
                        <Card
                            key={p.id}
                            className={cn(
                                "flex flex-col relative",
                                p.id === subscription?.plan_id && "border-primary ring-1 ring-primary"
                            )}
                        >
                            {p.id === subscription?.plan_id && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-black text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter">
                                    Current Plan
                                </div>
                            )}
                            <div className="mb-6">
                                <h4 className="text-lg font-bold">{p.name}</h4>
                                <div className="flex items-baseline gap-1 my-4">
                                    <span className="text-3xl font-black">₹{(() => { const price = p.prices?.find(pr => pr.interval === billingCycle)?.unit_amount || 0; return price; })()}</span>
                                    <span className="text-muted text-sm">/{billingCycle.toLowerCase()}</span>
                                </div>
                                <p className="text-sm text-muted line-clamp-2">{p.description}</p>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                <li className="flex items-center gap-2 text-sm">
                                    <Check size={16} className="text-green-500" />
                                    <span>{p.max_employees ? `Up to ${p.max_employees} employees` : 'Unlimited employees'}</span>
                                </li>
                                {Object.entries(p.features as Record<string, boolean>).map(([f, enabled]) => (
                                    enabled && (
                                        <li key={f} className="flex items-center gap-2 text-sm uppercase tracking-tighter decoration-primary decoration-2">
                                            <Check size={16} className="text-green-500" />
                                            {f.replace(/_/g, ' ')}
                                        </li>
                                    )
                                ))}
                            </ul>

                            <Button
                                variant={p.id === subscription?.plan_id ? "outline" : "primary"}
                                className="w-full"
                                disabled={p.id === subscription?.plan_id}
                                onClick={() => handlePayment(p)}
                            >
                                {p.id === subscription?.plan_id ? "Current Plan" : "Upgrade Plan"}
                            </Button>
                        </Card>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
};

// Helper components missing from the codebase but used here
const Badge: React.FC<{ children: React.ReactNode, status: 'success' | 'warning' | 'error' }> = ({ children, status }) => {
    const styles = {
        success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
        <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider', styles[status])}>
            {children}
        </span>
    );
};
