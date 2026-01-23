import api from './api';

export interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    max_employees: number | null;
    features: any;
    is_active: boolean;
}

export interface Subscription {
    id: string;
    tenant_id: string;
    plan_id: string;
    status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
    billing_cycle: 'MONTHLY' | 'YEARLY';
    start_date: string;
    end_date: string | null;
    trial_ends_at: string | null;
    is_trial: boolean;
    last_payment_date: string | null;
    amount_paid: number;
    plan_name: string;
    features: any;
    plan_price: number;
}

export interface Usage {
    plan_name: string;
    max_employees: number | null;
    current_employees: number;
    is_trial: boolean;
    status: string;
    trial_ends_at: string | null;
    end_date: string | null;
}

export const subscriptionService = {
    getPlans: async (): Promise<Plan[]> => {
        const response = await api.get('/subscriptions/plans');
        return response.data.data;
    },

    getMySubscription: async (): Promise<Subscription> => {
        const response = await api.get('/subscriptions/my-subscription');
        return response.data.data;
    },

    getUsage: async (): Promise<Usage> => {
        const response = await api.get('/subscriptions/usage');
        return response.data.data;
    },

    createOrder: async (planId: string, billingCycle: 'MONTHLY' | 'YEARLY') => {
        const response = await api.post('/subscriptions/create-order', {
            plan_id: planId,
            billing_cycle: billingCycle,
        });
        return response.data.data;
    },

    verifyPayment: async (paymentData: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
        plan_id: string;
        billing_cycle: string;
    }) => {
        const response = await api.post('/subscriptions/verify-payment', paymentData);
        return response.data.data;
    },

    cancelSubscription: async () => {
        const response = await api.post('/subscriptions/cancel');
        return response.data.data;
    },
};
