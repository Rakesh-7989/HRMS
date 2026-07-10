import api from './api';

export interface PlanFeatures {
    dashboard?: Record<string, boolean>;
    collaboration?: Record<string, boolean>;
    employee_management?: Record<string, boolean>;
    leave_tracker?: Record<string, boolean>;
    attendance_tracker?: Record<string, boolean>;
    project_management?: Record<string, boolean>;
    asset_management?: Record<string, boolean>;
    employee_activity_monitoring?: Record<string, boolean>;
    automation?: Record<string, boolean>;
    performance_management?: Record<string, boolean>;
    payroll_automation?: Record<string, boolean>;
    mobile_application?: Record<string, boolean>;
    other_features?: Record<string, boolean>;
    contact_sales?: boolean;
}

export interface PlanVariation {
    id: string;
    plan_id: string;
    frequency: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
    duration_months: number;
    unit_price: number;
    gst_percentage: number;
    is_active: boolean;
}

export interface PlanPrice {
    id: string;
    interval: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
    unit_amount: number;
    currency: string;
}

export interface Plan {
    id: string;
    name: string;
    price: number;
    setup_fee: number;
    max_employees: number | null;
    features: PlanFeatures;
    is_active: boolean;
    description?: string;
    created_at?: string;
    updated_at?: string;
    prices?: PlanPrice[];
    variations?: PlanVariation[]; // Deprecated but keeping for safety if used elsewhere
}

class PlansService {
    async getPlans(): Promise<Plan[]> {
        const response = await api.get('/subscriptions/plans');
        // Handle both {success:true, data:[]} and {status:'success', plans:[]}
        return response.data.data || response.data.plans || [];
    }

    async getAdminPlans(): Promise<Plan[]> {
        const response = await api.get('/super-admin/plans');
        return response.data.plans || response.data.data || [];
    }

    async getPlanById(id: string): Promise<Plan> {
        const response = await api.get(`/subscriptions/plans/${id}`);
        return response.data;
    }

    async updatePlan(id: string, data: Partial<Plan>): Promise<Plan> {
        const response = await api.put(`/super-admin/plans/${id}`, data);
        return response.data.data;
    }

    async createPlan(data: Partial<Plan>): Promise<Plan> {
        const response = await api.post('/super-admin/plans', data);
        return response.data.data;
    }

    async deletePlan(id: string): Promise<void> {
        await api.delete(`/super-admin/plans/${id}`);
    }
}

export const plansService = new PlansService();
