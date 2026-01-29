import api from './api';
import { AxiosError } from 'axios';

// ============================================================================
// INTERFACES
// ============================================================================

export interface WFHRequest {
    id: string;
    tenant_id: string;
    employee_id: string;
    request_date: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    approved_by?: string;
    approved_at?: string;
    approval_comment?: string;
    rejected_by?: string;
    rejected_at?: string;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
    // Employee details (for manager view)
    first_name?: string;
    last_name?: string;
    email?: string;
    employee_code?: string;
    // Approver details
    approver_first_name?: string;
    approver_last_name?: string;
    rejecter_first_name?: string;
    rejecter_last_name?: string;
}

export interface CreateWFHRequestData {
    request_date: string;
    reason: string;
}

export interface ApproveWFHData {
    comment?: string;
}

export interface RejectWFHData {
    reason: string;
}

// Helper function to handle API errors
const handleApiError = (error: unknown): never => {
    if (error instanceof AxiosError) {
        const message = error.response?.data?.error || error.response?.data?.message || error.message;
        throw new Error(message);
    }
    throw error;
};

// Helper to extract data from response
const extractData = <T>(response: { data: T | { data: T; status?: string } }): T => {
    const responseData = response.data as any;
    if (responseData && typeof responseData === 'object' && 'data' in responseData) {
        return responseData.data;
    }
    return responseData;
};

// ============================================================================
// SERVICE
// ============================================================================

export const wfhService = {
    // Request WFH
    requestWFH: async (data: CreateWFHRequestData): Promise<WFHRequest> => {
        try {
            const response = await api.post('/wfh/request', data);
            return extractData(response);
        } catch (error) {
            return handleApiError(error);
        }
    },

    // Get my WFH requests
    getMyRequests: async (params?: { status?: string; from_date?: string; to_date?: string }): Promise<WFHRequest[]> => {
        try {
            const response = await api.get('/wfh/my-requests', { params });
            return extractData(response) || [];
        } catch (error) {
            console.error('Error fetching my WFH requests:', error);
            return [];
        }
    },

    // Get pending requests (for managers)
    getPendingRequests: async (): Promise<WFHRequest[]> => {
        try {
            const response = await api.get('/wfh/pending');
            return extractData(response) || [];
        } catch (error) {
            console.error('Error fetching pending WFH requests:', error);
            return [];
        }
    },

    // Approve WFH request
    approveRequest: async (id: string, data?: ApproveWFHData): Promise<WFHRequest> => {
        try {
            const response = await api.put(`/wfh/${id}/approve`, data || {});
            return extractData(response);
        } catch (error) {
            return handleApiError(error);
        }
    },

    // Reject WFH request
    rejectRequest: async (id: string, data: RejectWFHData): Promise<WFHRequest> => {
        try {
            const response = await api.put(`/wfh/${id}/reject`, data);
            return extractData(response);
        } catch (error) {
            return handleApiError(error);
        }
    },
};
