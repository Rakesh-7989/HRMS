import api from '@/services/common/api';
import type {
    Client,
    CreateClientData,
    Project,
    CreateProjectData,
    UpdateProjectData,
    ProjectMember,
    Task,
    CreateTaskData,
    TaskStatus,
    ProjectReport,
    ClientReport,
    EmployeeUtilization,
    KanbanColumn,
    KanbanColumnInput,
    TaskComment,
    CreateCommentData,
    MentionableUser,
} from '@/types/project.types';

/**
 * Projects Service
 * Handles all project, client, and task related API calls
 * Uses exact endpoints as defined in backend specification
 */
export const projectsService = {
    // ========== CLIENT ENDPOINTS ==========

    /**
     * Create a new client
     * POST /api/projects/clients
     */
    createClient: async (data: CreateClientData): Promise<Client> => {
        const response = await api.post<{ status: string; data: Client }>(
            '/projects/clients',
            data
        );
        return response.data.data!;
    },

    /**
     * Get all clients (derived from projects endpoint or separate if available)
     * For now, clients are fetched along with projects
     */
    getClients: async (): Promise<Client[]> => {
        const response = await api.get<{ status: string; data: Client[] }>(
            '/projects/clients'
        );
        return response.data.data || [];
    },

    /**
     * Get single client by ID
     * GET /api/projects/clients/:id
     */
    getClient: async (id: string): Promise<Client> => {
        const response = await api.get<{ status: string; data: Client }>(
            `/projects/clients/${id}`
        );
        return response.data.data!;
    },

    /**
     * Update an existing client
     * PUT /api/projects/clients/:id
     */
    updateClient: async (id: string, data: Partial<CreateClientData>): Promise<Client> => {
        const response = await api.put<{ status: string; data: Client }>(
            `/projects/clients/${id}`,
            data
        );
        return response.data.data!;
    },

    /**
     * Delete a client
     * DELETE /api/projects/clients/:id
     */
    deleteClient: async (id: string): Promise<void> => {
        await api.delete(`/projects/clients/${id}`);
    },

    // ========== PROJECT ENDPOINTS ==========

    /**
     * Get all projects
     * GET /api/projects
     */
    getProjects: async (params?: {
        client_id?: string;
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<Project[]> => {
        const response = await api.get<{ status: string; data: Project[] }>(
            '/projects',
            { params }
        );
        return response.data.data || [];
    },

    /**
     * Get single project by ID
     * GET /api/projects/:id
     */
    getProject: async (id: string): Promise<Project> => {
        const response = await api.get<{ status: string; data: Project }>(
            `/projects/${id}`
        );
        return response.data.data!;
    },

    /**
     * Create a new project
     * POST /api/projects
     */
    createProject: async (data: CreateProjectData): Promise<Project> => {
        const response = await api.post<{ status: string; data: Project }>(
            '/projects',
            data
        );
        return response.data.data!;
    },

    /**
     * Update an existing project
     * PUT /api/projects/:id
     */
    updateProject: async (id: string, data: UpdateProjectData): Promise<Project> => {
        const response = await api.put<{ status: string; data: Project }>(
            `/projects/${id}`,
            data
        );
        return response.data.data!;
    },

    /**
     * Delete a project
     * DELETE /api/projects/:id
     */
    deleteProject: async (id: string): Promise<void> => {
        await api.delete(`/projects/${id}`);
    },

    // ========== PROJECT MEMBERSHIP ENDPOINTS ==========

    /**
     * Add a member to project
     * POST /api/projects/:id/members
     */
    addProjectMember: async (projectId: string, employeeId: string, role?: string): Promise<ProjectMember> => {
        const response = await api.post<{ status: string; data: ProjectMember }>(
            `/projects/${projectId}/members`,
            { employee_id: employeeId, role: role || 'MEMBER' }
        );
        return response.data.data!;
    },

    /**
     * List project members
     * GET /api/projects/:id/members
     */
    listProjectMembers: async (projectId: string): Promise<ProjectMember[]> => {
        const response = await api.get<{ status: string; data: ProjectMember[] }>(
            `/projects/${projectId}/members`
        );
        return response.data.data || [];
    },

    /**
     * Remove a member from project
     * DELETE /api/projects/:id/members/:employee_id
     */
    removeProjectMember: async (projectId: string, employeeId: string): Promise<void> => {
        await api.delete(`/projects/${projectId}/members/${employeeId}`);
    },

    // ========== KANBAN BOARD ENDPOINTS ==========

    /**
     * Check if Kanban board exists for a project
     * GET /api/projects/projects/:project_id/board/exists
     */
    checkKanbanExists: async (projectId: string): Promise<{ exists: boolean; columns: KanbanColumn[] }> => {
        const response = await api.get<{ status: string; data: { exists: boolean; columns: KanbanColumn[] } }>(
            `/projects/projects/${projectId}/board/exists`
        );
        return response.data.data;
    },

    /**
     * Get Kanban board configuration and tasks
     * GET /api/projects/projects/:project_id/board
     */
    getKanbanBoard: async (projectId: string): Promise<{ columns: KanbanColumn[]; tasks: Record<string, Task[]> }> => {
        const response = await api.get<{ status: string; data: { columns: KanbanColumn[]; tasks: Record<string, Task[]> } }>(
            `/projects/projects/${projectId}/board`
        );
        return response.data.data;
    },

    /**
     * Create Kanban board for a project (initial setup)
     * POST /api/projects/projects/:project_id/board/setup
     */
    createKanbanBoard: async (projectId: string, options: { useDefault: boolean; columns?: KanbanColumnInput[]; forceReset?: boolean }): Promise<{ success: boolean; columns: KanbanColumn[] }> => {
        const response = await api.post<{ status: string; data: { success: boolean; columns: KanbanColumn[] } }>(
            `/projects/projects/${projectId}/board/setup`,
            options
        );
        return response.data.data;
    },

    // ========== TASK ENDPOINTS ==========

    /**
     * Get tasks for a project
     * GET /api/projects/tasks (with project_id filter)
     */
    getTasks: async (params?: {
        project_id?: string;
        assigned_to?: string;
        status?: TaskStatus;
        limit?: number;
        offset?: number;
    }): Promise<Task[]> => {
        const response = await api.get<{ status: string; data: Task[] }>(
            '/projects/tasks',
            { params }
        );
        return response.data.data || [];
    },

    /**
     * Create a new task
     * POST /api/projects/tasks
     */
    createTask: async (data: CreateTaskData): Promise<Task> => {
        const response = await api.post<{ status: string; data: Task }>(
            '/projects/tasks',
            data
        );
        return response.data.data!;
    },

    /**
     * Update task column (move task)
     * PATCH /api/projects/tasks/:id/column
     */
    updateTaskStatus: async (id: string, status: TaskStatus): Promise<Task> => {
        const response = await api.patch<{ status: string; data: Task }>(
            `/projects/tasks/${id}/column`,
            { column_key: status }
        );
        return response.data.data!;
    },

    /**
     * Update a task
     * PUT /api/projects/tasks/:id
     */
    updateTask: async (id: string, data: Partial<CreateTaskData>): Promise<Task> => {
        const response = await api.put<{ status: string; data: Task }>(
            `/projects/tasks/${id}`,
            data
        );
        return response.data.data!;
    },

    /**
     * Delete a task
     * DELETE /api/projects/tasks/:id
     */
    deleteTask: async (id: string): Promise<void> => {
        await api.delete(`/projects/tasks/${id}`);
    },

    // ========== REPORTS ENDPOINT ==========

    // ========== REPORTS ENDPOINTS ==========

    /**
     * Get project report
     * GET /api/projects/reports/project/:project_id
     */
    getProjectReport: async (projectId: string, params?: { start_date?: string; end_date?: string }): Promise<ProjectReport> => {
        const response = await api.get<{ status: string; data: ProjectReport }>(
            `/projects/reports/project/${projectId}`,
            { params }
        );
        return response.data.data!;
    },

    /**
     * Get client report
     * GET /api/projects/reports/client/:client_id
     */
    getClientReport: async (clientId: string, params?: { start_date?: string; end_date?: string }): Promise<ClientReport> => {
        const response = await api.get<{ status: string; data: ClientReport }>(
            `/projects/reports/client/${clientId}`,
            { params }
        );
        return response.data.data!;
    },

    /**
     * Get utilization report
     * GET /api/projects/reports/utilization
     */
    getUtilizationReport: async (params?: { start_date?: string; end_date?: string }): Promise<EmployeeUtilization[]> => {
        const response = await api.get<{ status: string; data: EmployeeUtilization[] }>(
            '/projects/reports/utilization',
            { params }
        );
        return response.data.data!;
    },

    // ========== TASK COMMENT ENDPOINTS ==========

    /**
     * Create a comment on a task
     * POST /api/projects/tasks/:task_id/comments
     */
    createComment: async (taskId: string, data: CreateCommentData): Promise<TaskComment> => {
        const response = await api.post<{ status: string; data: TaskComment }>(
            `/projects/tasks/${taskId}/comments`,
            data
        );
        return response.data.data!;
    },

    /**
     * List comments for a task
     * GET /api/projects/tasks/:task_id/comments
     */
    listComments: async (taskId: string): Promise<TaskComment[]> => {
        const response = await api.get<{ status: string; data: TaskComment[] }>(
            `/projects/tasks/${taskId}/comments`
        );
        return response.data.data || [];
    },

    /**
     * Update a comment
     * PUT /api/projects/tasks/comments/:comment_id
     */
    updateComment: async (commentId: string, data: CreateCommentData): Promise<TaskComment> => {
        const response = await api.put<{ status: string; data: TaskComment }>(
            `/projects/tasks/comments/${commentId}`,
            data
        );
        return response.data.data!;
    },

    /**
     * Delete a comment
     * DELETE /api/projects/tasks/comments/:comment_id
     */
    deleteComment: async (commentId: string): Promise<void> => {
        await api.delete(`/projects/tasks/comments/${commentId}`);
    },

    /**
     * Get mentionable users for a project
     * GET /api/projects/projects/:project_id/mentionable-users
     */
    getMentionableUsers: async (projectId: string): Promise<MentionableUser[]> => {
        const response = await api.get<{ status: string; data: MentionableUser[] }>(
            `/projects/projects/${projectId}/mentionable-users`
        );
        return response.data.data || [];
    },
};

