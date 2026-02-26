import api from '@/services/common/api';

// ==========================================================================
// TYPES
// ==========================================================================

export interface GeoFencingSettings {
    id?: string;
    tenant_id?: string;
    is_enabled: boolean;
    allow_clock_without_location: boolean;
    location_timeout_seconds: number;
    require_high_accuracy: boolean;
}

export interface GeoFenceLocation {
    id: string;
    tenant_id?: string;
    name: string;
    description?: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
    is_active: boolean;
    created_at?: string;
}

export interface GeoFenceValidationResult {
    allowed: boolean;
    location?: GeoFenceLocation;
    distance?: number;
    reason: string;
}

export interface GeoFenceViolation {
    id: string;
    employee_id: string;
    action_type: 'CLOCK_IN' | 'CLOCK_OUT';
    employee_latitude?: number;
    employee_longitude?: number;
    distance_meters?: number;
    violation_reason: string;
    device_type?: string;
    first_name?: string;
    last_name?: string;
    location_name?: string;
    created_at: string;
}

export interface CreateGeoFenceLocationData {
    name: string;
    description?: string;
    latitude: number;
    longitude: number;
    radius_meters?: number;
    is_active?: boolean;
}

// ==========================================================================
// SERVICE
// ==========================================================================

export const geoFencingService = {
    // Settings
    getSettings: async (): Promise<GeoFencingSettings> => {
        const response = await api.get<{ status: string; data: GeoFencingSettings }>('/geo-fencing/settings');
        return response.data.data;
    },

    updateSettings: async (data: Partial<GeoFencingSettings>): Promise<GeoFencingSettings> => {
        const response = await api.put<{ status: string; data: GeoFencingSettings }>('/geo-fencing/settings', data);
        return response.data.data;
    },

    // Locations
    getLocations: async (includeInactive = false): Promise<GeoFenceLocation[]> => {
        const response = await api.get<{ status: string; data: GeoFenceLocation[] }>('/geo-fencing/locations', {
            params: { include_inactive: includeInactive }
        });
        return response.data.data || [];
    },

    getLocation: async (id: string): Promise<GeoFenceLocation> => {
        const response = await api.get<{ status: string; data: GeoFenceLocation }>(`/geo-fencing/locations/${id}`);
        return response.data.data;
    },

    createLocation: async (data: CreateGeoFenceLocationData): Promise<GeoFenceLocation> => {
        const response = await api.post<{ status: string; data: GeoFenceLocation }>('/geo-fencing/locations', data);
        return response.data.data;
    },

    updateLocation: async (id: string, data: Partial<CreateGeoFenceLocationData>): Promise<GeoFenceLocation> => {
        const response = await api.put<{ status: string; data: GeoFenceLocation }>(`/geo-fencing/locations/${id}`, data);
        return response.data.data;
    },

    deleteLocation: async (id: string): Promise<void> => {
        await api.delete(`/geo-fencing/locations/${id}`);
    },

    // Validation
    validateLocation: async (latitude: number | null, longitude: number | null): Promise<GeoFenceValidationResult> => {
        const response = await api.post<{ status: string; data: GeoFenceValidationResult }>('/geo-fencing/validate', {
            latitude,
            longitude
        });
        return response.data.data;
    },

    // Violations
    getViolations: async (params?: {
        employee_id?: string;
        from_date?: string;
        to_date?: string;
        limit?: number;
        offset?: number;
    }): Promise<GeoFenceViolation[]> => {
        const response = await api.get<{ status: string; data: GeoFenceViolation[] }>('/geo-fencing/violations', { params });
        return response.data.data || [];
    },

    // ==========================================================================
    // BROWSER GEOLOCATION HELPERS
    // ==========================================================================

    /**
     * Get current browser location
     * Returns null if permission denied or error
     */
    getCurrentPosition: (settings?: GeoFencingSettings): Promise<GeolocationPosition | null> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                console.warn('Geolocation not supported');
                resolve(null);
                return;
            }

            const timeout = (settings?.location_timeout_seconds || 30) * 1000;
            const highAccuracy = settings?.require_high_accuracy ?? false;

            navigator.geolocation.getCurrentPosition(
                (position) => resolve(position),
                (error) => {
                    console.warn('Geolocation error:', error.message);
                    resolve(null);
                },
                {
                    enableHighAccuracy: highAccuracy,
                    timeout: timeout,
                    maximumAge: 0
                }
            );
        });
    },

    /**
     * Full geo-fence check: get location + validate
     * Returns: { allowed, reason, position, validationResult }
     */
    performGeoFenceCheck: async (settings?: GeoFencingSettings): Promise<{
        allowed: boolean;
        reason: string;
        position: GeolocationPosition | null;
        validationResult: GeoFenceValidationResult | null;
        errorMessage?: string;
    }> => {
        // If no settings or disabled, allow
        if (!settings || !settings.is_enabled) {
            return { allowed: true, reason: 'GEO_FENCE_DISABLED', position: null, validationResult: null };
        }

        // Get browser location
        const position = await geoFencingService.getCurrentPosition(settings);

        if (!position) {
            // Location not available
            if (settings.allow_clock_without_location) {
                return { allowed: true, reason: 'LOCATION_NOT_REQUIRED', position: null, validationResult: null };
            }
            return {
                allowed: false,
                reason: 'LOCATION_UNAVAILABLE',
                position: null,
                validationResult: null,
                errorMessage: 'Unable to get your location. Please enable location services and try again.'
            };
        }

        // Validate with backend
        try {
            const validationResult = await geoFencingService.validateLocation(
                position.coords.latitude,
                position.coords.longitude
            );

            if (validationResult.allowed) {
                return {
                    allowed: true,
                    reason: validationResult.reason,
                    position,
                    validationResult
                };
            } else {
                return {
                    allowed: false,
                    reason: validationResult.reason,
                    position,
                    validationResult,
                    errorMessage: `You are ${validationResult.distance}m away from the nearest allowed location${validationResult.location ? ` (${validationResult.location.name})` : ''}. Please move closer to clock in/out.`
                };
            }
        } catch (error: any) {
            console.error('Geo-fence validation error:', error);
            return {
                allowed: false,
                reason: 'VALIDATION_ERROR',
                position,
                validationResult: null,
                errorMessage: 'Unable to validate your location. Please try again.'
            };
        }
    }
};

export default geoFencingService;
