import api from './api';

export interface HierarchyPosition {
    id: string;
    name: string;
    short_name: string; // e.g., CEO, VP
    level: number;
    parent_position_id: string | null;
    department_id: string | null;
    department_name?: string;
    is_active: boolean;
    children?: HierarchyPosition[];
    employee_count?: number; // Optional count from backend
    employees?: any[]; // Optional list of employees in this position
}

export const hierarchyService = {
    // Get the full hierarchy tree
    getHierarchy: async () => {
        const response = await api.get('/hierarchy');
        return response.data;
    },

    // Create a new position
    createPosition: async (data: Partial<HierarchyPosition>) => {
        const response = await api.post('/hierarchy/positions', data);
        return response.data;
    },

    // Update an existing position
    updatePosition: async (id: string, data: Partial<HierarchyPosition>) => {
        const response = await api.put(`/hierarchy/positions/${id}`, data);
        return response.data;
    },

    // Delete a position
    deletePosition: async (id: string) => {
        const response = await api.delete(`/hierarchy/positions/${id}`);
        return response.data;
    }
};
