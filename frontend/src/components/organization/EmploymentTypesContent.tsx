import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { adminService } from '@/services/admin.service';
import { Plus, Trash2, Briefcase, Search, Loader2 } from 'lucide-react';
import { showToast } from '@/utils/toast';
import { usePermission } from '@/contexts/PermissionContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

export const EmploymentTypesContent: React.FC = () => {
    const { hasPermission } = usePermission();
    const canManage = hasPermission('manage_roles');
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newType, setNewType] = useState('');

    const { data: profile, isLoading } = useQuery({
        queryKey: ['tenant-profile'],
        queryFn: () => adminService.getTenantProfile(),
    });

    const employmentTypes = profile?.settings?.employment_types || ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMP'];

    const filteredTypes = employmentTypes.filter(type =>
        type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const updateMutation = useMutation({
        mutationFn: (newTypes: string[]) => adminService.updateTenantProfile({
            settings: { ...profile?.settings, employment_types: newTypes }
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tenant-profile'] });
            setIsAddModalOpen(false);
            setNewType('');
            showToast.success('Employment types updated successfully');
        },
        onError: (err: any) => {
            showToast.error(err.response?.data?.message || 'Failed to update employment types');
        }
    });

    const handleAdd = () => {
        if (!newType.trim()) return;
        const formatted = newType.trim().toUpperCase().replace(/\s+/g, '_');
        if (employmentTypes.includes(formatted)) {
            showToast.error('This employment type already exists');
            return;
        }
        updateMutation.mutate([...employmentTypes, formatted]);
    };

    const handleRemove = (typeToRemove: string) => {
        const newTypes = employmentTypes.filter(t => t !== typeToRemove);
        updateMutation.mutate(newTypes);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Employment Types</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Configure the types of employment available in your organization.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative hidden sm:block">
                        <input
                            type="text"
                            placeholder="Search types..."
                            className="pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none w-64 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    </div>

                    {canManage && (
                        <Button onClick={() => setIsAddModalOpen(true)}>
                            <Plus className="mr-2" size={18} />
                            Add Type
                        </Button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="h-64 flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-primary mb-3" size={32} />
                    <p className="text-muted text-sm">Loading types...</p>
                </div>
            ) : filteredTypes.length === 0 ? (
                <Card className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                        <Briefcase className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        {searchTerm ? 'No matching types' : 'No employment types'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                        {searchTerm
                            ? `We couldn't find any employment type matching "${searchTerm}".`
                            : "Configure your organization's employment types to get started."}
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredTypes.map((type) => (
                        <Card key={type} className="group hover:shadow-md transition-all duration-200 border-gray-200/60 dark:border-gray-700">
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="p-2 rounded-lg bg-primary/5 text-primary">
                                        <Briefcase size={20} />
                                    </div>
                                    {canManage && (
                                        <button
                                            onClick={() => handleRemove(type)}
                                            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                            title="Delete"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                    {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('-')}
                                </h3>
                                <p className="text-xs text-muted font-mono">{type}</p>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Employment Type</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="typeName">Type Name</Label>
                            <Input
                                id="typeName"
                                placeholder="e.g. Intern, Freelance"
                                value={newType}
                                onChange={(e) => setNewType(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                            />
                            <p className="text-[10px] text-muted italic">
                                Will be formatted as {newType.trim().toUpperCase().replace(/\s+/g, '_') || 'UPPER_CASE'}
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleAdd} isLoading={updateMutation.isPending}>Add Type</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
