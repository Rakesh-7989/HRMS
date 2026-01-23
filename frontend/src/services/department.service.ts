import api from './api';

export interface Department {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateDepartmentData {
  name: string;
  description?: string;
}

export interface UpdateDepartmentData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export const departmentService = {
  getDepartments: async (): Promise<Department[]> => {
    const response = await api.get<{ status: string; data: Department[] }>('/departments');
    return response.data.data || [];
  },

  getDepartmentById: async (id: string): Promise<Department> => {
    const response = await api.get<{ status: string; data: Department }>(`/departments/${id}`);
    return response.data.data!;
  },

  createDepartment: async (data: CreateDepartmentData): Promise<Department> => {
    const response = await api.post<{ status: string; data: Department }>('/departments', data);
    return response.data.data!;
  },

  updateDepartment: async (id: string, data: UpdateDepartmentData): Promise<Department> => {
    const response = await api.patch<{ status: string; data: Department }>(`/departments/${id}`, data);
    return response.data.data!;
  },

  deleteDepartment: async (id: string): Promise<void> => {
    await api.delete(`/departments/${id}`);
  },
};

