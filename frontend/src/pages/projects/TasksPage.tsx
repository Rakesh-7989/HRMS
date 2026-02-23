import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/utils/toast';
import {
    Plus,
    Search,
    Columns3,
    List,
    Settings,
    Edit,
    Trash2,
    ArrowLeft
} from 'lucide-react';

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
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/Dialog';
import { StatusBadge } from '@/components/projects/StatusBadge';
import { TaskBoard, BoardConfigItem, DEFAULT_BOARD_CONFIG } from '@/components/projects/TaskBoard';
import { BoardSettingsModal } from '@/components/projects/BoardSettingsModal';
import { TaskDetailsModal } from '@/components/projects/TaskDetailsModal';
import { KanbanSetupCard } from '@/components/projects/KanbanSetupCard';

import { projectsService } from '@/services/projects.service';

import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';
import type { TaskStatus, TaskPriority, Task } from '@/types/project.types';

export const TasksPage: React.FC = () => {
    const { id: projectId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'list' | 'board'>('list');

    // Board Config State - derive from backend Kanban columns when available
    const [boardConfig, setBoardConfig] = useState<BoardConfigItem[]>(DEFAULT_BOARD_CONFIG);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Filters State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
    const [assigneeFilter, setAssigneeFilter] = useState('All');

    const handleSaveConfig = (newConfig: BoardConfigItem[]) => {
        setBoardConfig(newConfig);
        if (projectId) {
            localStorage.setItem(`kanban_settings_${projectId}`, JSON.stringify(newConfig));
        }
    };

    // Create Task Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignee_ids: [] as string[], // Changed to array for multiple assignees
        priority: 'MEDIUM' as TaskPriority,
        column_key: 'TODO' as TaskStatus,
        due_date: '',
        estimated_hours: '',
    });

    const canManage = ['ADMIN', 'HR', 'MANAGER'].includes(user?.role || '');

    // Queries
    const { data: serverProject, isLoading: projectLoading } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectsService.getProject(projectId!),
        enabled: !!projectId,
        retry: false, // Don't retry if mock data is needed
    });

    const project = serverProject;

    const { data: serverTasks = [], isLoading: tasksLoading } = useQuery({
        queryKey: ['tasks', projectId],
        queryFn: () => projectsService.getTasks({ project_id: projectId }),
        enabled: !!projectId,
        retry: false,
    });

    const tasks: Task[] = serverTasks;


    const { data: projectMembers = [] } = useQuery({
        queryKey: ['project-members', projectId],
        queryFn: () => projectsService.listProjectMembers(projectId!),
        enabled: !!projectId,
    });

    // Check if Kanban board exists
    const { data: kanbanStatus, isLoading: kanbanLoading } = useQuery({
        queryKey: ['kanban-exists', projectId],
        queryFn: () => projectsService.checkKanbanExists(projectId!),
        enabled: !!projectId,
        retry: false,
    });

    const kanbanExists = kanbanStatus?.exists ?? false;

    // Get Kanban columns for status dropdown
    const kanbanColumns = kanbanStatus?.columns ?? [];
    const enabledColumns = kanbanColumns.filter(col => col.is_enabled);

    // Set default column_key when columns are loaded
    React.useEffect(() => {
        if (enabledColumns.length > 0 && !formData.column_key) {
            // Find the first enabled column, prefer TODO if exists
            const defaultCol = enabledColumns.find(c => c.column_key === 'TODO') || enabledColumns[0];
            setFormData(prev => ({ ...prev, column_key: defaultCol.column_key as TaskStatus }));
        }
    }, [enabledColumns]);

    // Update board config from backend Kanban columns when they're loaded
    React.useEffect(() => {
        console.log('[TasksPage] boardConfig useEffect triggered', {
            hasKanbanStatus: !!kanbanStatus,
            columnsCount: kanbanStatus?.columns?.length,
            columns: kanbanStatus?.columns
        });
        if (kanbanStatus?.columns && kanbanStatus.columns.length > 0) {
            // Convert backend columns to board config format
            const configFromBackend: BoardConfigItem[] = kanbanStatus.columns.map(col => ({
                id: col.column_key as TaskStatus,
                title: col.column_label,
                isVisible: col.is_enabled,
            }));
            console.log('[TasksPage] Setting boardConfig from backend:', configFromBackend);
            setBoardConfig(configFromBackend);
        } else if (projectId) {
            // Fallback: try to load from localStorage for sample project
            const savedConfig = localStorage.getItem(`kanban_settings_${projectId}`);
            if (savedConfig) {
                try {
                    setBoardConfig(JSON.parse(savedConfig));
                } catch (e) {
                    console.error("Failed to parse board settings", e);
                    setBoardConfig(DEFAULT_BOARD_CONFIG);
                }
            } else {
                setBoardConfig(DEFAULT_BOARD_CONFIG);
            }
        }
    }, [projectId, kanbanStatus?.columns]);

    // Handler for when Kanban board is set up
    const handleKanbanSetupComplete = () => {
        console.log('[TasksPage] Kanban setup complete, invalidating queries and clearing localStorage');
        // Clear any cached localStorage settings that might override backend columns
        if (projectId) {
            localStorage.removeItem(`kanban_settings_${projectId}`);
        }
        queryClient.invalidateQueries({ queryKey: ['kanban-exists', projectId] });
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    };

    // Mutations
    const createTaskMutation = useMutation({
        mutationFn: projectsService.createTask,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
            setIsModalOpen(false);
            setFormData({
                title: '',
                description: '',
                assignee_ids: [],
                priority: 'MEDIUM',
                column_key: 'TODO',
                due_date: '',
                estimated_hours: '',
            });
            setIsSubmitting(false);
        },
        onError: (error: any) => {
            setIsSubmitting(false);
            showToast.error(error.response?.data?.message || 'Failed to create task');
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
            projectsService.updateTaskStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
            showToast.success('Status updated');
        },
        onError: (error: any) => {
            showToast.error(error.response?.data?.message || 'Failed to update status');
        }
    });

    const updateTaskMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            projectsService.updateTask(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
            setEditingTask(null);
            setIsEditModalOpen(false);
            setIsSubmitting(false);
            showToast.success('Task updated');
        },
        onError: (error: any) => {
            setIsSubmitting(false);
            showToast.error(error.response?.data?.message || 'Failed to update task');
        },
    });

    const deleteTaskMutation = useMutation({
        mutationFn: projectsService.deleteTask,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
            setTaskToDelete(null);
            showToast.success('Task deleted');
        },
        onError: (error: any) => {
            showToast.error(error.response?.data?.message || 'Failed to delete task');
            setTaskToDelete(null);
        },
    });

    // Edit/Delete state
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [editFormData, setEditFormData] = useState({
        title: '',
        description: '',
        assignee_ids: [] as string[], // Changed to array for multiple assignees
        priority: 'MEDIUM' as TaskPriority,
        due_date: '',
        estimated_hours: '',
    });

    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
        setIsDetailsModalOpen(true);
    };

    const handleOpenEditModal = (task: Task) => {
        setEditingTask(task);
        // Extract assignee IDs from the assignees array
        const assigneeIds = task.assignees?.map(a => a.id) ||
            (task.assigned_to ? [task.assigned_to] :
                (task.assignee_id ? [task.assignee_id] : []));
        setEditFormData({
            title: task.title,
            description: task.description || '',
            assignee_ids: assigneeIds,
            priority: task.priority,
            due_date: task.due_date ? task.due_date.split('T')[0] : '',
            estimated_hours: task.estimated_hours?.toString() || '',
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTask) return;

        setIsSubmitting(true);
        updateTaskMutation.mutate({
            id: editingTask.id,
            data: {
                title: editFormData.title,
                description: editFormData.description || undefined,
                assigned_to: editFormData.assignee_ids.length > 0 ? editFormData.assignee_ids : undefined,
                priority: editFormData.priority,
                due_date: editFormData.due_date || undefined,
                estimated_hours: editFormData.estimated_hours ? parseFloat(editFormData.estimated_hours) : undefined,
            },
        });
    };

    // Permission check for task edit/delete - Hybrid approach:
    // 1. Task creator can always edit their own task
    // 2. Higher roles can edit tasks created by lower roles
    // Role hierarchy: ADMIN > MANAGER > HR > EMPLOYEE
    const ROLE_HIERARCHY: Record<string, number> = {
        'ADMIN': 4,
        'MANAGER': 3,
        'HR': 2,
        'EMPLOYEE': 1,
    };

    const canEditTask = (task: Task) => {
        if (!user) return false;

        // 1. Task creator can always edit their own task
        if (task.created_by === user.id) return true;

        // 2. Get role levels for comparison
        const userRoleLevel = ROLE_HIERARCHY[user.role] || 0;
        const creatorRoleLevel = ROLE_HIERARCHY[(task as any).creator_role] || 0;

        // Higher roles can edit tasks created by lower or equal roles
        // ADMIN can edit all, MANAGER can edit MANAGER/HR/EMPLOYEE tasks, etc.
        return userRoleLevel > creatorRoleLevel;
    };

    // Handlers
    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId) return;

        setIsSubmitting(true);
        createTaskMutation.mutate({
            project_id: projectId,
            title: formData.title,
            description: formData.description || undefined,
            assigned_to: formData.assignee_ids.length > 0 ? formData.assignee_ids : undefined,
            priority: formData.priority,
            column_key: formData.column_key,
            due_date: formData.due_date || undefined,
            estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
        });
    };

    const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
        updateStatusMutation.mutate({ id: taskId, status: newStatus });
    };

    // Filters logic
    const getFilteredTasks = (ignoreStatus: boolean = false) => {
        return tasks.filter((task) => {
            const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = ignoreStatus || statusFilter === 'All' || task.status === statusFilter;
            const matchesAssignee = assigneeFilter === 'All' || task.assignee_id === assigneeFilter;
            return matchesSearch && matchesStatus && matchesAssignee;
        });
    };

    // Adjust loading check to allow fallback
    if (projectLoading && !project) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-full">
                    <p>Loading project...</p>
                </div>
            </DashboardLayout>
        );
    }

    // Show loading while checking Kanban status
    if (kanbanLoading) {
        return (
            <DashboardLayout
                title={project?.name || 'Tasks'}
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Projects', href: '/projects' },
                    { label: project?.name || 'Project Details' },
                ]}
            >
                <div className="flex items-center justify-center h-64">
                    <p>Loading board configuration...</p>
                </div>
            </DashboardLayout>
        );
    }

    // Show Kanban setup card if board doesn't exist
    if (!kanbanExists) {
        return (
            <DashboardLayout
                title={project?.name || 'Tasks'}
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: 'Projects', href: '/projects' },
                    { label: project?.name || 'Project Details' },
                ]}
            >
                <div className="py-8">
                    <KanbanSetupCard
                        projectId={projectId!}
                        onSetupComplete={handleKanbanSetupComplete}
                    />
                </div>
            </DashboardLayout>
        );
    }

    const filteredTasks = getFilteredTasks(false); // For List View, respect status filter
    const boardTasks = getFilteredTasks(true); // For Board View, ignore status filter (show all columns)

    return (
        <DashboardLayout
            title={project?.name || 'Tasks'}
            breadcrumbs={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Projects', href: '/projects' },
                { label: project?.name || 'Project Details' },
            ]}
        >
            <div className="flex flex-col h-[calc(100vh-8rem)] gap-4 w-full overflow-hidden">
                {/* Header: Tabs, Search, Filters, and Actions - All in One Row */}
                <div className="shrink-0 flex flex-wrap items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} title="Back to Projects">
                        <ArrowLeft size={16} className="mr-2" />
                        Back
                    </Button>
                    {/* View Toggle Tabs */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 bg-gray-100 dark:bg-gray-800">
                            <button
                                onClick={() => setActiveTab('list')}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                                    activeTab === 'list'
                                        ? "bg-white dark:bg-gray-900 text-primary shadow-sm"
                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                )}
                            >
                                <List size={14} />
                                List
                            </button>
                            <button
                                onClick={() => setActiveTab('board')}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                                    activeTab === 'board'
                                        ? "bg-white dark:bg-gray-900 text-primary shadow-sm"
                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                )}
                            >
                                <Columns3 size={14} />
                                Board
                            </button>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="hidden sm:block w-px h-6 bg-gray-300 dark:bg-gray-700" />

                    {/* Search */}
                    <div className="relative w-48">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <Input
                            placeholder="Search tasks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 h-9 text-sm"
                        />
                    </div>

                    {/* Status Filter (List View Only) */}
                    {activeTab === 'list' && (
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'All')}
                            className="h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <option value="All">All Status</option>
                            {enabledColumns.length === 0 ? (
                                <>
                                    <option value="TODO">To Do</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="REVIEW">Review</option>
                                    <option value="DONE">Done</option>
                                </>
                            ) : (
                                enabledColumns.map(col => (
                                    <option key={col.column_key} value={col.column_key}>
                                        {col.column_label}
                                    </option>
                                ))
                            )}
                        </select>
                    )}

                    {/* Assignee Filter */}
                    <select
                        value={assigneeFilter}
                        onChange={(e) => setAssigneeFilter(e.target.value)}
                        className="h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <option value="All">All Assignees</option>
                        {projectMembers.length === 0 ? (
                            <option disabled>No members found</option>
                        ) : (
                            projectMembers.map(member => (
                                <option key={member.id} value={member.employee_id}>
                                    {member.employee.first_name} {member.employee.last_name}
                                </option>
                            ))
                        )}
                    </select>

                    {/* Spacer to push buttons to the right */}
                    <div className="flex-1" />

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {activeTab === 'board' && canManage && (
                            <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)} title="Board Settings">
                                <Settings size={16} />
                            </Button>
                        )}
                        {canManage && (
                            <Button size="sm" onClick={() => setIsModalOpen(true)}>
                                <Plus size={16} className="mr-1" />
                                Add
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-hidden min-h-0 min-w-0">
                    {activeTab === 'list' ? (
                        <Card className="h-full overflow-hidden border-0 shadow-none bg-transparent">
                            <div className="overflow-auto h-full scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                                <Table>
                                    <TableHeader className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="w-[100px]">ID</TableHead>
                                            <TableHead className="w-[30%]">Title</TableHead>
                                            <TableHead className="w-[30%]">Description</TableHead>
                                            <TableHead className="w-[150px]">Assignee</TableHead>
                                            <TableHead className="w-[100px]">Priority</TableHead>
                                            <TableHead className="w-[120px]">Status</TableHead>
                                            <TableHead className="w-[80px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tasksLoading ? (
                                            <TableRow>
                                                <TableCell className="h-24 text-center">
                                                    Loading tasks...
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredTasks.length === 0 ? (
                                            <TableRow>
                                                <TableCell className="h-24 text-center">
                                                    No tasks found for the selected filters
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredTasks.map((task) => (
                                                <TableRow
                                                    key={task.id}
                                                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                                                    onClick={() => handleTaskClick(task)}
                                                >
                                                    <TableCell>
                                                        <span className="font-mono text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                                            Task-{task.id.slice(0, 4)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-medium">{task.title}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2" title={task.description}>
                                                            {task.description || '-'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {task.assignees && task.assignees.length > 0 ? (
                                                            <div className="flex items-center">
                                                                <div className="flex -space-x-2">
                                                                    {task.assignees.slice(0, 3).map((assignee, idx) => (
                                                                        <div
                                                                            key={assignee.id}
                                                                            className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-[10px] text-white font-bold border-2 border-white dark:border-gray-900"
                                                                            title={`${assignee.first_name} ${assignee.last_name}`}
                                                                            style={{ zIndex: 3 - idx }}
                                                                        >
                                                                            {assignee.first_name.charAt(0)}{assignee.last_name?.charAt(0)}
                                                                        </div>
                                                                    ))}
                                                                    {task.assignees.length > 3 && (
                                                                        <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-gray-900">
                                                                            +{task.assignees.length - 3}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                                                    {task.assignees.length === 1
                                                                        ? `${task.assignees[0].first_name} ${task.assignees[0].last_name}`
                                                                        : `${task.assignees.length} assignees`}
                                                                </span>
                                                            </div>
                                                        ) : task.assignee ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-[10px] text-white font-bold">
                                                                    {task.assignee.first_name.charAt(0)}{task.assignee.last_name?.charAt(0)}
                                                                </div>
                                                                <span>{task.assignee.first_name} {task.assignee.last_name}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">Unassigned</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <StatusBadge type="priority" status={task.priority} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <select
                                                            value={task.column_key || task.status}
                                                            onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                                                            disabled={(() => {
                                                                if (!user) return true;
                                                                // Admins, HR, Managers can move everything
                                                                if (['ADMIN', 'HR', 'MANAGER'].includes(user.role)) return false;
                                                                if (user.role === 'EMPLOYEE') {
                                                                    const userEmployeeId = user.employee_id;

                                                                    // Check if user is one of the assignees
                                                                    if (task.assignees && task.assignees.length > 0) {
                                                                        return !task.assignees.some(a => a.id === userEmployeeId);
                                                                    }

                                                                    // Fallback
                                                                    const taskAssigneeId = task.assignee_id || task.assignee?.id;
                                                                    if (!userEmployeeId || !taskAssigneeId) return true;
                                                                    return taskAssigneeId !== userEmployeeId;
                                                                }
                                                                return true;
                                                            })()}
                                                            className="h-8 rounded text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {enabledColumns.length === 0 ? (
                                                                <>
                                                                    <option value="TODO">To Do</option>
                                                                    <option value="IN_PROGRESS">In Progress</option>
                                                                    <option value="REVIEW">Review</option>
                                                                    <option value="DONE">Done</option>
                                                                </>
                                                            ) : (
                                                                enabledColumns.map(col => (
                                                                    <option key={col.column_key} value={col.column_key}>
                                                                        {col.column_label}
                                                                    </option>
                                                                ))
                                                            )}
                                                        </select>
                                                    </TableCell>
                                                    <TableCell>
                                                        {canEditTask(task) && (
                                                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                                <button
                                                                    onClick={() => handleOpenEditModal(task)}
                                                                    className="p-2 text-gray-400 hover:text-violet-500 transition-colors"
                                                                    title="Edit Task"
                                                                >
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setTaskToDelete(task)}
                                                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                                    title="Delete Task"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    ) : (
                        <TaskBoard
                            tasks={boardTasks}
                            projectId={projectId!}
                            config={boardConfig}
                            onTaskClick={handleTaskClick}
                            onEditTask={handleOpenEditModal}
                        />
                    )}
                </div>

                {/* Board Settings Modal */}
                <BoardSettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    currentConfig={boardConfig}
                    onSave={handleSaveConfig}
                />

                {/* Create Task Modal */}
                <Dialog
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                >
                    <form onSubmit={handleCreateTask}>
                        <DialogContent className="space-y-4">
                            <DialogHeader>
                                <DialogTitle>Add New Task</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-2">
                                <Label htmlFor="title">Task Title *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="assignees">Assignees (Optional)</Label>
                                <div className="border border-gray-300 dark:border-gray-700 rounded-md p-2 max-h-32 overflow-y-auto bg-white dark:bg-gray-900">
                                    {projectMembers.length === 0 ? (
                                        <p className="text-sm text-gray-400">No members found - Add members to project first</p>
                                    ) : (
                                        projectMembers.map(member => (
                                            <label key={member.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-1 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.assignee_ids.includes(member.employee_id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData({ ...formData, assignee_ids: [...formData.assignee_ids, member.employee_id] });
                                                        } else {
                                                            setFormData({ ...formData, assignee_ids: formData.assignee_ids.filter(id => id !== member.employee_id) });
                                                        }
                                                    }}
                                                    className="rounded border-gray-300"
                                                />
                                                <span className="text-sm">{member.employee.first_name} {member.employee.last_name}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                                {formData.assignee_ids.length > 0 && (
                                    <p className="text-xs text-gray-500">{formData.assignee_ids.length} selected</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="priority">Priority</Label>
                                    <select
                                        id="priority"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                                        className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="CRITICAL">Critical</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="column_key">Status</Label>
                                    <select
                                        id="column_key"
                                        value={formData.column_key}
                                        onChange={(e) => setFormData({ ...formData, column_key: e.target.value as TaskStatus })}
                                        className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                        {enabledColumns.length === 0 ? (
                                            <>
                                                <option value="TODO">To Do</option>
                                                <option value="IN_PROGRESS">In Progress</option>
                                                <option value="REVIEW">Review</option>
                                                <option value="DONE">Done</option>
                                            </>
                                        ) : (
                                            enabledColumns.map(col => (
                                                <option key={col.column_key} value={col.column_key}>
                                                    {col.column_label}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="flex min-h-[80px] w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    placeholder="Task details..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="due_date">Due Date</Label>
                                    <Input
                                        id="due_date"
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="estimated_hours">Estimated Hours</Label>
                                    <Input
                                        id="estimated_hours"
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={formData.estimated_hours}
                                        onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                                        placeholder="e.g. 4"
                                    />
                                </div>
                            </div>
                        </DialogContent>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsModalOpen(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" isLoading={isSubmitting}>
                                Create Task
                            </Button>
                        </DialogFooter>
                    </form>
                </Dialog>

                {/* Task Details Modal */}
                <TaskDetailsModal
                    task={selectedTask}
                    isOpen={isDetailsModalOpen}
                    onClose={() => setIsDetailsModalOpen(false)}
                    onEdit={(task) => handleOpenEditModal(task)}
                    canEdit={selectedTask ? canEditTask(selectedTask) : false}
                />

                {/* Edit Task Modal */}
                <Dialog
                    open={isEditModalOpen}
                    onOpenChange={setIsEditModalOpen}
                >
                    <form onSubmit={handleUpdateTask}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Task</DialogTitle>
                                <p className="text-sm text-gray-500">Update the task details.</p>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_title">Task Title *</Label>
                                    <Input
                                        id="edit_title"
                                        value={editFormData.title}
                                        onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                                        placeholder="Enter task title"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_description">Description</Label>
                                    <textarea
                                        id="edit_description"
                                        value={editFormData.description}
                                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                        placeholder="Enter task description"
                                        className="flex min-h-[80px] w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_priority">Priority</Label>
                                        <select
                                            id="edit_priority"
                                            value={editFormData.priority}
                                            onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as TaskPriority })}
                                            className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
                                        >
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                            <option value="URGENT">Urgent</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_assignees">Assignees (Optional)</Label>
                                        <div className="border border-gray-300 dark:border-gray-700 rounded-md p-2 max-h-24 overflow-y-auto bg-white dark:bg-gray-900">
                                            {projectMembers.length === 0 ? (
                                                <p className="text-sm text-gray-400">No members found - Add members to project first</p>
                                            ) : (
                                                projectMembers.map((member) => (
                                                    <label key={member.employee_id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-1 rounded text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={editFormData.assignee_ids.includes(member.employee_id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setEditFormData({ ...editFormData, assignee_ids: [...editFormData.assignee_ids, member.employee_id] });
                                                                } else {
                                                                    setEditFormData({ ...editFormData, assignee_ids: editFormData.assignee_ids.filter(id => id !== member.employee_id) });
                                                                }
                                                            }}
                                                            className="rounded border-gray-300"
                                                        />
                                                        {member.employee.first_name} {member.employee.last_name}
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_due_date">Due Date</Label>
                                        <Input
                                            id="edit_due_date"
                                            type="date"
                                            value={editFormData.due_date}
                                            onChange={(e) => setEditFormData({ ...editFormData, due_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit_estimated_hours">Estimated Hours</Label>
                                        <Input
                                            id="edit_estimated_hours"
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={editFormData.estimated_hours}
                                            onChange={(e) => setEditFormData({ ...editFormData, estimated_hours: e.target.value })}
                                            placeholder="e.g. 4"
                                        />
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsEditModalOpen(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" isLoading={isSubmitting}>
                                Update Task
                            </Button>
                        </DialogFooter>
                    </form>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog
                    open={!!taskToDelete}
                    onOpenChange={(open) => !open && setTaskToDelete(null)}
                    title="Delete Task"
                    description="Are you sure you want to delete this task?"
                >
                    <DialogContent>
                        <p className="text-gray-600 dark:text-gray-400">
                            You are about to delete <strong>{taskToDelete?.title}</strong>.
                            This action cannot be undone.
                        </p>
                    </DialogContent>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setTaskToDelete(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => taskToDelete && deleteTaskMutation.mutate(taskToDelete.id)}
                            isLoading={deleteTaskMutation.isPending}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </Dialog>
            </div>
        </DashboardLayout>
    );
};
