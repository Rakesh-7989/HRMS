import api from './api';

export interface InboxTask {
    id: string;
    tenant_id: string;
    employee_id: string;
    category: string;
    title: string;
    description?: string;
    due_date?: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    created_at: string;
    updated_at: string;
    created_by?: string;
}

export interface InboxActivity {
    id: string;
    task_id: string;
    actor_id: string;
    message: string;
    created_at: string;
    email?: string;
    first_name?: string;
    last_name?: string;
}

export const inboxService = {
    getTasks: async (params?: {
        category?: string;
        status?: string;
        employee_id?: string;
    }): Promise<InboxTask[]> => {
        const response = await api.get<{ status: string; tasks: InboxTask[] }>('/inbox', { params });
        return response.data.tasks || [];
    },

    createTask: async (data: Partial<InboxTask>): Promise<InboxTask> => {
        const response = await api.post<{ status: string; task: InboxTask }>('/inbox', data);
        return response.data.task;
    },

    updateStatus: async (id: string, status: string): Promise<InboxTask> => {
        const response = await api.put<{ status: string; task: InboxTask }>(`/inbox/${id}/status`, { status });
        return response.data.task;
    },

    getActivities: async (taskId: string): Promise<InboxActivity[]> => {
        const response = await api.get<{ status: string; activities: InboxActivity[] }>(`/inbox/${taskId}/activities`);
        return response.data.activities || [];
    },

    addActivity: async (taskId: string, message: string): Promise<InboxActivity> => {
        const response = await api.post<{ status: string; activity: InboxActivity }>(`/inbox/${taskId}/activities`, { message });
        return response.data.activity;
    },
};
