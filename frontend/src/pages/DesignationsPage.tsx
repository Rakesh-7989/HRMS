import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { designationService, Designation } from '@/services/designation.service';
import { CreateDesignationForm } from '@/components/forms/CreateDesignationForm';
import { Plus, Edit3, Trash2, Briefcase, Check, X, Search } from 'lucide-react';
import { useConfirm } from '@/contexts/ConfirmContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { showToast } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { PageTransition } from '@/components/ui/PageTransition';

export const DesignationsPage: React.FC = () => {
  const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { confirm } = useConfirm();
    const { hasPermission } = usePermissions();
    const canManage = hasPermission('designations', 'manage');
    const [createBit, setCreateBit] = useState(false); // Controls create dialog
    const [editItem, setEditItem] = useState<Designation | null>(null); // Controls edit dialog

    // Local state for search
    const [searchTerm, setSearchTerm] = useState('');

    // --------------------------------------------------------------------------
    // Data Fetching
    // --------------------------------------------------------------------------
    const { data: designations = [], isLoading } = useQuery({
        queryKey: ['designations'],
        queryFn: () => designationService.getDesignations(),
    });

    // Client-side filtering for search (since API search might be limited or we want instant feedback)
    const filteredDesignations = designations.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --------------------------------------------------------------------------
    // Mutations
    // --------------------------------------------------------------------------
    const deleteMutation = useMutation({
        mutationFn: (id: string) => designationService.deleteDesignation(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['designations'] });
            showToast.success(t('organization.designationDeleted'));
        },
        onError: (err: unknown) => {
            const backendMessage = (err as {response?: {data?: {message?: string}}}).response?.data?.message;
            const axiosMessage = (err as {message?: string}).message;
            showToast.error(backendMessage || `Error: ${axiosMessage}`);
        },
    });

    const toggleStatusMutation = useMutation({
        mutationFn: (item: Designation) =>
            designationService.updateDesignation(item.id, { is_active: !item.is_active }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['designations'] });
            showToast.success(`Designation ${!variables.is_active ? 'activated' : 'deactivated'} successfully`);
        },
        onError: (err: unknown) => {
            showToast.error((err as {response?: {data?: {message?: string}}}).response?.data?.message || (err as {message?: string}).message || 'Failed to update designation status');
        },
    });

    // --------------------------------------------------------------------------
    // Handlers
    // --------------------------------------------------------------------------
    const handleDelete = async (id: string) => {
        const result = await confirm({
            title: 'Delete Designation',
            message: 'Are you sure you want to delete this designation? \nThis action cannot be undone if employees are assigned to it.',
            type: 'destructive',
            confirmText: 'Delete Designation',
            cancelText: 'Cancel'
        });
        if (result) {
            deleteMutation.mutate(id);
        }
    };

    const handleEdit = (item: Designation) => {
        setEditItem(item); // this triggers the edit dialog because we pass open={!!editItem} logic or similar
    };


    return (
        <DashboardLayout
            title={t('organisation.designations')}
            breadcrumbs={[
                { label: t('common.breadcrumbs.dashboard'), href: '/dashboard/organization' },
                { label: 'Designations' },
            ]}
        >
            <PageTransition>
            <div className="space-y-6">

                {/* Top Actions & Stats */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Designations</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Manage job titles and roles across your organization.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative hidden sm:block">
                            <input
                                type="text"
                                placeholder="Search designations..."
                                className="pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none w-64 shadow-elev-1"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        </div>

                        {canManage && (
                            <Button onClick={() => setCreateBit(true)}>
                                <Plus className="mr-2" size={18} />
                                Add New Designation
                            </Button>
                        )}
                    </div>
                </div>

                {/* Mobile Search (visible only on small screens) */}
                <div className="relative sm:hidden">
                    <input
                        type="text"
                        placeholder="Search designations..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                </div>

                {/* Content Grid */}
                {isLoading ? (
                    <div className="h-64 flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500 mb-3"></div>
                        <p className="text-muted text-sm">Loading designations...</p>
                    </div>
                ) : filteredDesignations.length === 0 ? (
                    <Card className="py-16 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                            <Briefcase className="text-gray-400" size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                            {searchTerm ? 'No matching designations' : 'No designations yet'}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                            {searchTerm
                                ? `We couldn't find any designation matching "${searchTerm}".`
                                : "Create your first designation to structure your organization."}
                        </p>
                        {!searchTerm && canManage && (
                            <Button variant="outline" onClick={() => setCreateBit(true)}>
                                <Plus className="mr-2" size={16} />
                                Create Designation
                            </Button>
                        )}
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredDesignations.map((d) => (
                            <Card key={d.id} className="group hover:shadow-elev-3 transition-all duration-200 border-gray-200/60 dark:border-gray-700">
                                <div className="p-4" >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className={`p-2 rounded-lg ${d.is_active ? 'bg-brand-500/5 text-brand-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                                            <Briefcase size={20} />
                                        </div>
                                        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            {canManage && (<>
                                                 <Button variant="ghost" 
                                                    onClick={() => handleEdit(d)}
                                                    className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit3 size={15} />
                                                </Button>
                                                 <Button variant="ghost" 
                                                    onClick={() => toggleStatusMutation.mutate(d)}
                                                    className={`p-1.5 rounded-md transition-colors ${d.is_active ? 'text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                                                    title={d.is_active ? "Deactivate" : "Activate"}
                                                >
                                                    {d.is_active ? <X size={15} /> : <Check size={15} />}
                                                </Button>
                                                 <Button variant="ghost" 
                                                    onClick={() => handleDelete(d.id)}
                                                    className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={15} />
                                                </Button>
                                            </>)}
                                        </div>
                                    </div>

                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1" title={d.name}>{d.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 h-10 mb-3" title={d.description || ''}>
                                        {d.description || 'No description provided.'}
                                    </p>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 mt-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${d.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                            }`}>
                                            {d.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {/* Placeholder for employee count if available in future */}
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Create Dialog */}
                <CreateDesignationForm
                    open={createBit}
                    onOpenChange={setCreateBit}
                />

                {/* Edit Dialog */}
                {editItem && (
                    <CreateDesignationForm
                        open={!!editItem}
                        onOpenChange={(val) => !val && setEditItem(null)}
                        editDesignation={editItem}
                    />
                )}

            </div>
            </PageTransition>
        </DashboardLayout>
    );
};
