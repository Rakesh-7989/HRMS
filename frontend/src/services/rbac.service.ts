import apiClient from './api';

export interface Permission {
    id: string;
    name: string;
    category: string;
    description: string;
}

export interface Role {
    id: string;
    name: string;
    description: string;
    tenant_id: string | null;
    role_type: 'PLATFORM' | 'SYSTEM' | 'CUSTOM';
    is_deletable: boolean;
    is_customizable: boolean;
    user_count?: number;
    permission_count?: number;
    permissions?: Permission[];
    created_at: string;
    updated_at: string;
}

export interface UserRoleAssignment {
    assignment_id: string;
    id: string;
    name: string;
    description: string;
    role_type: string;
    scope_type: string | null;
    scope_id: string | null;
    assigned_at: string;
    assigned_by_email: string | null;
}

export const rbacService = {
    // Permissions
    async getAllPermissions(): Promise<Record<string, Permission[]>> {
        const { data } = await apiClient.get('/rbac/permissions');
        return data.data;
    },

    async getMyPermissions(): Promise<Permission[]> {
        const { data } = await apiClient.get('/rbac/permissions/my');
        return data.data;
    },

    // Roles
    async getRoles(): Promise<Role[]> {
        const { data } = await apiClient.get('/rbac/roles');
        return data.data;
    },

    async getRole(id: string): Promise<Role> {
        const { data } = await apiClient.get(`/rbac/roles/${id}`);
        return data.data;
    },

    async createRole(payload: { name: string; description: string; permissionIds: string[] }): Promise<Role> {
        const { data } = await apiClient.post('/rbac/roles', payload);
        return data.data;
    },

    async updateRole(id: string, payload: { name?: string; description?: string; permissionIds?: string[] }): Promise<Role> {
        const { data } = await apiClient.put(`/rbac/roles/${id}`, payload);
        return data.data;
    },

    async deleteRole(id: string): Promise<void> {
        await apiClient.delete(`/rbac/roles/${id}`);
    },

    // User-Role Assignments
    async getUserRoles(userId: string): Promise<UserRoleAssignment[]> {
        const { data } = await apiClient.get(`/rbac/users/${userId}/roles`);
        return data.data;
    },

    async assignRole(userId: string, roleId: string, scopeType?: string, scopeId?: string): Promise<any> {
        const { data } = await apiClient.post(`/rbac/users/${userId}/roles`, {
            roleId,
            scopeType,
            scopeId,
        });
        return data.data;
    },

    async removeRole(userId: string, roleId: string): Promise<void> {
        await apiClient.delete(`/rbac/users/${userId}/roles/${roleId}`);
    },
};
