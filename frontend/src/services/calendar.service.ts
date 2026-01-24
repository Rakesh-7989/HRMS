import api from './api';

export interface CalendarDay {
    date: string;
    day: string;
    is_weekend: string;
    holiday_name: string | null;
    holiday_type: 'Weekend' | 'Central' | 'State' | 'Company' | null;
}

export interface CompanyHoliday {
    id: number;
    tenant_id: string;
    date: string;
    holiday_name: string;
}

export interface CorporateAnnouncement {
    id: number;
    tenant_id: string;
    title: string;
    message: string;
    type: string;
    created_at: string;
}

export const calendarService = {
    getCalendar: async (month: number, year: number, state?: string): Promise<CalendarDay[]> => {
        const response = await api.get<{ status: string; data: CalendarDay[] }>('/calendar/view', {
            params: { month, year, state }
        });
        return response.data.data;
    },

    getStates: async (): Promise<string[]> => {
        const response = await api.get<{ status: string; data: string[] }>('/calendar/states');
        return response.data.data;
    },

    getCompanyHolidays: async (): Promise<CompanyHoliday[]> => {
        const response = await api.get<{ status: string; data: CompanyHoliday[] }>('/calendar/company/holidays');
        return response.data.data;
    },

    addCompanyHoliday: async (date: string, holiday_name: string): Promise<CompanyHoliday> => {
        const response = await api.post<{ status: string; data: CompanyHoliday }>('/calendar/company/holidays', {
            date,
            holiday_name
        });
        return response.data.data;
    },

    deleteCompanyHoliday: async (id: number): Promise<void> => {
        await api.delete(`/calendar/company/holidays/${id}`);
    },

    getAnnouncements: async (): Promise<CorporateAnnouncement[]> => {
        const response = await api.get<{ status: string; data: CorporateAnnouncement[] }>('/calendar/announcements');
        return response.data.data;
    },

    createAnnouncement: async (title: string, message: string, type: string = 'General'): Promise<CorporateAnnouncement> => {
        const response = await api.post<{ status: string; data: CorporateAnnouncement }>('/calendar/announcements', {
            title,
            message,
            type
        });
        return response.data.data;
    },

    deleteAnnouncement: async (id: number): Promise<void> => {
        await api.delete(`/calendar/announcements/${id}`);
    }
};

export default calendarService;
