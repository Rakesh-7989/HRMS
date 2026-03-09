import React, { useState, useEffect, useCallback } from 'react';
import { permissionsService, Permission, TenantRole } from '@/services/permissions.service';
import { usersService } from '@/services/users.service';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import {
    Shield,
    Users,
    Clock,
    Calendar,
    Wallet,
    Building2,
    Package,
    FolderKanban,
    BarChart3,
    MessageSquare,
    CalendarRange,
    Activity,
    MapPin,
    Timer,
    Home,
    Receipt,
    FileText,
    CheckSquare,
    Gift,
    ChevronDown,
    ChevronRight,
    Search,
    Save,
    RotateCcw,
    User,
    Loader2,
    Plus,
    Trash2,
    X,
} from 'lucide-react';

const MODULE_ICONS: Record<string, React.ElementType> = {
    employees: Users,
    attendance: Clock,
    leave: Calendar,
    payroll: Wallet,
    departments: Building2,
    designations: Building2,
    assets: Package,
    projects: FolderKanban,
    reports: BarChart3,
    chat: MessageSquare,
    calendar: CalendarRange,
    organisation: Building2,
    roles: Shield,
    audit_logs: Activity,
    geo_fencing: MapPin,
    shifts: Timer,
    wfh: Home,
    expenses: Receipt,
    documents: FileText,
    tasks: CheckSquare,
    events: Gift,
};

const MODULE_LABELS: Record<string, string> = {
    employees: 'Employees',
    attendance: 'Attendance',
    leave: 'Leave Management',
    payroll: 'Payroll',
    departments: 'Departments',
    designations: 'Designations',
    assets: 'Asset Management',
    projects: 'Project Management',
    reports: 'Reports & Analytics',
    chat: 'Chat & Messaging',
    calendar: 'Calendar',
    organisation: 'Organisation',
    roles: 'Roles & Permissions',
    audit_logs: 'Audit Logs',
    geo_fencing: 'Geofencing',
    shifts: 'Shifts & Rostering',
    wfh: 'Work From Home',
    expenses: 'Expenses',
    documents: 'Documents',
    tasks: 'Tasks & Inbox',
    events: 'Events & Birthdays',
};

const ROLE_COLORS: Record<string, string> = {
    ADMIN: 'from-purple-500 to-indigo-600',
    HR: 'from-emerald-500 to-teal-600',
    MANAGER: 'from-amber-500 to-orange-600',
    EMPLOYEE: 'from-blue-500 to-cyan-600',
};

const DEFAULT_GRADIENT = 'from-rose-500 to-pink-600';

export const RolesPermissionsPage: React.FC = () => {
    const [roles, setRoles] = useState<TenantRole[]>([]);
    const [activeRole, setActiveRole] = useState<string>('');
    const [rolesLoading, setRolesLoading] = useState(true);
    const { user: currentUser } = useAuth();
    const isStandard = false; // Plan restrictions removed as per request

    // Usage state
    const [adminCount, setAdminCount] = useState(0);
    const adminLimit = 9999;

    // Permissions state
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [originalPermissions, setOriginalPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
    const [hasChanges, setHasChanges] = useState(false);

    // Add role dialog
    const [showAddRole, setShowAddRole] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDesc, setNewRoleDesc] = useState('');
    const [creating, setCreating] = useState(false);

    // User override state
    const [showUserOverrides, setShowUserOverrides] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [userPermissions, setUserPermissions] = useState<any[]>([]);
    const [userPermLoading, setUserPermLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);

    // ---- Fetch Roles ----
    const fetchRoles = useCallback(async () => {
        setRolesLoading(true);
        try {
            const r = await permissionsService.getTenantRoles();
            setRoles(r);
            if (r.length > 0 && !activeRole) {
                setActiveRole(r[0].role);
            }

            // Fetch admin count for usage display
            const users = await usersService.getUsers({ role: 'ADMIN' });
            setAdminCount(Array.isArray(users) ? users.length : 0);
        } catch (err: any) {
            toast.error('Failed to load roles');
        } finally {
            setRolesLoading(false);
        }
    }, [activeRole]);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    // ---- Fetch Permissions for active role ----
    const fetchRolePermissions = useCallback(async (role: string) => {
        if (!role) return;
        setLoading(true);
        try {
            const perms = await permissionsService.getRolePermissions(role);
            setPermissions(perms);
            setOriginalPermissions(JSON.parse(JSON.stringify(perms)));
            setHasChanges(false);
            const modules = new Set(perms.map(p => p.module));
            setExpandedModules(modules);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load permissions');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeRole) fetchRolePermissions(activeRole);
    }, [activeRole, fetchRolePermissions]);

    // ---- Permission toggles ----
    const handleTogglePermission = (permissionId: string) => {
        setPermissions(prev =>
            prev.map(p =>
                p.permission_id === permissionId ? { ...p, enabled: !p.enabled } : p
            )
        );
        setHasChanges(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const changed = permissions
                .filter((p, i) => p.enabled !== originalPermissions[i]?.enabled)
                .map(p => ({ permission_id: p.permission_id, enabled: p.enabled }));

            if (changed.length === 0) {
                toast('No changes to save');
                setSaving(false);
                return;
            }

            await permissionsService.updateRolePermissions(activeRole, changed);
            setOriginalPermissions(JSON.parse(JSON.stringify(permissions)));
            setHasChanges(false);
            toast.success(`Permissions updated for ${activeRole} role`);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save permissions');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setPermissions(JSON.parse(JSON.stringify(originalPermissions)));
        setHasChanges(false);
    };

    const toggleModule = (module: string) => {
        setExpandedModules(prev => {
            const next = new Set(prev);
            if (next.has(module)) next.delete(module);
            else next.add(module);
            return next;
        });
    };

    const toggleAllInModule = (module: string, enabled: boolean) => {
        setPermissions(prev =>
            prev.map(p => (p.module === module ? { ...p, enabled } : p))
        );
        setHasChanges(true);
    };

    // Group permissions by module
    const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
        if (!acc[p.module]) acc[p.module] = [];
        acc[p.module].push(p);
        return acc;
    }, {});

    // ---- Create Custom Role ----
    const handleCreateRole = async () => {
        if (!newRoleName.trim()) return;
        setCreating(true);
        try {
            await permissionsService.createCustomRole(newRoleName.trim(), newRoleDesc.trim());
            toast.success(`Role "${newRoleName.trim().toUpperCase()}" created`);
            setShowAddRole(false);
            setNewRoleName('');
            setNewRoleDesc('');
            await fetchRoles();
            // Switch to the new role
            setActiveRole(newRoleName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'));
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to create role');
        } finally {
            setCreating(false);
        }
    };

    // ---- Delete Custom Role ----
    const handleDeleteRole = async (role: string) => {
        if (!confirm(`Are you sure you want to delete the "${role}" role? This cannot be undone.`)) return;
        try {
            await permissionsService.deleteCustomRole(role);
            toast.success(`Role "${role}" deleted`);
            await fetchRoles();
            if (activeRole === role) {
                setActiveRole('ADMIN');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to delete role');
        }
    };

    // ---- User Override Logic ----
    const searchUsers = useCallback(async (query: string) => {
        if (query.length < 2) {
            setUserSearchResults([]);
            return;
        }
        setSearchLoading(true);
        try {
            const res = await usersService.getUsers({ search: query, limit: 10 });
            setUserSearchResults(Array.isArray(res) ? res : []);
        } catch {
            setUserSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (userSearchQuery) searchUsers(userSearchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [userSearchQuery, searchUsers]);

    const selectUserForOverride = async (usr: any) => {
        setSelectedUser(usr);
        setUserSearchQuery('');
        setUserSearchResults([]);
        setUserPermLoading(true);
        try {
            const perms = await permissionsService.getUserPermissions(usr.user_id || usr.id);
            setUserPermissions(perms);
        } catch {
            toast.error('Failed to load user permissions');
        } finally {
            setUserPermLoading(false);
        }
    };

    const handleUserOverrideToggle = async (permissionId: string, currentOverride: boolean | null, roleEnabled: boolean) => {
        if (!selectedUser) return;
        const userId = selectedUser.user_id || selectedUser.id;
        let newGranted: boolean | null;
        if (currentOverride === null) {
            newGranted = !roleEnabled;
        } else {
            newGranted = null;
        }
        try {
            await permissionsService.updateUserPermissions(userId, [
                { permission_id: permissionId, granted: newGranted }
            ]);
            const perms = await permissionsService.getUserPermissions(userId);
            setUserPermissions(perms);
            toast.success('User permission updated');
        } catch {
            toast.error('Failed to update user permission');
        }
    };

    if (rolesLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Role Cards */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Roles</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowUserOverrides(!showUserOverrides)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${showUserOverrides
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            <User className="h-4 w-4" />
                            <span className="hidden sm:inline">User Overrides</span>
                        </button>
                        <button
                            onClick={() => {
                                setShowAddRole(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white shadow-md transition-all bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                        >
                            <Plus className="h-4 w-4" />
                            Add Role
                        </button>
                    </div>
                </div>

                {/* Admin Usage Indicator */}
                <div className="mb-6 flex flex-wrap gap-4">
                    <div className="bg-white dark:bg-gray-800 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${adminCount >= adminLimit ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-600'}`}>
                            <Users className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Admin Seats</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {adminCount} <span className="text-gray-400 font-medium">/ {adminLimit === 9999 ? '∞' : adminLimit}</span>
                            </p>
                        </div>
                        {adminCount >= adminLimit && adminLimit !== 9999 && (
                            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">LIMIT REACHED</span>
                        )}
                    </div>

                    <div className="bg-white dark:bg-gray-800 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isStandard ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                            <Shield className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Plan Access</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {currentUser?.plan_type === 1 ? 'Standard (Trial)' : (currentUser?.plan_type === 2 ? 'Premium' : 'Elite')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    {roles.map(r => (
                        <div
                            key={r.role}
                            onClick={() => setActiveRole(r.role)}
                            className={`relative group px-5 py-3 rounded-xl transition-all duration-200 text-left min-w-[140px] cursor-pointer ${activeRole === r.role
                                ? 'ring-2 ring-purple-500 shadow-lg scale-[1.02]'
                                : 'hover:shadow-md hover:scale-[1.01]'
                                }`}
                        >
                            <div
                                className={`absolute inset-0 rounded-xl bg-gradient-to-br ${ROLE_COLORS[r.role] || DEFAULT_GRADIENT} ${activeRole === r.role ? 'opacity-100' : 'opacity-75'
                                    }`}
                            />
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <h3 className="text-white font-bold text-sm">{r.role}</h3>
                                    {r.description && (
                                        <p className="text-white/70 text-[10px] mt-0.5 line-clamp-1 max-w-[120px]">
                                            {r.description}
                                        </p>
                                    )}
                                </div>
                                {!r.is_system && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteRole(r.role);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 ml-2 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-all"
                                        title="Delete role"
                                    >
                                        <Trash2 className="h-3 w-3 text-white" />
                                    </button>
                                )}
                            </div>
                            {r.is_system && (
                                <div className="relative z-10 mt-1">
                                    <span className="text-[9px] text-white/50 uppercase tracking-wider">System</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Add Role Modal */}
            {showAddRole && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Custom Role</h3>
                            <button onClick={() => setShowAddRole(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role Name *</label>
                                <input
                                    type="text"
                                    value={newRoleName}
                                    onChange={e => setNewRoleName(e.target.value)}
                                    placeholder="e.g. TEAM_LEAD, FINANCE, INTERN"
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                                <p className="text-xs text-gray-400 mt-1">Will be converted to UPPERCASE with underscores</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={newRoleDesc}
                                    onChange={e => setNewRoleDesc(e.target.value)}
                                    placeholder="Brief description of this role"
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <button
                                onClick={() => setShowAddRole(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateRole}
                                disabled={creating || !newRoleName.trim()}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-md disabled:opacity-50"
                            >
                                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Create Role
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Bar */}
            {hasChanges && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">You have unsaved changes for {activeRole}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-md transition-all disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            Save Changes
                        </button>
                    </div>
                </div>
            )}

            <div className={`grid grid-cols-1 ${showUserOverrides ? 'lg:grid-cols-3' : ''} gap-6`}>
                {/* Permissions Grid */}
                <div className={showUserOverrides ? 'lg:col-span-2' : ''}>
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                        </div>
                    ) : activeRole ? (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Permissions for {activeRole}
                            </h3>
                            {Object.entries(grouped).map(([module, perms]) => {
                                const ModIcon = MODULE_ICONS[module] || Shield;
                                const allEnabled = perms.every(p => p.enabled);
                                const someEnabled = perms.some(p => p.enabled);
                                const expanded = expandedModules.has(module);

                                return (
                                    <div
                                        key={module}
                                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
                                    >
                                        {/* Module Header */}
                                        <div
                                            className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                            onClick={() => toggleModule(module)}
                                        >
                                            <div className="flex items-center gap-3">
                                                {expanded
                                                    ? <ChevronDown className="h-4 w-4 text-gray-400" />
                                                    : <ChevronRight className="h-4 w-4 text-gray-400" />}
                                                <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg">
                                                    <ModIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                                                        {MODULE_LABELS[module] || module}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {perms.filter(p => p.enabled).length} of {perms.length} enabled
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleAllInModule(module, !allEnabled);
                                                }}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${allEnabled
                                                    ? 'bg-purple-500'
                                                    : someEnabled
                                                        ? 'bg-purple-300'
                                                        : 'bg-gray-300 dark:bg-gray-600'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${allEnabled ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Permission Items */}
                                        {expanded && (
                                            <div className="border-t border-gray-100 dark:border-gray-700">
                                                {perms.map(perm => (
                                                    <div
                                                        key={perm.permission_id}
                                                        className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                                    >
                                                        <div className="ml-7">
                                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{perm.label}</p>
                                                            {perm.description && (
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{perm.description}</p>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => handleTogglePermission(perm.permission_id)}
                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${perm.enabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                                                                }`}
                                                        >
                                                            <span
                                                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${perm.enabled ? 'translate-x-6' : 'translate-x-1'
                                                                    }`}
                                                            />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-gray-500">Select a role to manage permissions</div>
                    )}
                </div>

                {/* User Overrides Panel */}
                {showUserOverrides && (
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm sticky top-6">
                            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <User className="h-4 w-4 text-purple-500" />
                                    User Permission Overrides
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Grant or deny specific permissions to individual users
                                </p>
                            </div>

                            <div className="p-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={userSearchQuery}
                                        onChange={e => setUserSearchQuery(e.target.value)}
                                        placeholder="Search employee by name..."
                                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                                    />
                                    {searchLoading && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                                    )}
                                </div>

                                {userSearchResults.length > 0 && (
                                    <div className="mt-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {userSearchResults.map((usr: any) => (
                                            <button
                                                key={usr.user_id || usr.id}
                                                onClick={() => selectUserForOverride(usr)}
                                                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                    {(usr.first_name || 'U')[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{usr.first_name} {usr.last_name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{usr.email} · {usr.role}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedUser && (
                                <div className="border-t border-gray-200 dark:border-gray-700">
                                    <div className="px-4 py-3 bg-purple-50 dark:bg-purple-900/20 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {(selectedUser.first_name || 'U')[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedUser.first_name} {selectedUser.last_name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Role: {selectedUser.role}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setSelectedUser(null); setUserPermissions([]); }}
                                            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                        >
                                            Clear
                                        </button>
                                    </div>

                                    {userPermLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                                        </div>
                                    ) : (
                                        <div className="max-h-[50vh] overflow-y-auto">
                                            {userPermissions.map((perm: any) => {
                                                const hasOverride = perm.user_override !== null && perm.user_override !== undefined;
                                                return (
                                                    <div
                                                        key={perm.permission_id}
                                                        className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0 ${hasOverride ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                                                            }`}
                                                    >
                                                        <div className="flex-1 min-w-0 pr-2">
                                                            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{perm.label}</p>
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${perm.role_enabled
                                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                    }`}>
                                                                    Role: {perm.role_enabled ? 'ON' : 'OFF'}
                                                                </span>
                                                                {hasOverride && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                                        Override: {perm.user_override ? 'Grant' : 'Deny'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleUserOverrideToggle(perm.permission_id, perm.user_override ?? null, perm.role_enabled)}
                                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${perm.effective
                                                                ? hasOverride ? 'bg-amber-500' : 'bg-purple-500'
                                                                : hasOverride ? 'bg-red-400' : 'bg-gray-300 dark:bg-gray-600'
                                                                }`}
                                                        >
                                                            <span
                                                                className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
                                                                style={{ transform: `translateX(${perm.effective ? '18px' : '2px'})` }}
                                                            />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RolesPermissionsPage;
