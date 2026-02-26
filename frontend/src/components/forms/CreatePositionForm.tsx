import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
// import { Select } from '@/components/ui/Select'; // Unused, using native select for now or replace with UI component

import { hierarchyService, HierarchyPosition } from '@/services/organization/hierarchy.service';
import { departmentService } from '@/services/organization/department.service';
import { showToast } from '@/utils/toast';

interface CreatePositionFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editPosition?: HierarchyPosition | null;
    parentPositionId?: string | null;
}

export const CreatePositionForm: React.FC<CreatePositionFormProps> = ({
    open,
    onOpenChange,
    editPosition,
    parentPositionId
}) => {
    const queryClient = useQueryClient();
    const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<HierarchyPosition>>();

    // Fetch departments for dropdown
    const { data: departments = [] } = useQuery({
        queryKey: ['departments'],
        queryFn: departmentService.getDepartments
    });

    useEffect(() => {
        if (open) {
            if (editPosition) {
                reset({
                    name: editPosition.name,
                    short_name: editPosition.short_name,
                    level: editPosition.level,
                    department_id: editPosition.department_id,
                    parent_position_id: editPosition.parent_position_id
                });
            } else {
                reset({
                    name: '',
                    short_name: '',
                    level: 1, // Default, will be overridden if parent exists? No, user sets it or backend logic? 
                    // Usually parent + 1. But let's let user set it for now or just name.
                    department_id: '',
                    parent_position_id: parentPositionId || null
                });
            }
        }
    }, [open, editPosition, parentPositionId, reset]);

    const mutation = useMutation({
        mutationFn: (data: Partial<HierarchyPosition>) => {
            if (editPosition) {
                return hierarchyService.updatePosition(editPosition.id, data);
            } else {
                return hierarchyService.createPosition(data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hierarchy-tree'] });
            showToast.success(editPosition ? 'Position updated' : 'Position created');
            onOpenChange(false);
        },
        onError: (err: any) => {
            showToast.error(err.response?.data?.message || 'Failed to save position');
        }
    });

    const onSubmit = (data: Partial<HierarchyPosition>) => {
        // Ensure level is number
        if (data.level) data.level = Number(data.level);
        mutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editPosition ? 'Edit Position' : 'Create New Position'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Position Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Senior Software Engineer"
                            {...register('name', { required: 'Name is required' })}
                        />
                        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="short_name">Short Code</Label>
                        <Input
                            id="short_name"
                            placeholder="e.g. SSE"
                            {...register('short_name')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="level">Level (1 = Highest)</Label>
                        <Input
                            id="level"
                            type="number"
                            min="1"
                            {...register('level', { required: 'Level is required', min: 1 })}
                        />
                    </div>

                    {!editPosition && parentPositionId && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-md text-sm">
                            Adding as child of selected position
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="department">Department (Optional)</Label>
                        <select
                            id="department"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...register('department_id')}
                        >
                            <option value="">No specific department</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Saving...' : 'Save Position'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
