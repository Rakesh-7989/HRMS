import api from './api';

export interface Designation {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateDesignationData {
  name: string;
  description?: string;
}

export interface UpdateDesignationData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export const designationService = {
  getDesignations: async (params?: {
    is_active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Designation[]> => {
    const response = await api.get<{ status: string; list: Designation[] }>('/designations', { params });
    return response.data.list || [];
  },

  getDesignationById: async (id: string): Promise<Designation> => {
    const response = await api.get<{ status: string; designation: Designation }>(`/designations/${id}`);
    return response.data.designation!;
  },

  createDesignation: async (data: CreateDesignationData): Promise<Designation> => {
    const response = await api.post<{ status: string; result: Designation }>('/designations', data);
    return response.data.result!;
  },

  updateDesignation: async (id: string, data: UpdateDesignationData): Promise<Designation> => {
    const response = await api.patch<{ status: string; updated: Designation }>(`/designations/${id}`, data);
    return response.data.updated!;
  },

  deleteDesignation: async (id: string): Promise<void> => {
    await api.delete(`/designations/${id}`);
  },
};
