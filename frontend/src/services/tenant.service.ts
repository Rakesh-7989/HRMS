import api from './api';

// ============================================================================
// INTERFACES
// ============================================================================

export interface EmployeeIdSettings {
    prefix: string | null;
    counter: number;
    nextId: string | null;
    usePrefix: boolean;
    isConfigured: boolean;
}

export interface SetPrefixResponse {
    prefix: string;
    nextId: string;
    message: string;
}

export interface ToggleModeResponse {
    usePrefix: boolean;
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
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            throw new Error(axiosError.response?.data?.message || 'Failed to get employee ID settings');
        }
    },

    /**
     * Set employee ID prefix for the tenant (one-time only)
     */
    setEmployeeIdPrefix: async (prefix: string): Promise<SetPrefixResponse> => {
        try {
            const response = await api.post('/tenants/employee-id-prefix', { prefix });
            return response.data.data;
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            throw new Error(axiosError.response?.data?.message || 'Failed to set employee ID prefix');
        }
    },

    /**
     * Toggle employee ID mode (auto-prefix vs manual entry)
     */
    toggleEmployeeIdMode: async (usePrefix: boolean): Promise<ToggleModeResponse> => {
        try {
            const response = await api.put('/tenants/employee-id-mode', { usePrefix });
            return response.data.data;
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            throw new Error(axiosError.response?.data?.message || 'Failed to toggle employee ID mode');
        }
    },
};

export default tenantService;
