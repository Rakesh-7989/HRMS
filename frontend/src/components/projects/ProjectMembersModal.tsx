import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/Dialog';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui/Table';

import { projectsService } from '@/services/projects.service';
import { usersService } from '@/services/users.service';
import type { Project, ProjectMemberRole } from '@/types/project.types';

interface ProjectMembersModalProps {
    project: Project | null;
    isOpen: boolean;
    onClose: () => void;
    canManage: boolean;
}

export const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
    project,
    isOpen,
    onClose,
    canManage,
}) => {
    const queryClient = useQueryClient();
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedRole, setSelectedRole] = useState<ProjectMemberRole>('MEMBER');
    const [isAdding, setIsAdding] = useState(false);

    // Fetch project members
    const { data: members = [], isLoading: membersLoading } = useQuery({
        queryKey: ['project-members', project?.id],
        queryFn: () => projectsService.listProjectMembers(project!.id),
        enabled: !!project?.id && isOpen,
    });

    // Fetch all users/employees for dropdown - same pattern as TasksPage
    const { data: allEmployees = [] } = useQuery({
        queryKey: ['users-for-members'],
        queryFn: () => usersService.getUsers({ is_active: true }),
        enabled: isOpen,
    });

    // Filter out employees who are already members
    // Show all users (even those without employee_id) for debugging
    const availableEmployees = allEmployees.filter(
        emp => emp.employee_uuid && !members.some(m => m.employee_id === emp.employee_uuid)
    );

    // Add member mutation
    const addMemberMutation = useMutation({
        mutationFn: ({ projectId, employeeId, role }: { projectId: string; employeeId: string; role: string }) =>
            projectsService.addProjectMember(projectId, employeeId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project-members', project?.id] });
            setSelectedEmployee('');
            setSelectedRole('MEMBER');
            setIsAdding(false);
        },
        onError: (error: any) => {
            alert(error?.response?.data?.message || 'Failed to add member');
            setIsAdding(false);
        },
    });

    // Remove member mutation
    const removeMemberMutation = useMutation({
        mutationFn: ({ projectId, employeeId }: { projectId: string; employeeId: string }) =>
            projectsService.removeProjectMember(projectId, employeeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project-members', project?.id] });
        },
        onError: (error: any) => {
            alert(error?.response?.data?.message || 'Failed to remove member');
        },
    });

    const handleAddMember = () => {
        if (!selectedEmployee || !project) return;
        setIsAdding(true);
        addMemberMutation.mutate({
            projectId: project.id,
            employeeId: selectedEmployee,
            role: selectedRole,
        });
    };

    const handleRemoveMember = (employeeId: string) => {
        if (!project) return;
        if (!confirm('Are you sure you want to remove this member from the project?')) return;
        removeMemberMutation.mutate({
            projectId: project.id,
            employeeId,
        });
    };

    if (!project) return null;

    return (
        <Dialog
            open={isOpen}
            onOpenChange={onClose}
            title={`Project Members - ${project.name}`}
            description="Manage team members assigned to this project"
            className="max-w-2xl"
        >
            <DialogContent>
                {/* Add Member Section (ADMIN/HR only) */}
                {canManage && (
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg mb-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                            <UserPlus size={16} />
                            Add New Member
                        </h4>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <Label htmlFor="employee" className="sr-only">Select Employee</Label>
                                <select
                                    id="employee"
                                    value={selectedEmployee}
                                    onChange={(e) => setSelectedEmployee(e.target.value)}
                                    className="h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    <option value="">Select an employee...</option>
                                    {availableEmployees.map(emp => (
                                        <option key={emp.employee_uuid} value={emp.employee_uuid}>
                                            {emp.first_name} {emp.last_name} ({emp.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-full sm:w-32">
                                <Label htmlFor="role" className="sr-only">Role</Label>
                                <select
                                    id="role"
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value as ProjectMemberRole)}
                                    className="h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    <option value="MEMBER">Member</option>
                                    <option value="LEAD">Lead</option>
                                </select>
                            </div>
                            <Button
                                onClick={handleAddMember}
                                disabled={!selectedEmployee || isAdding}
                                className="w-full sm:w-auto"
                            >
                                {isAdding ? 'Adding...' : 'Add'}
                            </Button>
                        </div>
                        {availableEmployees.length === 0 && allEmployees.length > 0 && (
                            <p className="text-xs text-gray-500 mt-2">All employees are already members of this project.</p>
                        )}
                    </div>
                )}

                {/* Members List */}
                <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <Users size={16} />
                        Current Members ({members.length})
                    </h4>

                    {membersLoading ? (
                        <div className="text-center py-8 text-gray-500">Loading members...</div>
                    ) : members.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 dark:bg-gray-800/30 rounded-lg">
                            <Users size={40} className="mx-auto mb-2 opacity-50" />
                            <p>No members assigned to this project yet.</p>
                            {canManage && <p className="text-sm mt-1">Use the form above to add team members.</p>}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    {canManage && <TableHead className="w-16">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                                    {member.employee.first_name[0]}{member.employee.last_name[0]}
                                                </div>
                                                <span className="font-medium">
                                                    {member.employee.first_name} {member.employee.last_name}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-500">
                                            {member.employee.email}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${member.role === 'LEAD'
                                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                                }`}>
                                                {member.role}
                                            </span>
                                        </TableCell>
                                        {canManage && (
                                            <TableCell>
                                                <button
                                                    onClick={() => handleRemoveMember(member.employee_id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Remove member"
                                                    disabled={removeMemberMutation.isPending}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>

            <DialogFooter>
                <Button variant="ghost" onClick={onClose}>
                    Close
                </Button>
            </DialogFooter>
        </Dialog>
    );
};
