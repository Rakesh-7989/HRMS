import api from './api';

export interface ComplianceReport {
  id: string;
  type: 'PF' | 'ESI' | 'PT' | 'LWF' | 'FORM_16';
  title: string;
  period: string;
  month: number;
  year: number;
  status: 'GENERATING' | 'READY' | 'FAILED';
  file_url?: string;
  file_size?: number;
  generated_at: string;
  employee_count: number;
  total_amount?: number;
}

export interface ComplianceSummary {
  type: string;
  label: string;
  due_date: string;
  status: 'COMPLIED' | 'PENDING' | 'OVERDUE';
  month: number;
  year: number;
  total_employees: number;
  total_amount: number;
}

export const complianceService = {
  getReports: (type?: string) =>
    api.get<ComplianceReport[]>('/compliance/reports', { params: { type } }),

  generateReport: (type: string, month: number, year: number) =>
    api.post('/compliance/reports/generate', { type, month, year }),

  downloadReport: (id: string) =>
    api.get(`/compliance/reports/${id}/download`, { responseType: 'blob' }),

  getSummary: () =>
    api.get<ComplianceSummary[]>('/compliance/summary'),

  getForm16: (employeeId: string, year: number) =>
    api.get(`/compliance/form16/${employeeId}`, { params: { year }, responseType: 'blob' }),
};
