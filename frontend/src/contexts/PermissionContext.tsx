import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface PermissionContextType {
    permissions: string[];
    hasPermission: (name: string) => boolean;
    hasAnyPermission: (names: string[]) => boolean;
    hasAllPermissions: (names: string[]) => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();

    const value = useMemo(() => {
        const permissions = user?.permissions || [];

        return {
            permissions,
            hasPermission: (name: string) => permissions.includes(name),
            hasAnyPermission: (names: string[]) => names.some(n => permissions.includes(n)),
            hasAllPermissions: (names: string[]) => names.every(n => permissions.includes(n)),
        };
    }, [user?.permissions]);

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    );
};

export const usePermission = () => {
    const context = useContext(PermissionContext);
    if (context === undefined) {
        throw new Error('usePermission must be used within a PermissionProvider');
    }
    return context;
};

// Convenience component for conditional rendering based on permissions
interface PermissionGateProps {
    permission?: string;
    anyPermission?: string[];
    allPermissions?: string[];
    fallback?: ReactNode;
    children: ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
    permission,
    anyPermission,
    allPermissions,
    fallback = null,
    children,
}) => {
    const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();

    let allowed = true;

    if (permission) {
        allowed = hasPermission(permission);
    } else if (anyPermission) {
        allowed = hasAnyPermission(anyPermission);
    } else if (allPermissions) {
        allowed = hasAllPermissions(allPermissions);
    }

    return allowed ? <>{children}</> : <>{fallback}</>;
};
