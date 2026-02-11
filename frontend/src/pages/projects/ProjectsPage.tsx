import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FolderKanban, Edit, Calendar, List, BarChart3, Users, Trash2, Clock } from 'lucide-react';
import { showToast } from '@/utils/toast';
import { format } from 'date-fns';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui/Table';
import {
    Dialog,
    DialogContent,
    DialogFooter,
} from '@/components/ui/Dialog';
import { StatusBadge } from '@/components/projects/StatusBadge';
import { ProjectReports } from '@/components/projects/ProjectReports';
import { ProjectMembersModal } from '@/components/projects/ProjectMembersModal';
import { TimesheetContent } from '@/components/payroll/TimesheetContent';

import { projectsService } from '@/services/projects.service';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';
import type { Project, ProjectStatus } from '@/types/project.types';

export const ProjectsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'list' | 'reports' | 'timesheets'>('list');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [clientFilter, setClientFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'All'>('All');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Members Modal State
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [selectedProjectForMembers, setSelectedProjectForMembers] = useState<Project | null>(null);

    const handleOpenMembersModal = (project: Project) => {
        setSelectedProjectForMembers(project);
        setIsMembersModalOpen(true);
    };

    const handleCloseMembersModal = () => {
        setSelectedProjectForMembers(null);
        setIsMembersModalOpen(false);
    };

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        client_id: '',
        start_date: '',
        end_date: '',
        status: 'PLANNING' as ProjectStatus,
        description: '',
        budget: '',
    });

    const canManage = ['ADMIN', 'MANAGER'].includes(user?.role || '');

    // Fetch Projects
    const { data: projects = [], isLoading: projectsLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsService.getProjects(),
    });

    // Fetch Clients for Dropdown
    const { data: clients = [] } = useQuery({
        queryKey: ['clients'],
        queryFn: projectsService.getClients,
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: projectsService.createProject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            showToast.success('Project created successfully');
            handleCloseModal();
        },
        onError: (error: any) => {
            setIsSubmitting(false);
            showToast.error(error.response?.data?.message || 'Failed to create project');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            projectsService.updateProject(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            showToast.success('Project updated successfully');
            handleCloseModal();
        },
        onError: (error: any) => {
            setIsSubmitting(false);
            showToast.error(error.response?.data?.message || 'Failed to update project');
        },
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: projectsService.deleteProject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            showToast.success('Project deleted successfully');
            setProjectToDelete(null);
        },
        onError: (error: any) => {
            showToast.error(error.response?.data?.message || 'Failed to delete project. It may have linked tasks.');
            setProjectToDelete(null);
        },
    });

    // Delete confirmation state
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

    // Handlers
    const handleOpenCreateModal = () => {
        setEditingProject(null);
        setFormData({
            name: '',
            client_id: '',
            start_date: '',
            end_date: '',
            status: 'PLANNING',
            description: '',
            budget: '',
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (project: Project) => {
        setEditingProject(project);
        setFormData({
            name: project.name,
            client_id: project.client_id,
            start_date: project.start_date.split('T')[0], // Format for date input
            end_date: project.end_date.split('T')[0],
            status: project.status,
            description: project.description || '',
            budget: project.budget?.toString() || '',
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsSubmitting(false);
        setEditingProject(null);
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Date validation
        if (new Date(formData.end_date) < new Date(formData.start_date)) {
            showToast.error('End date cannot be earlier than start date');
            return;
        }

        setIsSubmitting(true);

        const submissionData = {
            ...formData,
            budget: formData.budget ? parseFloat(formData.budget) : undefined,
        };

        if (editingProject) {
            updateMutation.mutate({ id: editingProject.id, data: submissionData });
        } else {
            createMutation.mutate(submissionData as any);
        }
    };

    const filteredProjects = projects.filter((project) => {
        const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClient = clientFilter === 'All' || project.client_id === clientFilter;
        const matchesStatus = statusFilter === 'All' || project.status === statusFilter;
        return matchesSearch && matchesClient && matchesStatus;
    });

    return (
        <DashboardLayout
            title="Projects"
            breadcrumbs={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Projects' },
            ]}
        >
            <div className="space-y-6">
                {/* Tabs & Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('list')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
                                activeTab === 'list'
                                    ? "bg-primary/10 text-primary"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                        >
                            <List size={16} />
                            List
                        </button>
                        {canManage && (
                            <button
                                onClick={() => setActiveTab('reports')}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
                                    activeTab === 'reports'
                                        ? "bg-primary/10 text-primary"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                )}
                            >
                                <BarChart3 size={16} />
                                Reports
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('timesheets')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
                                activeTab === 'timesheets'
                                    ? "bg-primary/10 text-primary"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                        >
                            <Clock size={16} />
                            Timesheets
                        </button>
                    </div>

                    {activeTab === 'list' && (
                        <div className="flex items-center gap-2">
                            {canManage && (
                                <>
                                    <Button variant="outline" onClick={() => navigate('/projects/clients')}>
                                        Manage Clients
                                    </Button>
                                    <Button onClick={handleOpenCreateModal}>
                                        <Plus size={18} />
                                        Add Project
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {activeTab === 'list' ? (
                    <>
                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="relative flex-1 max-w-xs w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <Input
                                    placeholder="Search projects..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            <select
                                value={clientFilter}
                                onChange={(e) => setClientFilter(e.target.value)}
                                className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full sm:w-auto"
                            >
                                <option value="All">All Clients</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'All')}
                                className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full sm:w-auto"
                            >
                                <option value="All">All Status</option>
                                <option value="PLANNING">Planning</option>
                                <option value="ACTIVE">Active</option>
                                <option value="ON_HOLD">On Hold</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="ARCHIVED">Archived</option>
                            </select>
                        </div>

                        {/* Projects Table */}
                        <Card className="p-0 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Project Name</TableHead>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Timeline</TableHead>
                                        <TableHead>Status</TableHead>
                                        {canManage && <TableHead>Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projectsLoading ? (
                                        <TableRow>
                                            <TableCell className="text-center py-8" >
                                                Loading projects...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredProjects.length === 0 ? (
                                        <TableRow>
                                            <TableCell className="text-center py-8" >
                                                No projects found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredProjects.map((project) => (
                                            <TableRow
                                                key={project.id}
                                                className="cursor-pointer"
                                                onClick={() => navigate(`/projects/${project.id}/tasks`)}
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                            <FolderKanban size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">{project.name}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {project.client?.name || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col text-xs text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={12} />
                                                            {format(new Date(project.start_date), 'MMM dd, yyyy')}
                                                        </span>
                                                        <span>to</span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={12} />
                                                            {format(new Date(project.end_date), 'MMM dd, yyyy')}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <StatusBadge type="project" status={project.status} />
                                                </TableCell>
                                                {canManage && (
                                                    <TableCell>
                                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => handleOpenMembersModal(project)}
                                                                className="p-2 text-gray-400 hover:text-purple-500 transition-colors"
                                                                title="Manage Members"
                                                            >
                                                                <Users size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenEditModal(project)}
                                                                className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                                                title="Edit Project"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => setProjectToDelete(project)}
                                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                                title="Delete Project"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </>
                ) : activeTab === 'reports' ? (
                    <ProjectReports />
                ) : (
                    <TimesheetContent />
                )}

                {/* Create/Edit Project Modal - only relevant for List view actions, but kept here in layout */}
                <Dialog
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    title={editingProject ? "Edit Project" : "Create New Project"}
                >
                    <form onSubmit={handleSubmit}>
                        <DialogContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Project Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="client">Client *</Label>
                                <select
                                    id="client"
                                    value={formData.client_id}
                                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    required
                                >
                                    <option value="">Select a client</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>{client.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start_date">Start Date *</Label>
                                    <Input
                                        id="start_date"
                                        type="date"
                                        value={formData.start_date}
                                        max={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end_date">End Date *</Label>
                                    <Input
                                        id="end_date"
                                        type="date"
                                        value={formData.end_date}
                                        min={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <select
                                    id="status"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                                    className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    <option value="PLANNING">Planning</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="ON_HOLD">On Hold</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="ARCHIVED">Archived</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="budget">Budget</Label>
                                <Input
                                    id="budget"
                                    type="number"
                                    value={formData.budget}
                                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                    placeholder="e.g. 5000"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="flex min-h-[80px] w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    placeholder="Enter project details..."
                                />
                            </div>
                        </DialogContent>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleCloseModal}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" isLoading={isSubmitting}>
                                {editingProject ? 'Update Project' : 'Create Project'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Dialog>

                {/* Project Members Modal */}
                <ProjectMembersModal
                    project={selectedProjectForMembers}
                    isOpen={isMembersModalOpen}
                    onClose={handleCloseMembersModal}
                    canManage={canManage}
                />

                {/* Delete Confirmation Dialog */}
                <Dialog
                    open={!!projectToDelete}
                    onOpenChange={(open) => !open && setProjectToDelete(null)}
                    title="Delete Project"
                    description="Are you sure you want to delete this project?"
                >
                    <DialogContent>
                        <p className="text-gray-600 dark:text-gray-400">
                            You are about to delete <strong>{projectToDelete?.name}</strong>.
                            This action cannot be undone.
                        </p>
                    </DialogContent>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setProjectToDelete(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => projectToDelete && deleteMutation.mutate(projectToDelete.id)}
                            isLoading={deleteMutation.isPending}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </Dialog>
            </div>
        </DashboardLayout>
    );
};
