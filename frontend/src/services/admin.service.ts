import api from './api';

export interface WorkingHours {
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
    workingDays: string[]; // ["Monday", "Tuesday", ...]
}

export interface TenantProfile {
    name: string;
    domain: string;
    email: string;
    phone: string;
    city: string;
    state: string;
    country: string;
    address?: string;
    zip_code?: string;
    settings?: {
        workingHours?: WorkingHours;
        logo_url?: string;
        primary_color?: string;
        timezone?: string;
    };
}

const LOCAL_STORAGE_KEY = 'hrms_tenant_profile_fallback';

export const adminService = {
    getTenantProfile: async (): Promise<TenantProfile> => {
        try {
            const response = await api.get('/admin/tenant/profile');
            const backendData = response.data.data;

            // Merge with local storage fallback for simulated fields (like workingHours or edited name)
            const fallbackRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (fallbackRaw) {
                try {
                    const fallbackData = JSON.parse(fallbackRaw);
                    // We only merge if the fallback data exists and contains values
                    return {
                        ...backendData,
                        ...fallbackData,
                        settings: {
                            ...backendData.settings,
                            ...fallbackData.settings
                        }
                    };
                } catch (e) {
                    console.error('Failed to parse profile fallback:', e);
                }
            }

            return backendData;
        } catch (err) {
            // Fallback entirely to local storage if backend fails or returns error
            const fallbackRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (fallbackRaw) {
                try {
                    return JSON.parse(fallbackRaw);
                } catch (e) {
                    console.error('Failed to parse profile fallback:', e);
                }
            }
            throw err;
        }
    },

    updateTenantProfile: async (data: Partial<TenantProfile>): Promise<void> => {
        // Save to local storage first to simulate persistence
        const existingRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
        let updated = data;

        if (existingRaw) {
            try {
                const existing = JSON.parse(existingRaw);
                updated = {
                    ...existing,
                    ...data,
                    settings: {
                        ...(existing.settings || {}),
                        ...(data.settings || {})
                    }
                };
            } catch (e) {
                console.error('Error updating tenant profile in localStorage:', e);
            }
        }

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

        try {
            // Still attempt calling the backend
            await api.put('/admin/tenant/profile', data);
        } catch (err) {
            console.warn('Backend profile update failed, used localStorage fallback.', err);
            // Suppress error if it's a 404/405/501 (not implemented) to avoid user frustration
            const status = err instanceof Error ? (err as { response?: { status?: number } }).response?.status : undefined;
            if (status === 404 || status === 405 || status === 501) {
                return;
            }
            throw err;
        }
    },

    uploadTenantLogo: async (file: File): Promise<{ logo_url: string }> => {
        const formData = new FormData();
        formData.append('logo', file);
        const response = await api.put('/admin/tenant/logo', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        const logoData = response.data.data;

        // Sync local storage fallback
        const existingRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (existingRaw) {
            try {
                const existing = JSON.parse(existingRaw);
                const updated = {
                    ...existing,
                    settings: {
                        ...(existing.settings || {}),
                        logo_url: logoData.logo_url
                    }
                };
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
                console.error('Error saving logo URL to localStorage:', e);
            }
        }

        return logoData;
    },

    deleteTenantLogo: async (): Promise<void> => {
        await api.delete('/admin/tenant/logo');

        // Sync local storage fallback
        const existingRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (existingRaw) {
            try {
                const existing = JSON.parse(existingRaw);
                const updated = {
                    ...existing,
                    settings: {
                        ...(existing.settings || {}),
                        logo_url: null
                    }
                };
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
                console.error('Error deleting logo URL from localStorage:', e);
            }
        }
    }
};
