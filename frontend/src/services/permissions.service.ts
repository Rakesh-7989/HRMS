import api from './api';

export type PermissionAction = string; // Generic for now, but allows better typing in components

export interface Permission {
    permission_id: string;
    module: string;
    action: string;
    label: string;
    description: string;
    enabled: boolean;
}

export interface UserPermissionDetailed extends Permission {
    role_enabled: boolean;
    user_override: boolean | null;
    effective: boolean;
}

export interface PermissionsGrouped {
    [module: string]: {
        id: string;
        module: string;
        action: string;
        label: string;
        description: string;
    }[];
}

export interface TenantRole {
    role: string;
    description: string | null;
    is_system: boolean;
}

export const permissionsService = {
    /**
     * Get current user's effective permissions (permission key strings)
     */
    getMyPermissions: async (): Promise<string[]> => {
        const response = await api.get<{ status: string; data: { permissions: string[] } }>(
            '/permissions/me'
        );
        return response.data.data.permissions;
    },

    /**
     * Get all permissions (master catalog, grouped by module)
     */
    getAllPermissions: async (): Promise<PermissionsGrouped> => {
        const response = await api.get<{ status: string; data: PermissionsGrouped }>(
            '/permissions'
        );
        return response.data.data;
    },

    /**
     * Get all roles for the current tenant (system + custom)
     */
    getTenantRoles: async (): Promise<TenantRole[]> => {
        const response = await api.get<{ status: string; data: { roles: TenantRole[] } }>(
            '/permissions/roles'
        );
        return response.data.data.roles;
    },

    /**
     * Create a new custom role
     */
    createCustomRole: async (name: string, description?: string): Promise<{ role: string; description: string }> => {
        const response = await api.post<{ status: string; data: { role: string; description: string } }>(
            '/permissions/roles',
            { name, description }
        );
        return response.data.data;
    },

    /**
     * Delete a custom role
     */
    deleteCustomRole: async (role: string): Promise<void> => {
        await api.delete(`/permissions/roles/${role}`);
    },

    /**
     * Get permissions for a specific role in current tenant
     */
    getRolePermissions: async (role: string): Promise<Permission[]> => {
        const response = await api.get<{ status: string; data: { role: string; permissions: Permission[] } }>(
            `/permissions/role/${role}`
        );
        return response.data.data.permissions;
    },

    /**
     * Update role permissions (bulk)
     */
    updateRolePermissions: async (
        role: string,
        permissions: { permission_id: string; enabled: boolean }[]
    ): Promise<void> => {
        await api.put(`/permissions/role/${role}`, { permissions });
    },

    /**
     * Get detailed permissions for a user (with override info)
     */
    getUserPermissions: async (userId: string): Promise<UserPermissionDetailed[]> => {
        const response = await api.get<{ status: string; data: { userId: string; permissions: UserPermissionDetailed[] } }>(
            `/permissions/user/${userId}`
        );
        return response.data.data.permissions;
    },

    /**
     * Update user permission overrides
     */
    updateUserPermissions: async (
        userId: string,
        overrides: { permission_id: string; granted: boolean | null }[]
    ): Promise<void> => {
        await api.put(`/permissions/user/${userId}`, { overrides });
    },
};
