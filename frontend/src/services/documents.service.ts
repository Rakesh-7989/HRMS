import api from './api';

export interface EmployeeDocument {
    id: string;
    tenant_id: string;
    employee_id: string;
    file_name: string;
    file_url: string;
    file_type?: string;
    created_at: string;
    created_by?: string;
}

export const documentsService = {
    getDocuments: async (employeeId: string): Promise<EmployeeDocument[]> => {
        const response = await api.get<{ status: string; documents: EmployeeDocument[] }>(`/documents/employee/${employeeId}`);
        return response.data.documents || [];
    },

    uploadDocument: async (employeeId: string, data: { file_name: string; file_url: string; file_type?: string }): Promise<EmployeeDocument> => {
        const response = await api.post<{ status: string; document: EmployeeDocument }>(`/documents/employee/${employeeId}`, data);
        return response.data.document;
    },

    deleteDocument: async (id: string): Promise<{ message: string }> => {
        const response = await api.delete<{ status: string; message: string }>(`/documents/${id}`);
        return response.data;
    },
};
