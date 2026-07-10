import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/Dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { getShifts, createShift, updateShift, deleteShift, assignShift, Shift } from '@/services/shift.service';
import { usersService } from '@/services/users.service';
import { Plus, Edit2, Trash2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export const ShiftsPage = () => {
  const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<Shift | null>(null);
    const [selectedShiftId, setSelectedShiftId] = useState<string>('');
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [assignToAll, setAssignToAll] = useState(false);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [shiftToDelete, setShiftToDelete] = useState<string | null>(null);

    const queryClient = useQueryClient();

    const { data: shifts, isLoading } = useQuery<Shift[]>({
        queryKey: ['shifts'],
        queryFn: getShifts
    });

    const { data: usersResponse } = useQuery({
        queryKey: ['users'],
        queryFn: () => usersService.getUsers({ limit: 1000 })
    });
    const employees = usersResponse?.data || [];

    const createMutation = useMutation({
        mutationFn: createShift,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            setIsModalOpen(false);
            toast.success('Shift created successfully');
        },
        onError: (error: any) => {
            const msg = error.response?.data?.message || 'Failed to create shift';
            toast.error(msg);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Shift> }) => updateShift(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            setIsModalOpen(false);
            setEditingShift(null);
            toast.success('Shift updated successfully');
        },
        onError: (error: any) => {
            const msg = error.response?.data?.message || 'Failed to update shift';
            toast.error(msg);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteShift,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            toast.success('Shift deleted successfully');
            setIsDeleteModalOpen(false);
            setShiftToDelete(null);
        },
        onError: (error: any) => {
            const msg = error.response?.data?.message || 'Failed to delete shift';
            toast.error(msg);
        }
    });

    const assignMutation = useMutation({
        mutationFn: (data: { shiftId: string; employeeIds: string[]; assignToAll: boolean }) =>
            assignShift(data.shiftId, data.employeeIds, data.assignToAll),
        onSuccess: (data: any) => {
            setIsAssignModalOpen(false);
            setSelectedEmployeeIds([]);
            setAssignToAll(false);
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            const count = data?.data?.updatedCount || data?.updatedCount || 'users';
            toast.success(`Shift assigned to ${count} successfully`);
        },
        onError: () => toast.error('Failed to assign shift')
    });

    const [formData, setFormData] = useState<{
        name: string;
        code: string;
        start_time: string;
        end_time: string;
        break_start_time: string;
        break_end_time: string;
        grace_period_minutes: number | string;
        work_hours: number | string;
        half_day_threshold_hours: number | string;
        overtime_enabled: boolean;
        week_offs: string[];
    }>({
        name: '',
        code: '',
        start_time: '',
        end_time: '',
        break_start_time: '',
        break_end_time: '',
        grace_period_minutes: 0,
        work_hours: 9.0,
        half_day_threshold_hours: 4.0,
        overtime_enabled: false,
        week_offs: []
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const submissionData = {
            ...formData,
            grace_period_minutes: Number(formData.grace_period_minutes) || 0,
            work_hours: Number(formData.work_hours) || 0,
            half_day_threshold_hours: Number(formData.half_day_threshold_hours) || 0
        };

        if (editingShift) {
            updateMutation.mutate({ id: editingShift.id, data: submissionData });
        } else {
            createMutation.mutate(submissionData);
        }
    };

    const handleEdit = (shift: Shift) => {
        setEditingShift(shift);
        setFormData({
            name: shift.name,
            code: shift.code || '',
            start_time: shift.start_time,
            end_time: shift.end_time,
            break_start_time: shift.break_start_time || '',
            break_end_time: shift.break_end_time || '',
            grace_period_minutes: shift.grace_period_minutes || 0,
            work_hours: shift.work_hours || 9.0,
            half_day_threshold_hours: shift.half_day_threshold_hours || 4.0,
            overtime_enabled: shift.overtime_enabled || false,
            week_offs: shift.week_offs || []
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setShiftToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (shiftToDelete) {
            deleteMutation.mutate(shiftToDelete);
        }
    };

    const handleAssignSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedShiftId) {
            toast.error('Please select a shift');
            return;
        }
        if (!assignToAll && selectedEmployeeIds.length === 0) {
            toast.error('Please select at least one employee');
            return;
        }
        assignMutation.mutate({
            shiftId: selectedShiftId,
            employeeIds: selectedEmployeeIds,
            assignToAll
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Shift Management</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsAssignModalOpen(true)}>
                        <UserPlus size={16} className="mr-2" /> Assign Shift
                    </Button>
                    <Button onClick={() => { setEditingShift(null); setIsModalOpen(true); }}>
                        <Plus size={16} className="mr-2" /> Add Shift
                    </Button>
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Timings</TableHead>
                            <TableHead>Break</TableHead>
                            <TableHead>Grace Period</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5}>{t('common.loading')}</TableCell></TableRow>
                        ) : shifts?.length === 0 ? (
                            <TableRow><TableCell colSpan={5}>No shifts found</TableCell></TableRow>
                        ) : shifts?.map((shift: Shift) => (
                            <TableRow key={shift.id}>
                                <TableCell>
                                    <div className="font-medium">{shift.name}</div>
                                    <div className="text-xs text-muted-foreground">{shift.code}</div>
                                </TableCell>
                                <TableCell>{shift.start_time} - {shift.end_time}</TableCell>
                                <TableCell>{shift.break_start_time ? `${shift.break_start_time} - ${shift.break_end_time}` : '-'}</TableCell>
                                <TableCell>{shift.grace_period_minutes} mins</TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(shift)}>
                                            <Edit2 size={16} />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(shift.id)}>
                                            <Trash2 size={16} className="text-red-500" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            {/* Create/Edit Shift Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingShift ? 'Edit Shift' : 'Create Shift'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Shift Name</Label>
                                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div>
                                <Label>Code</Label>
                                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Start Time</Label>
                                <Input type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} required />
                            </div>
                            <div>
                                <Label>End Time</Label>
                                <Input type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} required />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Break Start</Label>
                                <Input type="time" value={formData.break_start_time} onChange={(e) => setFormData({ ...formData, break_start_time: e.target.value })} />
                            </div>
                            <div>
                                <Label>Break End</Label>
                                <Input type="time" value={formData.break_end_time} onChange={(e) => setFormData({ ...formData, break_end_time: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <Label>Grace Period (Minutes)</Label>
                            <Input
                                type="number"
                                min={0}
                                value={formData.grace_period_minutes}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData({
                                        ...formData,
                                        grace_period_minutes: val === '' ? '' : parseInt(val)
                                    });
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Work Hours (Full Day)</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    value={formData.work_hours}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({
                                            ...formData,
                                            work_hours: val === '' ? '' : parseFloat(val)
                                        });
                                    }}
                                />
                            </div>
                            <div>
                                <Label>Half Day Threshold (Hours)</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    value={formData.half_day_threshold_hours}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({
                                            ...formData,
                                            half_day_threshold_hours: val === '' ? '' : parseFloat(val)
                                        });
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="ot_enabled"
                                checked={formData.overtime_enabled}
                                onChange={(e) => setFormData({ ...formData, overtime_enabled: e.target.checked })}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="ot_enabled">Enable Overtime Calculation</Label>
                        </div>

                        <div>
                            <Label className="mb-2 block">Week Offs</Label>
                            <div className="flex flex-wrap gap-2">
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                    <label key={day} className="flex items-center space-x-1 border px-2 py-1 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <input
                                            type="checkbox"
                                            checked={formData.week_offs.includes(day)}
                                            onChange={(e) => {
                                                const newWeekOffs = e.target.checked
                                                    ? [...formData.week_offs, day]
                                                    : formData.week_offs.filter(d => d !== day);
                                                setFormData({ ...formData, week_offs: newWeekOffs });
                                            }}
                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm">{day.slice(0, 3)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
                            <Button type="submit">{editingShift ? 'Update' : 'Create'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Assign Shift Modal */}
            <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign Shift</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAssignSubmit} className="space-y-4">
                        <div>
                            <Label>Select Shift</Label>
                            <select
                                className="w-full mt-1 border rounded-md p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                                value={selectedShiftId}
                                onChange={(e) => setSelectedShiftId(e.target.value)}
                                required
                            >
                                <option value="" className="dark:bg-gray-800">Select a shift...</option>
                                {shifts?.map((shift: Shift) => (
                                    <option key={shift.id} value={shift.id} className="dark:bg-gray-800">
                                        {shift.name} ({shift.start_time} - {shift.end_time})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <div className="flex items-center space-x-2 mb-2">
                                <input
                                    type="checkbox"
                                    id="assignAll"
                                    checked={assignToAll}
                                    onChange={(e) => setAssignToAll(e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                <Label htmlFor="assignAll">Assign to ALL employees</Label>
                            </div>

                            {!assignToAll && (
                                <div className="space-y-2">
                                    <Label>Select Employees</Label>
                                    <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
                                        {employees
                                            .filter((emp: any) => !['ADMIN'].includes(emp.role) && emp.employee_uuid)
                                            .map((emp: any) => (
                                                <div key={emp.id} className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`emp-${emp.id}`}
                                                        checked={selectedEmployeeIds.includes(emp.employee_uuid!)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedEmployeeIds([...selectedEmployeeIds, emp.employee_uuid!]);
                                                            } else {
                                                                setSelectedEmployeeIds(selectedEmployeeIds.filter(id => id !== emp.employee_uuid));
                                                            }
                                                        }}
                                                    />
                                                    <label htmlFor={`emp-${emp.id}`} className="text-sm cursor-pointer select-none">
                                                        {emp.first_name} {emp.last_name} ({emp.email})
                                                    </label>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={assignMutation.isPending}>
                                {assignMutation.isPending ? 'Assigning...' : 'Assign Shift'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Shift</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p>Are you sure you want to delete this shift? This action cannot be undone.</p>
                        <p className="text-sm text-yellow-600 mt-2 bg-yellow-50 p-2 rounded border border-yellow-200">
                            Note: You cannot delete a shift that is currently assigned to employees.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
