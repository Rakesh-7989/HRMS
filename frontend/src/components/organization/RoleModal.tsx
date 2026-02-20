import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '@/components/ui/Dialog';
import { rbacService, Role } from '@/services/rbac.service';
import { showToast } from '@/utils/toast';
import { Search, Shield, ChevronDown, Check, Loader2, X, Building2, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';

interface RoleModalProps {
    open: boolean;
    onClose: () => void;
    editRole?: Role;
    isViewOnly?: boolean;
}

export const RoleModal: React.FC<RoleModalProps> = ({ open, onClose, editRole, isViewOnly = false }) => {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    // --------------------------------------------------------------------------
    // Data Fetching
    // --------------------------------------------------------------------------
    const { data: groupedPermissions = {}, isLoading: permsLoading } = useQuery<Record<string, any[]>>({
        queryKey: ['permissions'],
        queryFn: () => rbacService.getAllPermissions(),
        enabled: open
    });

    // Fetch full role detail (with permissions) if editing
    const { data: roleDetail, isLoading: roleLoading } = useQuery({
        queryKey: ['role', editRole?.id],
        queryFn: () => rbacService.getRole(editRole!.id),
        enabled: open && !!editRole?.id,
    });

    // Initial load for edit
    useEffect(() => {
        if (open) {
            if (editRole) {
                setName(roleDetail?.name || editRole.name);
                setDescription(roleDetail?.description || editRole.description || '');
                const permIds = roleDetail?.permissions?.map(p => p.id) || editRole.permissions?.map(p => p.id) || [];
                setSelectedPermissions(new Set(permIds));
            } else {
                setName('');
                setDescription('');
                setSelectedPermissions(new Set());
            }
            setSearchTerm('');
        }
    }, [open, editRole, roleDetail]);

    // --------------------------------------------------------------------------
    // Mutations
    // --------------------------------------------------------------------------
    const mutation = useMutation({
        mutationFn: (payload: any) =>
            editRole
                ? rbacService.updateRole(editRole.id, payload)
                : rbacService.createRole(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            showToast.success(`Role ${editRole ? 'updated' : 'created'} successfully`);
            onClose();
        },
        onError: (err: any) => {
            showToast.error(err.message || `Failed to ${editRole ? 'update' : 'create'} role`);
        }
    });

    // --------------------------------------------------------------------------
    // Handlers
    // --------------------------------------------------------------------------
    const togglePermission = (id: string) => {
        if (isViewOnly) return;
        setSelectedPermissions(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleExpand = (cat: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        mutation.mutate({
            name,
            description,
            permissionIds: Array.from(selectedPermissions)
        });
    };

    const filteredGrouped = useMemo(() => {
        if (!searchTerm) return groupedPermissions;
        const lower = searchTerm.toLowerCase();
        const result: Record<string, any[]> = {};
        Object.entries(groupedPermissions).forEach(([cat, perms]) => {
            const matches = perms.filter(p =>
                p.name.toLowerCase().includes(lower) ||
                (p.description && p.description.toLowerCase().includes(lower))
            );
            if (matches.length > 0) result[cat] = matches;
        });
        return result;
    }, [searchTerm, groupedPermissions]);

    const allPermissionIds = useMemo(() => {
        return Object.values(groupedPermissions).flat().map(p => p.id);
    }, [groupedPermissions]);

    const isAllSelected = useMemo(() => {
        return allPermissionIds.length > 0 && allPermissionIds.every(id => selectedPermissions.has(id));
    }, [allPermissionIds, selectedPermissions]);

    const toggleAll = () => {
        if (isViewOnly) return;
        if (isAllSelected) {
            setSelectedPermissions(new Set());
        } else {
            setSelectedPermissions(new Set(allPermissionIds));
        }
    };

    const toggleCategory = (catPerms: any[]) => {
        if (isViewOnly) return;
        const catIds = catPerms.map(p => p.id);
        const isCatAllSelected = catIds.every(id => selectedPermissions.has(id));

        setSelectedPermissions(prev => {
            const next = new Set(prev);
            if (isCatAllSelected) {
                catIds.forEach(id => next.delete(id));
            } else {
                catIds.forEach(id => next.add(id));
            }
            return next;
        });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={onClose}
            className="max-w-[1400px] w-[98vw] max-h-[95vh] p-0 overflow-hidden"
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[95vh] min-h-0 bg-slate-50 dark:bg-[#0f172a]">
                {/* Header */}
                <div className="shrink-0 relative overflow-hidden p-8 border-b border-white/10 dark:border-white/5"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)' }}
                >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <div className="absolute inset-0" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        }} />
                    </div>

                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">
                                {isViewOnly ? 'View Role' : editRole ? 'Edit Role' : 'Create Role'}
                            </h2>
                            <p className="text-xs font-bold text-white/70 mt-1 uppercase tracking-widest leading-none">
                                {isViewOnly ? 'Review permissions and access levels' : 'Define permissions and access levels'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-3 bg-black/20 hover:bg-black/30 backdrop-blur-md rounded-[1.25rem] transition-all text-white/80 hover:text-white border border-white/10"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {roleLoading ? (
                        <div className="py-20 text-center">
                            <Loader2 size={32} className="mx-auto text-primary animate-spin mb-4" />
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading role details...</p>
                        </div>
                    ) : (
                        <>
                            {/* Basic Info Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-b border-slate-200 dark:border-white/5">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-400 ml-1">Role Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white dark:bg-[#111827]/60 border border-slate-200 dark:border-white/5 rounded-[1.5rem] px-6 py-4 text-slate-900 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all disabled:opacity-50"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Project Manager"
                                        required
                                        disabled={isViewOnly}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-400 ml-1">Description</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white dark:bg-[#111827]/60 border border-slate-200 dark:border-white/5 rounded-[1.5rem] px-6 py-4 text-slate-900 dark:text-white font-bold placeholder:text-slate-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all disabled:opacity-50"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Briefly describe this role's purpose"
                                        disabled={isViewOnly}
                                    />
                                </div>
                            </div>

                            {/* Permissions Section */}
                            <div className="space-y-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                            <Shield size={28} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase flex items-center gap-3">
                                                Permissions
                                            </h3>
                                            <div className="flex items-center gap-4 mt-1">
                                                <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                                                    {selectedPermissions.size} Active
                                                </span>
                                                {allPermissionIds.length > 0 && !isViewOnly && (
                                                    <label className="flex items-center gap-2 cursor-pointer group">
                                                        <div className="relative flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only"
                                                                checked={isAllSelected}
                                                                onChange={toggleAll}
                                                            />
                                                            <div className={cn(
                                                                'w-4 h-4 rounded-lg border flex items-center justify-center transition-all',
                                                                isAllSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-gray-600 bg-white dark:bg-white/5'
                                                            )}>
                                                                {isAllSelected && <Check size={10} className="text-white fill-current stroke-[4]" />}
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-400 group-hover:text-indigo-600 transition-colors">Select All</span>
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative w-full md:w-80 group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Search permissions..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-12 pr-6 py-4 text-sm bg-white dark:bg-[#111827]/60 border border-slate-200 dark:border-white/5 rounded-[1.5rem] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                        />
                                    </div>
                                </div>
                                {permsLoading ? (
                                    <div className="py-20 text-center">
                                        <div className="inline-block animate-spin size-6 border-2 border-primary border-t-transparent rounded-full mb-3" />
                                        <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Loading permissions...</p>
                                    </div>
                                ) : Object.keys(filteredGrouped).length === 0 && searchTerm ? (
                                    <div className="py-20 text-center bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5">
                                        <Search size={32} className="mx-auto text-gray-400 dark:text-gray-600 mb-4 opacity-20" />
                                        <p className="text-gray-500 dark:text-gray-400 font-bold">No permissions found matching "{searchTerm}"</p>
                                        <button
                                            type="button"
                                            onClick={() => setSearchTerm('')}
                                            className="mt-4 text-primary text-xs font-black uppercase tracking-widest hover:underline"
                                        >
                                            Clear Search
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-6">
                                        {Object.entries(filteredGrouped).map(([category, perms]) => (
                                            <div
                                                key={category}
                                                className="bg-white dark:bg-[#111827]/60 rounded-[2rem] border border-slate-100 dark:border-white/5 overflow-hidden transition-all"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpand(category)}
                                                    className="w-full px-6 py-4 flex items-center justify-between group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleCategory(perms);
                                                            }}
                                                            className="relative flex items-center mr-1"
                                                        >
                                                            {(() => {
                                                                const catIds = perms.map(p => p.id);
                                                                const selectedInCat = catIds.filter(id => selectedPermissions.has(id)).length;
                                                                const isAllInCatSelected = selectedInCat === catIds.length;
                                                                const isSomeInCatSelected = selectedInCat > 0 && selectedInCat < catIds.length;

                                                                return (
                                                                    <div className={cn(
                                                                        'w-5 h-5 rounded-lg border flex items-center justify-center transition-all',
                                                                        isAllInCatSelected || isSomeInCatSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-200 dark:border-gray-600 bg-white dark:bg-white/5'
                                                                    )}>
                                                                        {isAllInCatSelected && <Check size={12} className="text-white fill-current stroke-[4]" />}
                                                                        {isSomeInCatSelected && <Minus size={12} className="text-white stroke-[4]" />}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>

                                                        <div className="w-14 h-14 rounded-2xl bg-indigo-50/50 dark:bg-slate-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-white/5">
                                                            <Building2 size={28} />
                                                        </div>
                                                        <div className="flex flex-col text-left">
                                                            <span className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg leading-tight">
                                                                {category}
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
                                                                {perms.filter(p => selectedPermissions.has(p.id)).length}/{perms.length} Permissions
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        'p-2 rounded-xl transition-all',
                                                        expandedCategories.has(category) ? 'bg-indigo-500 text-white' : 'bg-slate-50 text-slate-400'
                                                    )}>
                                                        <ChevronDown
                                                            size={20}
                                                            className={cn('transition-all', expandedCategories.has(category) ? 'rotate-180' : '')}
                                                        />
                                                    </div>
                                                </button>

                                                {expandedCategories.has(category) && (
                                                    <div className="p-8 pt-0">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
                                                            {perms.map((permission) => {
                                                                const isSelected = selectedPermissions.has(permission.id);
                                                                return (
                                                                    <label
                                                                        key={permission.id}
                                                                        className={cn(
                                                                            'relative flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer group',
                                                                            isSelected
                                                                                ? 'bg-gradient-to-br from-indigo-600 to-purple-600 border-none'
                                                                                : 'bg-white border-slate-100 hover:border-indigo-500/20'
                                                                        )}
                                                                    >
                                                                        <div className="relative flex items-center">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="sr-only"
                                                                                checked={isSelected}
                                                                                onChange={() => togglePermission(permission.id)}
                                                                            />
                                                                            <div className={cn(
                                                                                'w-5 h-5 rounded-lg border flex items-center justify-center transition-all',
                                                                                isSelected ? 'bg-white/20 border-white/40' : 'border-slate-200 bg-white'
                                                                            )}>
                                                                                {isSelected && <Check size={12} className="text-white fill-current stroke-[4]" />}
                                                                            </div>
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className={cn(
                                                                                'text-xs font-black uppercase tracking-tight truncate',
                                                                                isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-200 group-hover:text-indigo-600'
                                                                            )}>
                                                                                {permission.name}
                                                                            </p>
                                                                            <p className={cn(
                                                                                'text-[9px] font-bold truncate',
                                                                                isSelected ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'
                                                                            )}>
                                                                                {permission.description}
                                                                            </p>
                                                                        </div>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="shrink-0 p-8 border-t border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-4 rounded-[1.5rem] border-2 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-95"
                        disabled={mutation.isPending}
                    >
                        {isViewOnly ? 'Close' : 'Cancel'}
                    </button>
                    {!isViewOnly && (
                        <button
                            type="submit"
                            disabled={mutation.isPending || !name.trim()}
                            className="px-10 py-4 rounded-[1.5rem] bg-gradient-to-r from-indigo-600 to-purple-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-3"
                        >
                            {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
                            {mutation.isPending ? 'Saving...' : editRole ? 'Update Role' : 'Create Role'}
                        </button>
                    )}
                </div>
            </form>
        </Dialog >
    );
};
