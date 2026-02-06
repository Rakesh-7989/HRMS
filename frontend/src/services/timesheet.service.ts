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
     * Create a weekly timesheet (bulk entries)
     * POST /api/projects/timesheets
     */
    createWeeklyTimesheet: async (data: {
        project_id?: string;
        week_start_date: string;
        week_end_date: string;
        entries: {
            task_id?: string;
            work_date: string;
            hours: number;
            notes?: string;
        }[];
    }): Promise<Timesheet> => {
        const response = await api.post<{ status: string; data: Timesheet }>(
            '/projects/timesheets',
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
    /**
     * Get aggregated dashboard data
     * Single efficient call instead of multiple parallel calls
     */
    getDashboardData: async (): Promise<{
        stats: TimesheetDashboardStats;
        charts: TimesheetDashboardCharts;
        breakdown: TimesheetDashboardBreakdown;
    }> => {
        // Fetch last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const response = await api.get<{ status: string; data: any[] }>('/projects/timesheets/my-entries', {
            params: {
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                limit: 1000
            }
        });
        const entries = response.data.data || [];

        // --- Stats Calculation ---
        const totalHours = entries.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
        // Assuming we don't have a 'billable' flag on entry yet, we'll treat all as billable or 0 for now to avoid confusion.
        // User asked for "ASSIGNED" visibility. Let's assume for now everything is standard hours.
        // If we want to simulate billable without a flag, we can't really. Let's set it to totalHours for now or 0.
        // Let's check entry structure from backend service... it has project info.
        // For now, let's assume 0 billable if no flag, OR match total to avoid "0.00" confusion if they logged time.
        // Actually, valid "Billable" usually requires a flag. Let's assume 100% billable for simplicity or based on project type?
        // Let's stick to strict data: if no flag, we don't know. But standard behavior might be:
        const billableHours = totalHours; // Simplified: All hours logged are "billable" for this view until we have a flag.

        const totalWholeHours = Math.floor(totalHours);
        const totalMinutes = Math.round((totalHours - totalWholeHours) * 60);

        const billableWholeHours = Math.floor(billableHours);
        const billableMinutes = Math.round((billableHours - billableWholeHours) * 60);

        // --- Charts Calculation (Last 7 Days) ---
        const getPast7Days = () => {
            const dates = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                dates.push(d.toISOString().split('T')[0]);
            }
            return dates;
        };
        const last7Days = getPast7Days();

        const timeLogged = last7Days.map(date => {
            const daysEntries = entries.filter(e => e.work_date && e.work_date.startsWith(date));
            const hours = daysEntries.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
            const dateObj = new Date(date);
            return {
                date: `${dateObj.getDate()} ${dateObj.toLocaleString('default', { month: 'short' })}`,
                time: hours
            };
        });

        const billableVsNonBillable = last7Days.map(date => {
            const daysEntries = entries.filter(e => e.work_date && e.work_date.startsWith(date));
            const total = daysEntries.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
            return {
                date: new Date(date).getDate().toString(),
                billable: total, // Simplified as above
                nonBillable: 0
            };
        });

        // --- Breakdown Calculation ---
        const projectMap: Record<string, number> = {};
        const taskMap: Record<string, number> = {};

        entries.forEach(e => {
            const pName = e.project?.name || 'Unassigned';
            projectMap[pName] = (projectMap[pName] || 0) + (Number(e.hours) || 0);

            // Task breakdown - use task title
            const tName = e.task?.title || 'Unknown Task';
            // Or better, group by "Task Type" if we had it. We don't.
            // Let's group by Task Title for now, or Project Plans?
            taskMap[tName] = (taskMap[tName] || 0) + (Number(e.hours) || 0);
        });

        const projects = Object.keys(projectMap).map((name, i) => ({
            name,
            time: `${Math.round(projectMap[name] * 10) / 10}h`,
            color: ['bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-blue-500'][i % 4]
        }));

        const task_types = Object.keys(taskMap).slice(0, 5).map((name, i) => ({
            name,
            time: `${Math.round(taskMap[name] * 10) / 10}h`,
            color: ['bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-blue-500'][i % 4]
        }));

        return {
            stats: {
                total_time: {
                    hours: totalWholeHours,
                    minutes: totalMinutes,
                    trend: 0 // No trend data availability
                },
                billable_hours: {
                    hours: billableWholeHours,
                    minutes: billableMinutes,
                    trend: 0,
                    label: `${billableWholeHours}h${billableMinutes.toString().padStart(2, '0')}`
                },
                productivity_score: {
                    value: totalHours > 0 ? 100 : 0, // Mock score based on activity
                    trend: 0
                }
            },
            charts: {
                time_logged: timeLogged,
                billable_vs_non_billable: billableVsNonBillable
            },
            breakdown: {
                task_types: task_types,
                projects: projects,
                plans: [] // Empty if no specific plan data
            }
        };
    }
};
