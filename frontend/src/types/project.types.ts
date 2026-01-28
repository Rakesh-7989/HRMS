// Project Management Module Types
// Aligned with backend tables: clients, projects, tasks, timesheets

export type ClientStatus = 'ACTIVE' | 'INACTIVE';
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TimesheetStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';

// Client Interface
export interface Client {
    id: string;
    tenant_id?: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zip_code?: string;
    status: ClientStatus;
    notes?: string;
    created_at?: string;
    updated_at?: string;
}

export interface CreateClientData {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zip_code?: string;
    status: ClientStatus;
    notes?: string;
}

// Project Interface
export interface Project {
    id: string;
    client_id: string;
    name: string;
    start_date: string;
    end_date: string;
    status: ProjectStatus;
    description?: string;
    budget?: number;
    client?: Client;
    created_at?: string;
    updated_at?: string;
}

export interface CreateProjectData {
    client_id: string;
    name: string;
    start_date: string;
    end_date: string;
    status: ProjectStatus;
    description?: string;
    budget?: number;
}

export interface UpdateProjectData {
    client_id?: string;
    name?: string;
    start_date?: string;
    end_date?: string;
    status?: ProjectStatus;
    description?: string;
    budget?: number;
}

// Project Member Interface
export type ProjectMemberRole = 'LEAD' | 'MEMBER';

export interface ProjectMember {
    id: string;
    project_id: string;
    employee_id: string;
    role: ProjectMemberRole;
    created_at?: string;
    employee: {
        id: string;
        first_name: string;
        last_name: string;
        email?: string;
        employee_code?: string;
    };
}

export interface AddProjectMemberData {
    employee_id: string;
    role?: ProjectMemberRole;
}

// Kanban Board Interfaces
export interface KanbanColumn {
    id: string;
    column_key: string;
    column_label: string;
    order_index: number;
    is_enabled: boolean;
    project_id?: string;
    created_at?: string;
    updated_at?: string;
}

export interface KanbanColumnInput {
    column_key: string;
    column_label: string;
    order_index?: number;
}

// Task Interface
export interface Task {
    id: string;
    project_id: string;
    assignee_id?: string;
    assigned_to?: string;
    title: string;
    description?: string;
    priority: TaskPriority;
    status: TaskStatus;
    column_key?: string; // Backend uses column_key instead of status
    due_date?: string;
    estimated_hours?: number;
    created_by?: string;
    project?: Project;
    // Single assignee (backward compatibility)
    assignee?: {
        id: string;
        first_name: string;
        last_name: string;
        email?: string;
    };
    // Multiple assignees (new)
    assignees?: {
        id: string;
        first_name: string;
        last_name: string;
        email?: string;
    }[];
    assigned_by?: {
        id: string;
        first_name: string;
        last_name: string;
        email?: string;
    };
    created_at?: string;
    updated_at?: string;
}

export interface CreateTaskData {
    project_id: string;
    assigned_to?: string | string[]; // Can be single ID or array of IDs
    title: string;
    description?: string;
    priority: TaskPriority;
    column_key: TaskStatus;
    due_date?: string;
    estimated_hours?: number;
}

// Timesheet Interface
export interface Timesheet {
    id: string;
    employee_id: string;
    project_id: string;
    task_id: string;
    work_date: string;
    hours: number;
    status: TimesheetStatus;
    employee?: {
        id: string;
        first_name: string;
        last_name: string;
        email?: string;
    };
    project?: Project;
    task?: Task;
    created_at?: string;
    updated_at?: string;
}

export interface CreateTimesheetData {
    project_id: string;
    task_id: string;
    work_date: string;
    hours: number;
    notes?: string;
}

export interface ApproveTimesheetData {
    timesheet_id: string;
    notes?: string;
}

// Report Interfaces
export interface ProjectReport {
    project_id: string;
    total_hours: number;
    total_timesheets: number;
    employees: any[]; // TODO: Define employee structure
}

export interface ClientReport {
    client_id: string;
    total_projects: number;
    total_timesheets: number;
    total_hours: number;
    projects: string[];
}

export interface EmployeeUtilization {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    timesheets_submitted: number;
    total_hours_logged: number;
    utilization_percent: number;
    projects_assigned: number;
}

// Task Comment Interface
export interface TaskComment {
    id: string;
    task_id: string;
    user_id: string;
    content: string;
    mentions: string[];
    created_at: string;
    updated_at: string;
    user: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
    };
}

export interface CreateCommentData {
    content: string;
    mentions?: string[];
}

export interface MentionableUser {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    display_name: string;
}

