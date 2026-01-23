import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { payrollService } from '@/services/payroll.service';
import { dashboardService } from '@/services/dashboard.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { StatCard } from '@/components/dashboard/StatCard';
import { PieChart } from '@/components/charts/PieChart';
import { Users, CreditCard, FileText, IndianRupee, Banknote, PlayCircle, PlusCircle, Building2, Settings, Timer } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const formatINR = (amount: number | null | undefined) =>
    amount == null ? '—' : amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

interface PayrollSummaryProps {
    onNavigate: (tab: string) => void;
}

export const PayrollSummary: React.FC<PayrollSummaryProps> = ({ onNavigate }) => {
    const { user } = useAuth();

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
    const reimbursements = payrollData?.reimbursements ?? null;

    const { data: salaryComponents = [], isLoading: salaryLoading } = useQuery<Array<{ id: string; name: string; amount: number }>>({
        queryKey: ['payroll', 'salary-components'],
        queryFn: () => payrollService.listSalaryComponents(),
    });

    const { data: expensesList = [], isLoading: expensesLoading } = useQuery<Array<{ id: string; category: string; amount: number }>>({
        queryKey: ['payroll', 'expenses'],
        queryFn: () => payrollService.listExpenses(),
    });

    // Recent Transactions
    const { data: recentTransactions = [], isLoading: txLoading } = useQuery<Array<{ id: string; employee_id?: string; employee_name?: string; type: string; amount: number; tx_date: string }>>({
        queryKey: ['payroll', 'transactions'],
        queryFn: () => payrollService.listTransactions(),
        enabled: user?.role === 'ADMIN' || user?.role === 'HR',
    });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard title="Total Employees" value={totalEmployees} icon={Users} iconColor="text-secondary" isLoading={loading} />
                <StatCard title="Monthly Payroll" value={formatINR(monthlyPayroll)} icon={CreditCard} iconColor="text-primary" isLoading={loading} />
                <StatCard title="Pending Payslips" value={pendingPayslips} icon={FileText} iconColor="text-yellow-500" isLoading={loading} />
                <StatCard title="Reimbursements" value={formatINR(reimbursements)} icon={IndianRupee} iconColor="text-accent-green" isLoading={loading} />
                <StatCard title="Loans" value={formatINR(payrollData?.loans ?? 0)} icon={Banknote} iconColor="text-rose-500" isLoading={loading} />
            </div>

            {/* Quick Actions */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {[
                        { label: 'Run Payroll', icon: PlayCircle, color: 'text-primary', bg: 'bg-primary/10', border: 'hover:border-primary/50', hover: 'hover:bg-primary/5', action: 'payslips' },
                        { label: 'Fill Timesheet', icon: Timer, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'hover:border-blue-500/50', hover: 'hover:bg-blue-500/5', action: 'timesheets' },
                        { label: 'Add Expense', icon: PlusCircle, color: 'text-accent-green', bg: 'bg-accent-green/10', border: 'hover:border-accent-green/50', hover: 'hover:bg-accent-green/5', action: 'expenses' },
                        { label: 'Apply Loan', icon: Banknote, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'hover:border-rose-500/50', hover: 'hover:bg-rose-500/5', action: 'loans' },
                        { label: 'Vendor Payment', icon: Building2, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'hover:border-yellow-500/50', hover: 'hover:bg-yellow-500/5', action: 'merchants', roles: ['ADMIN', 'HR', 'MANAGER'] },
                        { label: 'Salary Structure', icon: Settings, color: 'text-secondary', bg: 'bg-secondary/10', border: 'hover:border-secondary/50', hover: 'hover:bg-secondary/5', action: 'salary_details', roles: ['ADMIN', 'HR'] },
                    ].map((item) => {
                        if (item.roles && !item.roles.includes(user?.role || '')) return null;
                        const Icon = item.icon;
                        return (
                            <Button
                                key={item.label}
                                variant="outline"
                                className={`h-auto py-4 flex flex-col gap-2 transition-all ${item.hover} ${item.border}`}
                                onClick={() => onNavigate(item.action)}
                            >
                                <div className={`p-2 rounded-full ${item.bg} ${item.color}`}>
                                    <Icon size={20} />
                                </div>
                                <span className="font-medium">{item.label}</span>
                            </Button>
                        );
                    })}
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <Card>
                    <h3 className="text-lg font-semibold mb-4">Salary Component Distribution</h3>
                    {salaryLoading ? (
                        <div className="h-[280px] flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                        </div>
                    ) : (salaryComponents.length === 0 ? (
                        <div className="h-[280px] flex items-center justify-center text-muted-foreground">No salary components</div>
                    ) : (
                        <PieChart
                            data={useMemo(() => salaryComponents.map((s) => ({ name: s.name, value: Number(s.amount) })), [salaryComponents])}
                            height={280}
                            animated={false}
                        />
                    ))}
                </Card>

                <Card>
                    <h3 className="text-lg font-semibold mb-4">Expense Breakdown</h3>
                    {expensesLoading ? (
                        <div className="h-[280px] flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                        </div>
                    ) : (expensesList.length === 0 ? (
                        <div className="h-[280px] flex items-center justify-center text-muted-foreground">No expenses</div>
                    ) : (
                        <PieChart
                            data={useMemo(() => {
                                const map = new Map<string, number>();
                                expensesList.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + Number(e.amount)));
                                return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
                            }, [expensesList])}
                            height={280}
                            animated={false}
                        />
                    ))}
                </Card>
            </div>

            <div className="mt-6">
                <Card>
                    <h3 className="text-lg font-semibold mb-4">Recent Payroll Transactions</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Loan Type</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {txLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center p-4">Loading...</TableCell></TableRow>
                            ) : (recentTransactions.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center p-4">No recent transactions</TableCell></TableRow>
                            ) : (
                                recentTransactions.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell>{(t as any).employee_name || t.employee_id || '—'}</TableCell>
                                        <TableCell>{(t as any).loan_type_name || (t as any).loanType || '—'}</TableCell>
                                        <TableCell>{t.type}</TableCell>
                                        <TableCell>{formatINR(t.amount)}</TableCell>
                                        <TableCell>{t.tx_date}</TableCell>
                                    </TableRow>
                                ))
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </div>
    );
};
