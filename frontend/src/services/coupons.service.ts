import api from './api';

export interface Coupon {
    id: string;
    code: string;
    discount_type: 'PERCENT' | 'FIXED';
    discount_value: number;
    max_redemptions: number | null;
    expires_at: string | null;
    times_redeemed: number;
    is_active: boolean;
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'LIMIT EXCEEDED';
    created_at: string;
}

export const couponService = {
    getCoupons: async () => {
        const response = await api.get('/subscriptions/coupons');
        return response.data.data;
    },

    createCoupon: async (data: {
        code: string;
        discount_type: 'PERCENT' | 'FIXED';
        discount_value: number;
        max_redemptions?: number;
        expires_at?: string;
    }) => {
        const response = await api.post('/subscriptions/coupons', data);
        return response.data.data;
    },

    validateCoupon: async (code: string) => {
        const response = await api.post('/subscriptions/coupons/validate', { code });
        return response.data;
    }
};
