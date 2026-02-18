import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { rbacService, Role } from '@/services/rbac.service';
import { Plus, Edit3, Trash2, Shield, ShieldCheck, ShieldAlert, Search, Users, Key, Eye } from 'lucide-react';
import { showToast } from '@/utils/toast';
import { usePermission } from '@/contexts/PermissionContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { RoleModal } from './RoleModal';

export const RolesContent: React.FC = () => {
    const { hasAnyPermission } = usePermission();
    const canManage = hasAnyPermission(['roles.manage']);
    const queryClient = useQueryClient();
    const { confirm } = useConfirm();

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | undefined>(undefined);

    // --------------------------------------------------------------------------
    // Data Fetching
    // --------------------------------------------------------------------------
    const { data: roles = [], isLoading } = useQuery({
        queryKey: ['roles'],
        queryFn: () => rbacService.getRoles(),
    });

    const filteredRoles = roles.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --------------------------------------------------------------------------
    // Mutations
    // --------------------------------------------------------------------------
    const deleteMutation = useMutation({
        mutationFn: (id: string) => rbacService.deleteRole(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            showToast.success('Role deleted successfully');
        },
        onError: (err: any) => {
            const message = err.response?.data?.message || err.message || 'Failed to delete role';
            showToast.error(message);
        },
    });

    // --------------------------------------------------------------------------
    // Handlers
    // --------------------------------------------------------------------------
    const handleDelete = async (role: Role) => {
        const result = await confirm({
            title: 'Delete Role',
            message: `Are you sure you want to delete the role "${role.name}"? This action cannot be undone.`,
            type: 'destructive',
            confirmText: 'Delete',
            cancelText: 'Cancel'
        });
        if (result) {
            deleteMutation.mutate(role.id);
        }
    };

    const handleEdit = (role: Role) => {
        setSelectedRole(role);
        setIsViewOnly(false);
        setIsModalOpen(true);
    };

    const handleView = (role: Role) => {
        setSelectedRole(role);
        setIsViewOnly(true);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedRole(undefined);
        setIsViewOnly(false);
        setIsModalOpen(true);
    };

    const getRoleIcon = (type: string) => {
        switch (type) {
            case 'PLATFORM': return <ShieldAlert className="text-red-500" size={20} />;
            case 'SYSTEM': return <ShieldCheck className="text-primary" size={20} />;
            default: return <Shield className="text-gray-400" size={20} />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Actions & Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Roles & Permissions</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Define custom roles and assign granular permissions to users.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative hidden sm:block">
                        <input
                            type="text"
                            placeholder="Search roles..."
                            className="pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none w-64 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    </div>

                    {canManage && (
                        <Button onClick={handleCreate}>
                            <Plus className="mr-2" size={18} />
                            Create Role
                        </Button>
                    )}
                </div>
            </div>

            {/* Content Grid */}
            {isLoading ? (
                <div className="h-64 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-3"></div>
                    <p className="text-muted text-sm">Loading roles...</p>
                </div>
            ) : filteredRoles.length === 0 ? (
                <Card className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                        <Key className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        {searchTerm ? 'No matching roles' : 'No custom roles yet'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                        {searchTerm
                            ? `We couldn't find any role matching "${searchTerm}".`
                            : "Create custom roles to manage granular permissions for your team."}
                    </p>
                    {!searchTerm && canManage && (
                        <Button onClick={handleCreate}>Create First Role</Button>
                    )}
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredRoles.map((role) => (
                        <Card key={role.id} className="group hover:shadow-md transition-all duration-200 border-gray-200/60 dark:border-gray-700 overflow-hidden">
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50`}>
                                        {getRoleIcon(role.role_type)}
                                    </div>
                                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleView(role)}
                                            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                            title="View Permissions"
                                        >
                                            <Eye size={15} />
                                        </button>
                                        {role.is_customizable && canManage && (
                                            <button
                                                onClick={() => handleEdit(role)}
                                                className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                title="Edit Permissions"
                                            >
                                                <Edit3 size={15} />
                                            </button>
                                        )}
                                        {role.is_deletable && canManage && (
                                            <button
                                                onClick={() => handleDelete(role)}
                                                className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                title="Delete Role"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-gray-900 dark:text-white truncate" title={role.name}>
                                        {role.name}
                                    </h3>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${role.role_type === 'PLATFORM' ? 'bg-red-50 text-red-600 border-red-100' :
                                        role.role_type === 'SYSTEM' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                            'bg-gray-50 text-gray-600 border-gray-200'
                                        }`}>
                                        {role.role_type}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 h-10 mb-4" title={role.description || ''}>
                                    {role.description || 'No description provided.'}
                                </p>

                                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <Users size={14} className="text-gray-400" />
                                        <span>{role.user_count || 0} Users</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <Shield size={14} className="text-gray-400" />
                                        <span>{role.permission_count || 0} Perms</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Role Creation/Edit Modal */}
            <RoleModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                editRole={selectedRole}
                isViewOnly={isViewOnly}
            />
        </div>
    );
};
