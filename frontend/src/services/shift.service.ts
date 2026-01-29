import api from './api';

export interface Shift {
    id: string;
    name: string;
    code?: string;
    description?: string;
    start_time: string;
    end_time: string;
    break_start_time?: string;
    break_end_time?: string;
    grace_period_minutes?: number;
    is_active: boolean;
}

export const getShifts = async (): Promise<Shift[]> => {
    const response = await api.get<{ status: string; data: Shift[] }>('/shifts');
    return response.data.data;
};

export const createShift = async (data: Partial<Shift>): Promise<Shift> => {
    const response = await api.post<{ status: string; data: Shift }>('/shifts', data);
    return response.data.data;
};

export const updateShift = async (id: string, data: Partial<Shift>): Promise<Shift> => {
    const response = await api.put<{ status: string; data: Shift }>(`/shifts/${id}`, data);
    return response.data.data;
};

export const deleteShift = async (id: string): Promise<void> => {
    await api.delete(`/shifts/${id}`);
};

export const assignShift = async (shiftId: string, employeeIds: string[], assignToAll: boolean): Promise<any> => {
    const response = await api.post('/shifts/assign', { shiftId, employeeIds, assignToAll });
    return response.data;
};
