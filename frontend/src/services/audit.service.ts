
import api from './api';

export interface AuditLog {
    id: string;
    action: string;
    target_table: string;
    target_id: string;
    created_at: string;
    old_data?: Record<string, unknown>;
    new_data?: Record<string, unknown>;
    actor_email?: string;
    actor_role?: string;
    actor_first_name?: string;
    actor_last_name?: string;
}

export interface AuditFilters {
    tenant_id?: string;
    action?: string;
    target_table?: string;
    from_date?: string;
    to_date?: string;
}

export const auditService = {
    getLogs: async (filters?: AuditFilters) => {
        try {
            const response = await api.get('/audit-logs', { params: filters });
            return response.data?.data || [];
        } catch (error) {
            console.error('Failed to fetch audit logs', error);
            return [];
        }
    }
};
