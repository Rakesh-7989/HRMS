import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { permissionsService } from '@/services/permissions.service';

interface PermissionsContextType {
    permissions: string[];
    loading: boolean;
    hasPermission: (module: string, action: string) => boolean;
    hasAnyPermission: (checks: [string, string][]) => boolean;
    refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPermissions = useCallback(async () => {
        if (!isAuthenticated || !user) {
            setPermissions([]);
            setLoading(false);
            return;
        }

        try {
            const perms = await permissionsService.getMyPermissions();
            setPermissions(perms);
        } catch (err) {
            console.warn('Failed to fetch permissions, using empty set:', err);
            setPermissions([]);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, user]);

    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);

    /**
     * Check if the user has a specific permission.
     * SUPER_ADMIN always returns true.
     */
    const hasPermission = useCallback(
        (module: string, action: string): boolean => {
            if (!user) return false;
            if (user.role === 'SUPER_ADMIN') return true;
            return permissions.includes(`${module}:${action}`);
        },
        [user, permissions]
    );

    /**
     * Check if the user has ANY of the given permissions.
     * Useful for showing sections that require at least one permission.
     */
    const hasAnyPermission = useCallback(
        (checks: [string, string][]): boolean => {
            if (!user) return false;
            if (user.role === 'SUPER_ADMIN') return true;
            return checks.some(([mod, act]) => permissions.includes(`${mod}:${act}`));
        },
        [user, permissions]
    );

    return (
        <PermissionsContext.Provider
            value={{
                permissions,
                loading,
                hasPermission,
                hasAnyPermission,
                refreshPermissions: fetchPermissions,
            }}
        >
            {children}
        </PermissionsContext.Provider>
    );
};

export const usePermissions = () => {
    const context = useContext(PermissionsContext);
    if (context === undefined) {
        throw new Error('usePermissions must be used within a PermissionsProvider');
    }
    return context;
};
