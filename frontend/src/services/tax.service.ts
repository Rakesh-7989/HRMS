import api from './api';

export interface TaxSection {
    id: string;
    name: string;
    section: string;
    max_limit: number | null;
    description: string;
    regime_allowed: 'OLD' | 'NEW' | 'BOTH';
}

export interface TaxRegime {
    regime: 'OLD' | 'NEW' | null;
    is_frozen: boolean;
}

export interface ITDeclaration {
    id?: string;
    section_id: string;
    financial_year: string;
    declared_amount: number;
    approved_amount: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    proof_url: string | null;
    remarks: string | null;
    section_name?: string;
    section_code?: string;
    max_limit?: number;
}

export const taxService = {
    // Config
    getSections: async () => {
        const response = await api.get('/payroll/tax/sections');
        return response.data.data;
    },

    // Regime
    getRegime: async (fy: string) => {
        const response = await api.get(`/payroll/tax/regime?fy=${fy}`);
        return response.data.data;
    },

    setRegime: async (fy: string, regime: 'OLD' | 'NEW') => {
        const response = await api.post('/payroll/tax/regime', { fy, regime });
        return response.data.data;
    },

    // Declarations
    getDeclarations: async (fy: string) => {
        const response = await api.get(`/payroll/tax/declarations?fy=${fy}`);
        return response.data.data;
    },

    upsertDeclaration: async (payload: {
        id?: string;
        financialYear: string;
        sectionId: string;
        declaredAmount: number;
        proofUrl?: string;
    }) => {
        const response = await api.post('/payroll/tax/declarations', payload);
        return response.data.data;
    },

    deleteDeclaration: async (id: string) => {
        await api.delete(`/payroll/tax/declarations/${id}`);
    },

    // Form 16
    downloadForm16: async (fy: string, employeeId?: string) => {
        const response = await api.get('/payroll/tax/form16/part-b', {
            params: { fy, employeeId },
            responseType: 'blob', // Important for PDF
        });

        // Create a blob link to download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Form16_PartB_${fy}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    },
};
