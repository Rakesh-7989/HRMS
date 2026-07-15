import React, { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';
import { Clock, CheckCircle2,
    Search, Filter,
    Calendar, TrendingUp, RefreshCw
} from 'lucide-react';
import { showToast } from '@/utils/toast';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { useTranslation } from 'react-i18next';

interface Arrear {
    id: string;
    employee_id: string;
    first_name: string;
    last_name: string;
    emp_code: string;
    month: number;
    year: number;
    amount: string;
    status: 'PENDING' | 'PAID' | 'CANCELLED';
    remarks: string;
    created_at: string;
}

interface Summary {
    pending_count: string;
    pending_amount: string;
    paid_amount: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const ArrearsPage: React.FC = () => {
  const { t: _t } = useTranslation();
    const [arrears, setArrears] = useState<Arrear[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [arrearsRes, summaryRes] = await Promise.all([
                api.get(`/payroll/arrears/list?status=${statusFilter}`),
                api.get('/payroll/arrears/summary')
            ]);
            setArrears(arrearsRes.data.data);
            setSummary(summaryRes.data.data);
        } catch (error) {
            console.error(error);
            showToast.error("Failed to load arrears data");
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatCurrency = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(num);
    };

    const filteredArrears = arrears.filter(a =>
        `${a.first_name} ${a.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.emp_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && !arrears.length) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center space-y-4">
                    <RefreshCw className="w-10 h-10 text-brand-500 animate-spin mx-auto" />
                    <p className="text-gray-500 animate-pulse">Fetching Arrears Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            {/* Header section with Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-elev-1 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                                <Clock className="w-5 h-5 text-amber-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Arrears</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                            {summary?.pending_count || 0}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">Total: {formatCurrency(summary?.pending_amount || 0)}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-elev-1 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Paid Arrears</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(summary?.paid_amount || 0)}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">Settled in past runs</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-brand-500 to-brand-600 p-6 rounded-2xl text-white shadow-elev-4 shadow-brand-500/20 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                        <TrendingUp className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                        <h4 className="font-semibold text-lg mb-2">Retroactive Insights</h4>
                        <p className="text-brand-100 text-sm mb-4">Automatically detecting salary mismatches from back-dated assignments.</p>
                        <Button
                            variant="primary"
                            className="bg-white/20 hover:bg-white/30 border-0 text-white w-full backdrop-blur-sm"
                            onClick={() => fetchData()}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" /> Sync Records
                        </Button>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-elev-1">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search employee or code..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-0 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            className="bg-transparent border-0 text-sm focus:ring-0 text-gray-600 dark:text-gray-300"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="PAID">Paid</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Arrears List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-elev-1 overflow-hidden">
                {(() => {
                    const columns = [
                        {
                            header: _t('common.employee'),
                            cell: (row: Arrear) => (
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-indigo-900/40 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold">
                                        {row.first_name[0]}{row.last_name[0]}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white uppercase tracking-tight">{row.first_name} {row.last_name}</p>
                                        <p className="text-xs text-gray-500">{row.emp_code}</p>
                                    </div>
                                </div>
                            ),
                        },
                        {
                            header: _t('common.forMonth'),
                            cell: (row: Arrear) => (
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                    <Calendar className="w-4 h-4 opacity-50" />
                                    {MONTHS[row.month - 1]} {row.year}
                                </div>
                            ),
                        },
                        {
                            header: _t('common.amount'),
                            cell: (row: Arrear) => (
                                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(row.amount)}</span>
                            ),
                        },
                        {
                            header: _t('common.status'),
                            cell: (row: Arrear) => (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${row.status === 'PAID'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20'
                                    }`}>
                                    {row.status}
                                </span>
                            ),
                        },
                        {
                            header: _t('common.remarks'),
                            cell: (row: Arrear) => (
                                <p className="text-gray-500 dark:text-gray-400 italic line-clamp-1 max-w-[200px]" title={row.remarks}>
                                    {row.remarks}
                                </p>
                            ),
                        },
                        {
                            header: _t('common.createdAt'),
                            cell: (row: Arrear) => (
                                <span className="text-gray-400 text-xs">{new Date(row.created_at).toLocaleDateString()}</span>
                            ),
                        },
                    ];
                    return (
                        <DataTable
                            columns={columns}
                            data={filteredArrears}
                            pageSize={10}
                            emptyMessage={_t('common.noResultsFound')}
                        />
                    );
                })()}
            </div>
        </div>
    );
};

