import { Project, Task, Client } from '../types/project.types';

export const SAMPLE_CLIENT: Client = {
    id: 'sample-client-1',
    name: 'Acme Corp (Sample)',
    status: 'ACTIVE',
};

export const SAMPLE_PROJECT: Project = {
    id: 'sample-project-1',
    client_id: 'sample-client-1',
    name: 'Website Redesign (Sample)',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'IN_PROGRESS',
    client: SAMPLE_CLIENT,
};

export const SAMPLE_TASKS: Task[] = [
    {
        id: 'sample-task-1',
        project_id: 'sample-project-1',
        assignee_id: 'sample-user-1',
        title: 'Design Home Page',
        priority: 'HIGH',
        status: 'DONE',
        assignee: {
            id: 'sample-user-1',
            first_name: 'John',
            last_name: 'Doe',
        },
    },
    {
        id: 'sample-task-2',
        project_id: 'sample-project-1',
        assignee_id: 'sample-user-1',
        title: 'Implement Navigation',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        assignee: {
            id: 'sample-user-1',
            first_name: 'John',
            last_name: 'Doe',
        },
    },
    {
        id: 'sample-task-3',
        project_id: 'sample-project-1',
        assignee_id: 'sample-user-2',
        title: 'Setup Database',
        priority: 'URGENT',
        status: 'TODO',
        assignee: {
            id: 'sample-user-2',
            first_name: 'Jane',
            last_name: 'Smith',
        },
    },
];
