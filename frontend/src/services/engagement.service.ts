import api from './api';

export interface Survey {
  id: string;
  title: string;
  description: string;
  type: 'PULSE' | 'eNPS' | 'CUSTOM';
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  starts_at: string;
  ends_at: string;
  questions: SurveyQuestion[];
  response_count?: number;
  total_count?: number;
  created_at: string;
}

export interface SurveyQuestion {
  id: string;
  question: string;
  type: 'RATING' | 'TEXT' | 'MULTIPLE_CHOICE' | 'YES_NO';
  options?: string[];
  required: boolean;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  employee_id: string;
  answers: Array<{ question_id: string; answer: string | number }>;
  submitted_at: string;
}

export interface Recognition {
  id: string;
  from_employee_id: string;
  to_employee_id: string;
  category: 'VALUES' | 'HELPING' | 'INNOVATION' | 'LEADERSHIP' | 'CUSTOMER' | 'TEAMWORK';
  message: string;
  badge?: string;
  created_at: string;
  from_employee?: { first_name: string; last_name: string };
  to_employee?: { first_name: string; last_name: string };
}

export interface Celebration {
  id: string;
  employee_id: string;
  type: 'BIRTHDAY' | 'WORK_ANNIVERSARY' | 'MARRIAGE_ANNIVERSARY' | 'PROMOTION' | 'ACHIEVEMENT';
  message?: string;
  date: string;
  employee?: { first_name: string; last_name: string; email: string };
}

export const engagementService = {
  getSurveys: () => api.get<Survey[]>('/engagement/surveys'),
  createSurvey: (data: Partial<Survey>) => api.post('/engagement/surveys', data),
  submitResponse: (surveyId: string, data: SurveyResponse['answers']) =>
    api.post(`/engagement/surveys/${surveyId}/respond`, { answers: data }),

  getRecognition: () => api.get<Recognition[]>('/engagement/recognition'),
  sendRecognition: (data: Partial<Recognition>) => api.post('/engagement/recognition', data),

  getCelebrations: (month?: number) =>
    api.get<Celebration[]>('/engagement/celebrations', { params: { month } }),
};
