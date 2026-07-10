import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { payrollService } from '@/services/payroll.service';
import { dashboardService } from '@/services/dashboard.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { PieChart } from '@/components/charts/PieChart';
import { Users, CreditCard, FileText, PlayCircle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const formatINR = (amount: number | null | undefined) =>
    amount == null ? '—' : amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

interface PayrollSummaryProps {
    onNavigate: (tab: string) => void;
}

export const PayrollSummary: React.FC<PayrollSummaryProps> = ({ onNavigate }) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const { data: orgData, isLoading: orgLoading } = useQuery({
        queryKey: ['dashboard', 'organization'],
        queryFn: () => dashboardService.getOrganizationDashboard(),
        enabled: user?.role === 'ADMIN' || user?.role === 'HR',
    });

    const { data: payrollData, isLoading: payrollLoading } = useQuery({
        queryKey: ['payroll', 'summary'],
        queryFn: () => payrollService.getSummary(),
    });

    const loading = orgLoading || payrollLoading;
    const totalEmployees = orgData?.orgMetrics?.total_employees ?? payrollData?.total_employees ?? 0;
    const monthlyPayroll = payrollData?.monthly_payroll ?? null;
    const pendingPayslips = payrollData?.pending_payslips ?? 0;

    const { data: salaryComponents = [], isLoading: salaryLoading } = useQuery<Array<{ id: string; name: string; amount: number }>>({
        queryKey: ['payroll', 'salary-components'],
        queryFn: () => payrollService.listSalaryComponents(),
    });

    // Recent Transactions
    const { data: recentTransactions = [], isLoading: txLoading } = useQuery<Array<{ id: string; employee_id?: string; employee_name?: string; type: string; amount: number; tx_date: string }>>({
        queryKey: ['payroll', 'transactions'],
        queryFn: () => payrollService.listTransactions(),
        enabled: user?.role === 'ADMIN' || user?.role === 'HR',
    });

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity text-gray-400">
                        <Users size={80} />
                    </div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Strength</p>
                    <h3 className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
                        {loading ? <div className="h-9 w-24 bg-gray-200 animate-pulse rounded" /> : totalEmployees}
                    </h3>
                    <div className="mt-4 flex items-center text-xs font-medium text-purple-500 bg-purple-50 dark:bg-purple-500/10 px-2 py-1 rounded w-fit">
                        Active Personnel
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity text-gray-400">
                        <CreditCard size={80} />
                    </div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estimated Monthly Payroll</p>
                    <h3 className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
                        {loading ? <div className="h-9 w-40 bg-gray-200 animate-pulse rounded" /> : formatINR(monthlyPayroll)}
                    </h3>
                    <div className="mt-4 flex items-center text-xs font-medium text-violet-500 bg-violet-50 dark:bg-violet-500/10 px-2 py-1 rounded w-fit">
                        Current Cycle
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity text-gray-400">
                        <FileText size={80} />
                    </div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Draft Payslips</p>
                    <h3 className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
                        {loading ? <div className="h-9 w-16 bg-gray-200 animate-pulse rounded" /> : pendingPayslips}
                    </h3>
                    <div className="mt-4 flex items-center text-xs font-medium text-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-500/10 px-2 py-1 rounded w-fit">
                        Action Required
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column - Actions and Chart */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Quick Launch */}
                    <Card className="p-6 border-none shadow-sm ring-1 ring-black/5 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-800/50">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <PlayCircle size={18} className="text-primary" />
                            Operations Center
                        </h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Process Monthly Payroll', icon: PlayCircle, color: 'primary', action: 'payslips' },
                                { label: 'Manage Salary Structures', icon: Settings, color: 'purple', action: 'salary_details', roles: ['ADMIN', 'HR'] },
                            ].map((item) => {
                                if (item.roles && !item.roles.includes(user?.role || '')) return null;
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.label}
                                        onClick={() => item.action === 'payslips' ? navigate('/payroll/dashboard') : onNavigate(item.action)}
                                        className="w-full flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/5 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                <Icon size={20} />
                                            </div>
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{item.label}</span>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                                            <PlayCircle size={16} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Salary Mix */}
                    <Card className="p-6 border-none shadow-sm ring-1 ring-black/5">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6">Payroll Allocation</h3>
                        {salaryLoading ? (
                            <div className="h-[240px] flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
                            </div>
                        ) : salaryComponents.length === 0 ? (
                            <div className="h-[240px] flex items-center justify-center text-xs text-gray-500">No active structures</div>
                        ) : (
                            <div className="relative h-[240px]">
                                <PieChart
                                    data={useMemo(() => salaryComponents.map((s) => ({ name: s.name, value: Number(s.amount) })), [salaryComponents])}
                                    height={240}
                                    animated={true}
                                />
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Column - Transactions Table */}
                <div className="lg:col-span-8">
                    <Card className="p-0 border-none shadow-sm ring-1 ring-black/5 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Transaction Logs</h3>
                                <p className="text-xs text-gray-500 mt-1">Real-time update of payroll activities</p>
                            </div>
                            <Button variant="outline" size="sm" className="text-xs font-bold uppercase tracking-tighter bg-white dark:bg-gray-900" onClick={() => onNavigate('payslips')}>
                                View History
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50/50 dark:bg-gray-900/50">
                                    <TableRow>
                                        <TableHead className="text-[10px] font-bold uppercase text-gray-400 px-6 py-4">Beneficiary</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-gray-400 px-6 py-4">Classification</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-gray-400 px-6 py-4">Valuation</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-gray-400 px-6 py-4">Timestamp</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {txLoading ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-12">Fetching logs...</TableCell></TableRow>
                                    ) : recentTransactions.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-12 text-gray-500">No activity recorded</TableCell></TableRow>
                                    ) : (
                                        recentTransactions.map((t) => (
                                            <TableRow key={t.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 border-gray-50 dark:border-gray-800 transition-colors">
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                            {(t as any).employee_name?.[0] || 'E'}
                                                        </div>
                                                        <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">
                                                            {(t as any).employee_name || t.employee_id || '—'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                                                        {t.type}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 font-bold text-sm text-gray-900 dark:text-white">
                                                    {formatINR(t.amount)}
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-xs text-gray-500 font-medium">
                                                    {t.tx_date}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
