import api from './api';

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
  experience_min: number;
  experience_max: number;
  salary_min?: number;
  salary_max?: number;
  description: string;
  requirements: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  openings: number;
  created_at: string;
  published_at?: string;
  candidate_count?: number;
}

export interface Candidate {
  id: string;
  job_id: string;
  name: string;
  email: string;
  phone: string;
  resume_url?: string;
  source: 'WEBSITE' | 'REFERRAL' | 'PORTAL' | 'AGENCY' | 'DIRECT';
  status: 'NEW' | 'SCREENING' | 'INTERVIEW' | 'OFFERED' | 'HIRED' | 'REJECTED' | 'WITHDRAWN';
  experience_years: number;
  current_company?: string;
  current_designation?: string;
  expected_ctc?: number;
  current_ctc?: number;
  notice_period?: string;
  applied_at: string;
  job?: { title: string; department: string };
}

export interface Interview {
  id: string;
  candidate_id: string;
  job_id: string;
  round_name: string;
  interviewer_id: string;
  scheduled_at: string;
  duration_minutes: number;
  mode: 'IN_PERSON' | 'VIDEO' | 'PHONE';
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  feedback?: string;
  rating?: number;
  candidate?: { name: string; email: string };
  interviewer?: { first_name: string; last_name: string };
}

export const recruitmentService = {
  // Jobs
  getJobs: (status?: string) => api.get<JobPosting[]>('/recruitment/jobs', { params: { status } }),
  getJob: (id: string) => api.get<JobPosting>(`/recruitment/jobs/${id}`),
  createJob: (data: Partial<JobPosting>) => api.post('/recruitment/jobs', data),
  updateJob: (id: string, data: Partial<JobPosting>) => api.put(`/recruitment/jobs/${id}`, data),
  publishJob: (id: string) => api.post(`/recruitment/jobs/${id}/publish`),
  closeJob: (id: string) => api.post(`/recruitment/jobs/${id}/close`),

  // Candidates
  getCandidates: (jobId?: string) =>
    api.get<Candidate[]>('/recruitment/candidates', { params: { job_id: jobId } }),
  getCandidate: (id: string) => api.get<Candidate>(`/recruitment/candidates/${id}`),
  addCandidate: (data: FormData) => api.post('/recruitment/candidates', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateCandidateStatus: (id: string, status: string) =>
    api.patch(`/recruitment/candidates/${id}`, { status }),

  // Interviews
  getInterviews: (candidateId?: string) =>
    api.get<Interview[]>('/recruitment/interviews', { params: { candidate_id: candidateId } }),
  scheduleInterview: (data: Partial<Interview>) => api.post('/recruitment/interviews', data),
  updateInterview: (id: string, data: Partial<Interview>) =>
    api.put(`/recruitment/interviews/${id}`, data),
  submitInterviewFeedback: (id: string, data: { feedback: string; rating: number }) =>
    api.put(`/recruitment/interviews/${id}/feedback`, data),
};
