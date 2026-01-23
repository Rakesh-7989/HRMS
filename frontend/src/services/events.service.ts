import api from './api';

export interface PersonEvent {
  id: string | number;
  name: string;
  date: string; // short format like 'Jan 02' or ISO
  note?: string;
}

export type PeopleEventsResponse = {
  birthdays?: PersonEvent[];
  anniversaries?: PersonEvent[];
  joiners?: PersonEvent[];
};

export const eventsService = {
  // scope can be: system, organization, hr, team, personal
  getPeopleEvents: async (scope?: string): Promise<PeopleEventsResponse> => {
    const params = scope ? { scope } : {};
    const response = await api.get<{ status: string; data: PeopleEventsResponse }>('/events/people', { params });
    return response.data?.data || {};
  },
};
