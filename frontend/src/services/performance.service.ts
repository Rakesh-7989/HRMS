import api from './api';

export interface ReviewCycle {
  id: string;
  title: string;
  period: string;
  start_date: string;
  end_date: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  review_type: 'ANNUAL' | 'HALF_YEARLY' | 'QUARTERLY' | 'MONTHLY';
  created_at: string;
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  cycle_id: string;
  reviewer_id: string;
  rating: number;
  comments: string;
  status: 'PENDING' | 'SUBMITTED' | 'ACKNOWLEDGED';
  employee?: { first_name: string; last_name: string; email: string };
  reviewer?: { first_name: string; last_name: string };
  created_at: string;
  submitted_at?: string;
}

export interface Goal {
  id: string;
  employee_id: string;
  title: string;
  description: string;
  category: 'KPI' | 'OKR' | 'DEVELOPMENT' | 'PROJECT';
  target_value?: number;
  current_value?: number;
  start_date: string;
  end_date: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'ACHIEVED' | 'CANCELLED';
  employee?: { first_name: string; last_name: string };
}

export interface FeedbackRequest {
  id: string;
  employee_id: string;
  requester_id: string;
  message: string;
  status: 'PENDING' | 'SUBMITTED';
  response?: string;
  created_at: string;
  responded_at?: string;
  employee?: { first_name: string; last_name: string };
  requester?: { first_name: string; last_name: string };
}

export interface ReviewTemplate {
  id: string;
  name: string;
  rating_scale: number;
  sections: Array<{ name: string; weight: number; max_score: number }>;
  is_active: boolean;
}

export const performanceService = {
  // Review Cycles
  getCycles: () => api.get<ReviewCycle[]>('/performance/cycles'),
  getCycle: (id: string) => api.get<ReviewCycle>(`/performance/cycles/${id}`),
  createCycle: (data: Partial<ReviewCycle>) => api.post('/performance/cycles', data),
  updateCycle: (id: string, data: Partial<ReviewCycle>) => api.put(`/performance/cycles/${id}`, data),
  closeCycle: (id: string) => api.post(`/performance/cycles/${id}/close`),

  // Reviews
  getReviews: (cycleId?: string) =>
    api.get<PerformanceReview[]>('/performance/reviews', { params: { cycle_id: cycleId } }),
  getMyReviews: () => api.get<PerformanceReview[]>('/performance/reviews/my'),
  submitReview: (id: string, data: { rating: number; comments: string }) =>
    api.put(`/performance/reviews/${id}`, data),
  acknowledgeReview: (id: string) => api.post(`/performance/reviews/${id}/acknowledge`),

  // Goals
  getGoals: (employeeId?: string) =>
    api.get<Goal[]>('/performance/goals', { params: { employee_id: employeeId } }),
  getMyGoals: () => api.get<Goal[]>('/performance/goals/my'),
  createGoal: (data: Partial<Goal>) => api.post('/performance/goals', data),
  updateGoal: (id: string, data: Partial<Goal>) => api.put(`/performance/goals/${id}`, data),
  updateGoalProgress: (id: string, currentValue: number) =>
    api.patch(`/performance/goals/${id}`, { current_value: currentValue }),

  // Feedback
  getFeedbackRequests: () => api.get<FeedbackRequest[]>('/performance/feedback'),
  getPendingFeedback: () => api.get<FeedbackRequest[]>('/performance/feedback/pending'),
  requestFeedback: (data: { employee_id: string; message: string }) =>
    api.post('/performance/feedback', data),
  submitFeedback: (id: string, response: string) =>
    api.put(`/performance/feedback/${id}`, { response }),

  // Settings / Templates
  getTemplates: () => api.get<ReviewTemplate[]>('/performance/templates'),
  createTemplate: (data: Partial<ReviewTemplate>) => api.post('/performance/templates', data),
  updateTemplate: (id: string, data: Partial<ReviewTemplate>) =>
    api.put(`/performance/templates/${id}`, data),
};
