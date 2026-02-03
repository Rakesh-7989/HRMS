import api from './api';
import type {
    Timesheet,
    CreateTimesheetData,
    ApproveTimesheetData,
    TimesheetStatus,
    TimesheetDashboardStats,
    TimesheetDashboardCharts,
    TimesheetDashboardBreakdown,
} from '@/types/project.types';

/**
 * Timesheet Service
 * Handles all timesheet related API calls
 * Uses exact endpoints as defined in backend specification
 */
export const timesheetService = {
    /**
     * Get timesheets
     * GET /api/timesheet
     */
    /**
     * Get timesheets (Weekly sheets)
     * GET /api/projects/timesheets
     */
    getTimesheets: async (params?: {
        employee_id?: string;
        project_id?: string;
        status?: TimesheetStatus;
        week_start_date?: string;
        limit?: number;
        offset?: number;
    }): Promise<Timesheet[]> => {
        const response = await api.get<{ status: string; data: Timesheet[] }>(
            '/projects/timesheets',
            { params }
        );
        return response.data.data || [];
    },

    /**
     * Create/Log a timesheet entry
     * POST /api/projects/timesheets/entry
     */
    createTimesheet: async (data: CreateTimesheetData): Promise<Timesheet> => {
        const response = await api.post<{ status: string; data: Timesheet }>(
            '/projects/timesheets/entry',
            data
        );
        return response.data.data!;
    },

    /**
     * Submit a timesheet
     * PUT /api/projects/timesheets/:id/submit
     */
    submitTimesheet: async (id: string): Promise<Timesheet> => {
        const response = await api.put<{ status: string; data: Timesheet }>(
            `/projects/timesheets/${id}/submit`
        );
        return response.data.data!;
    },

    /**
     * Approve a timesheet
     * PUT /api/projects/timesheets/:id/approve
     */
    approveTimesheet: async (data: ApproveTimesheetData): Promise<Timesheet> => {
        const response = await api.put<{ status: string; data: Timesheet }>(
            `/projects/timesheets/${data.timesheet_id}/approve`,
            { notes: data.notes }
        );
        return response.data.data!;
    },

    /**
     * Reject a timesheet
     * PUT /api/projects/timesheets/:id/reject
     */
    rejectTimesheet: async (id: string, reason: string): Promise<Timesheet> => {
        const response = await api.put<{ status: string; data: Timesheet }>(
            `/projects/timesheets/${id}/reject`,
            { rejection_reason: reason }
        );
        return response.data.data!;
    },

    /**
     * Get pending timesheets for approval (for managers)
     * GET /api/projects/timesheets/pending-approvals
     */
    getPendingApprovals: async (params?: {
        limit?: number;
        offset?: number;
    }): Promise<Timesheet[]> => {
        const response = await api.get<{ status: string; data: Timesheet[] }>(
            '/projects/timesheets/pending-approvals',
            { params }
        );
        return response.data.data || [];
    },

    /**
     * Get my timesheet entries
     * GET /api/projects/timesheets/my-entries
     */
    getMyTimesheets: async (params?: {
        project_id?: string;
        week_start_date?: string;
        start_date?: string;
        end_date?: string;
        limit?: number;
        offset?: number;
    }): Promise<Timesheet[]> => {
        const response = await api.get<{ status: string; data: Timesheet[] }>(
            '/projects/timesheets/my-entries',
            { params }
        );
        return response.data.data || [];
    },

    /**
     * Bulk approve timesheets
     * POST /api/projects/timesheets/bulk-approve
     */
    bulkApproveTimesheets: async (timesheetIds: string[]): Promise<{ results: string[]; errors: any[] }> => {
        const response = await api.post<{ status: string; data: { results: string[]; errors: any[] } }>(
            '/projects/timesheets/bulk-approve',
            { timesheetIds }
        );
        return response.data.data;
    },


    /**
     * Get dashboard stats
     * GET /api/projects/dashboard/stats
     */
    getDashboardStats: async (): Promise<TimesheetDashboardStats> => {
        const response = await api.get<{ status: string; data: TimesheetDashboardStats }>(
            '/projects/dashboard/stats'
        );
        return response.data.data!;
    },

    /**
     * Get dashboard charts data
     * GET /api/projects/dashboard/charts
     */
    getDashboardCharts: async (): Promise<TimesheetDashboardCharts> => {
        const response = await api.get<{ status: string; data: TimesheetDashboardCharts }>(
            '/projects/dashboard/charts'
        );
        return response.data.data!;
    },

    /**
     * Get dashboard breakdown data
     * GET /api/projects/dashboard/breakdown
     */
    getDashboardBreakdown: async (): Promise<TimesheetDashboardBreakdown> => {
        const response = await api.get<{ status: string; data: TimesheetDashboardBreakdown }>(
            '/projects/dashboard/breakdown'
        );
        return response.data.data!;
    },
};
