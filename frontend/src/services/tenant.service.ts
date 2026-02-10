import api from './api';

// ============================================================================
// INTERFACES
// ============================================================================

export interface EmployeeIdSettings {
    prefix: string | null;
    counter: number;
    nextId: string | null;
    isConfigured: boolean;
}

export interface SetPrefixResponse {
    prefix: string;
    nextId: string;
    message: string;
}

// ============================================================================
// SERVICE
// ============================================================================

export const tenantService = {
    /**
     * Get employee ID settings for the current tenant
     */
    getEmployeeIdSettings: async (): Promise<EmployeeIdSettings> => {
        try {
            const response = await api.get('/tenants/employee-id-settings');
            return response.data.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to get employee ID settings');
        }
    },

    /**
     * Set employee ID prefix for the tenant (one-time only)
     */
    setEmployeeIdPrefix: async (prefix: string): Promise<SetPrefixResponse> => {
        try {
            const response = await api.post('/tenants/employee-id-prefix', { prefix });
            return response.data.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to set employee ID prefix');
        }
    },
};

export default tenantService;
