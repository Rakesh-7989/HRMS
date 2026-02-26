import api from '@/services/common/api';

export interface PlanPrice {
    id: string;
    interval: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
    unit_amount: number;
    currency: string;
}

export interface Plan {
    id: string;
    name: string;
    description: string;
    setup_fee: number;
    tier: number;
    prices: PlanPrice[];
    features: any;
    is_active: boolean;
    max_employees: number | null;
}

export interface CreateSubscriptionResponse {
    subscriptionId: string;
    cashfreeId: string;
    authLink: string;
}

export const subscriptionService = {
    getPlans: async (): Promise<Plan[]> => {
        const response = await api.get('/subscriptions/plans');
        return response.data.data;
    },

    createSubscription: async (data: {
        planId: string;
        priceId: string;
        quantity: number;
        successUrl?: string;
        cancelUrl?: string;
        couponCode?: string;
    }): Promise<CreateSubscriptionResponse> => {
        const response = await api.post('/subscriptions/subscriptions', data);
        return response.data.data;
    },

    // Legacy/Other methods - kept/updated as placeholders or for other flows
    getMySubscription: async () => {
        const response = await api.get('/subscriptions/my-subscription');
        return response.data.data;
    },

    getInvoices: async () => {
        const response = await api.get('/subscriptions/orders');
        return response.data.data;
    },

    retryPayment: async (invoiceId: string) => {
        const response = await api.post(`/subscriptions/retry-payment/${invoiceId}`);
        return response.data.data;
    },

    validateCoupon: async (code: string) => {
        const response = await api.post('/subscriptions/coupons/validate', { code });
        return response.data;
    },

    getUsage: async () => {
        const response = await api.get('/subscriptions/usage');
        return response.data.data;
    },

    createOrder: async (planId: string, billingCycle: string) => {
        const response = await api.post('/subscriptions/create-order', { planId, billingCycle });
        return response.data.data;
    },

    verifyPayment: async (data: Record<string, any>) => {
        const response = await api.post('/subscriptions/verify-payment', data);
        return response.data.data;
    }
};
