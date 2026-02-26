import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { rbacService, Role } from '@/services/auth/rbac.service';
import { Plus, Edit3, Trash2, Shield, ShieldCheck, ShieldAlert, Search, Users, Key, Eye, Building2, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import { showToast } from '@/utils/toast';
import { usePermission } from '@/contexts/PermissionContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { RoleModal } from './RoleModal';
import { cn } from '@/utils/cn';

export const RolesContent: React.FC = () => {
    const { hasAnyPermission } = usePermission();
    const canManage = hasAnyPermission(['manage_roles']);
    const queryClient = useQueryClient();
    const { confirm } = useConfirm();

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | undefined>(undefined);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // --------------------------------------------------------------------------
    // Data Fetching
    // --------------------------------------------------------------------------
    const { data: roles = [], isLoading } = useQuery({
        queryKey: ['roles'],
        queryFn: () => rbacService.getRoles(),
    });

    const filteredRoles = useMemo(() => roles.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.organization_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    ), [roles, searchTerm]);

    const groupedRoles = useMemo(() => {
        const groups: Record<string, Role[]> = {};
        filteredRoles.forEach(role => {
            const groupName = role.organization_name || 'Global System Roles';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(role);
        });
        return groups;
    }, [filteredRoles]);

    // Automatically expand groups that have matching search results
    useEffect(() => {
        if (searchTerm) {
            setExpandedGroups(new Set(Object.keys(groupedRoles)));
        }
    }, [searchTerm, groupedRoles]);

    // Initial expansion of Global roles
    useEffect(() => {
        if (roles.length > 0 && !searchTerm) {
            setExpandedGroups(new Set(['Global System Roles']));
        }
    }, [roles.length === 0]); // Run once on load

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
    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupName)) next.delete(groupName);
            else next.add(groupName);
            return next;
        });
    };

    const expandAll = () => setExpandedGroups(new Set(Object.keys(groupedRoles)));
    const collapseAll = () => setExpandedGroups(new Set());

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
                    <div className="relative hidden sm:block group">
                        <input
                            type="text"
                            placeholder="Search roles or orgs..."
                            className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700/50 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none w-72 transition-all shadow-sm group-hover:shadow-md"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={16} />
                    </div>

                    {canManage && (
                        <Button onClick={handleCreate}>
                            <Plus className="mr-2" size={18} />
                            Create Role
                        </Button>
                    )}
                </div>
            </div>

            {/* Global Controls */}
            {!isLoading && filteredRoles.length > 0 && (
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">View Controls</span>
                        <div className="h-px w-8 bg-gray-100 dark:bg-gray-800"></div>
                        <button
                            onClick={expandAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-primary hover:bg-primary/5 transition-all"
                        >
                            <Maximize2 size={12} />
                            Expand All
                        </button>
                        <button
                            onClick={collapseAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-primary hover:bg-primary/5 transition-all"
                        >
                            <Minimize2 size={12} />
                            Collapse All
                        </button>
                    </div>
                </div>
            )}

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
                <div className="space-y-8">
                    {Object.entries(groupedRoles).map(([groupName, groupRoles]) => {
                        const isExpanded = expandedGroups.has(groupName);
                        return (
                            <div key={groupName} className="space-y-4">
                                <button
                                    onClick={() => toggleGroup(groupName)}
                                    className="w-full flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 hover:border-primary/30 transition-all group shadow-sm hover:shadow-md"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                                            isExpanded ? "bg-primary text-white shadow-md shadow-primary/25" : "bg-gray-50 dark:bg-gray-800 text-gray-400 group-hover:text-primary"
                                        )}>
                                            <Building2 size={20} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                                                {groupName}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                                                    {groupRoles.length} Roles
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "p-2 rounded-md transition-all",
                                        isExpanded ? "bg-primary/10 text-primary" : "text-gray-300 group-hover:text-gray-400"
                                    )}>
                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {groupRoles.map((role) => (
                                            <Card key={role.id} className="group hover:shadow-md transition-all duration-200 border-gray-200/60 dark:border-gray-700/50 overflow-hidden relative">
                                                <div className="p-4">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className={cn(
                                                            "p-2 rounded-lg transition-colors",
                                                            role.role_type === 'PLATFORM' ? "bg-red-50 dark:bg-red-500/10" :
                                                                role.role_type === 'SYSTEM' ? "bg-primary/5 dark:bg-primary/10" : "bg-gray-50 dark:bg-gray-800/50"
                                                        )}>
                                                            {getRoleIcon(role.role_type)}
                                                        </div>
                                                        <div className="flex gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleView(role)}
                                                                className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                                                                title="View Details"
                                                            >
                                                                <Eye size={15} />
                                                            </button>
                                                            {role.is_customizable && canManage && (
                                                                <button
                                                                    onClick={() => handleEdit(role)}
                                                                    className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                                    title="Edit Role"
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

                                                    <div className="space-y-1 mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-semibold text-gray-900 dark:text-white truncate" title={role.name}>
                                                                {role.name}
                                                            </h3>
                                                            <span className={cn(
                                                                "inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border transition-colors",
                                                                role.role_type === 'PLATFORM' ? "bg-red-50 text-red-600 border-red-100" :
                                                                    role.role_type === 'SYSTEM' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                                        "bg-gray-50 text-gray-600 border-gray-200"
                                                            )}>
                                                                {role.role_type}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 h-10 mb-4" title={role.description || ''}>
                                                        {role.description || 'No description provided.'}
                                                    </p>

                                                    <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
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
                            </div>
                        );
                    })}
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
