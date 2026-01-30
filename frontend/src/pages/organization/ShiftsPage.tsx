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
import { usersService, User } from '@/services/users.service';
import { Plus, Edit2, Trash2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

export const ShiftsPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<Shift | null>(null);
    const [selectedShiftId, setSelectedShiftId] = useState<string>('');
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [assignToAll, setAssignToAll] = useState(false);

    const queryClient = useQueryClient();

    const { data: shifts, isLoading } = useQuery<Shift[]>({
        queryKey: ['shifts'],
        queryFn: getShifts
    });

    const { data: employees = [] } = useQuery<User[]>({
        queryKey: ['users'],
        queryFn: () => usersService.getUsers({ limit: 1000 })
    });

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
            const count = data?.data?.updatedCount || data?.updatedCount || 'users';
            toast.success(`Shift assigned to ${count} successfully`);
        },
        onError: () => toast.error('Failed to assign shift')
    });

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        start_time: '',
        end_time: '',
        break_start_time: '',
        break_end_time: '',
        grace_period_minutes: 0
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingShift) {
            updateMutation.mutate({ id: editingShift.id, data: formData });
        } else {
            createMutation.mutate(formData);
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
            grace_period_minutes: shift.grace_period_minutes || 0
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this shift?')) {
            deleteMutation.mutate(id);
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
                            <TableRow><TableCell colSpan={5}>Loading...</TableCell></TableRow>
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
                            <Input type="number" value={formData.grace_period_minutes} onChange={(e) => setFormData({ ...formData, grace_period_minutes: parseInt(e.target.value) || 0 })} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
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
                                className="w-full mt-1 border rounded-md p-2 bg-background"
                                value={selectedShiftId}
                                onChange={(e) => setSelectedShiftId(e.target.value)}
                                required
                            >
                                <option value="">Select a shift...</option>
                                {shifts?.map((shift: Shift) => (
                                    <option key={shift.id} value={shift.id}>
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
                                        {employees.map((emp: any) => (
                                            <div key={emp.id} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id={`emp-${emp.id}`}
                                                    checked={selectedEmployeeIds.includes(emp.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedEmployeeIds([...selectedEmployeeIds, emp.id]);
                                                        } else {
                                                            setSelectedEmployeeIds(selectedEmployeeIds.filter(id => id !== emp.id));
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
                            <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={assignMutation.isPending}>
                                {assignMutation.isPending ? 'Assigning...' : 'Assign Shift'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
