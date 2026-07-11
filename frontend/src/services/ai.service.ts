import api from './api';

export interface AIInsight {
  type: 'attrition_risk' | 'sentiment_trend' | 'skill_gap' | 'hiring_recommendation' | 'performance_prediction';
  title: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_count?: number;
  recommendation?: string;
}

export interface ResumeParseResult {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience_years: number;
  education: Array<{ degree: string; institution: string; year: number }>;
  work_experience: Array<{ company: string; role: string; duration: string; highlights: string[] }>;
  certifications: string[];
}

export interface SentimentAnalysis {
  overall_score: number;
  trend: 'improving' | 'declining' | 'stable';
  categories: Array<{ name: string; score: number; volume: number }>;
  top_positive_keywords: string[];
  top_negative_keywords: string[];
}

export interface SkillGap {
  skill: string;
  current_level: number;
  required_level: number;
  gap: number;
  priority: 'low' | 'medium' | 'high';
  suggestions: string[];
}

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const aiService = {
  getInsights: () => api.get<AIInsight[]>('/ai/insights'),

  parseResume: (file: File) => {
    const formData = new FormData();
    formData.append('resume', file);
    return api.post<ResumeParseResult>('/ai/parse-resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  analyzeSentiment: (surveyId: string) =>
    api.get<SentimentAnalysis>(`/ai/sentiment/${surveyId}`),

  getSkillGaps: (employeeId: string, roleId?: string) =>
    api.get<SkillGap[]>(`/ai/skill-gaps/${employeeId}`, { params: { role_id: roleId } }),

  generateContent: (prompt: string, context?: string) =>
    api.post<{ content: string }>('/ai/generate', { prompt, context }),

  chat: (message: string, history?: AIChatMessage[]) =>
    api.post<{ response: string; suggestions?: string[] }>('/ai/chat', { message, history }),

  matchCandidates: (jobId: string) =>
    api.get<Array<{ candidate_id: string; score: number; strengths: string[]; gaps: string[] }>>(
      `/ai/match-candidates/${jobId}`
    ),
};
