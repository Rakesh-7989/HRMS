import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { payrollService } from '@/services/finance/payroll.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { StatCard } from '@/components/dashboard/StatCard';
import { CreditCard, FileText, Users, Banknote } from 'lucide-react';

const formatINR = (amount: number | null | undefined) =>
    amount == null ? '—' : amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

export const CostCentersContent: React.FC = () => {
    const { data: costCenters = [], isLoading: costCentersLoading } = useQuery<any[]>({
        queryKey: ['payroll', 'cost-centers'],
        queryFn: () => payrollService.listCostCenters(),
    });

    const { data: projectAllocations = [], isLoading: projectAllocLoading } = useQuery<any[]>({
        queryKey: ['payroll', 'project-allocations'],
        queryFn: () => payrollService.listProjectAllocations(),
    });

    const { data: costCenterReports = [], isLoading: ccReportsLoading } = useQuery<any[]>({
        queryKey: ['payroll', 'cost-center-reports'],
        queryFn: () => payrollService.getCostCenterReports(),
    });

    const demoCostCenters = [
        { id: 'cc_eng', name: 'Engineering', allocated: 120000, spent: 80000 },
        { id: 'cc_sales', name: 'Sales', allocated: 80000, spent: 60000 },
        { id: 'cc_marketing', name: 'Marketing', allocated: 40000, spent: 22000 },
    ];

    const demoProjects = [
        { id: 'p1', project_name: 'Project A', department: 'Engineering', allocated: 60000, spent: 40000 },
        { id: 'p2', project_name: 'Project B', department: 'Sales', allocated: 30000, spent: 20000 },
        { id: 'p3', project_name: 'Project C', department: 'Marketing', allocated: 20000, spent: 12000 },
    ];

    const displayCostCenters = (costCenters && costCenters.length) ? costCenters : demoCostCenters;
    const displayProjects = (projectAllocations && projectAllocations.length) ? projectAllocations : demoProjects;

    const totalAllocated = displayCostCenters.reduce((s, c) => s + (Number((c as any).allocated || 0)), 0);
    const totalSpent = displayCostCenters.reduce((s, c) => s + (Number((c as any).spent || 0)), 0);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Allocation" value={formatINR(totalAllocated)} icon={CreditCard} iconColor="text-primary" isLoading={costCentersLoading} />
                <StatCard title="Total Spent" value={formatINR(totalSpent)} icon={FileText} iconColor="text-yellow-500" isLoading={costCentersLoading} />
                <StatCard title="Departments" value={displayCostCenters.length} icon={Users} iconColor="text-secondary" isLoading={costCentersLoading} />
                <StatCard title="Projects" value={displayProjects.length} icon={Banknote} iconColor="text-accent-green" isLoading={projectAllocLoading} />
            </div>

            <Card>
                <h3 className="text-lg font-semibold mb-4">Department Breakdown</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Department</TableHead>
                            <TableHead>Allocated</TableHead>
                            <TableHead>Spent</TableHead>
                            <TableHead>Remaining</TableHead>
                            <TableHead>% Used</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {costCentersLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-center p-4">Loading...</TableCell></TableRow>
                        ) : displayCostCenters.map((c: any) => {
                            const remaining = Number(c.allocated || 0) - Number(c.spent || 0);
                            const used = c.allocated ? Math.round(((Number(c.spent || 0) / Number(c.allocated || 0)) * 100)) : 0;
                            return (
                                <TableRow key={c.id}>
                                    <TableCell>{c.name}</TableCell>
                                    <TableCell>{formatINR(c.allocated)}</TableCell>
                                    <TableCell>{formatINR(c.spent)}</TableCell>
                                    <TableCell>{formatINR(remaining)}</TableCell>
                                    <TableCell>{used}%</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Card>

            <Card>
                <h3 className="text-lg font-semibold mb-4">Project-wise Allocations</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Project</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Allocated</TableHead>
                            <TableHead>Spent</TableHead>
                            <TableHead>% Used</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {projectAllocLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-center p-4">Loading...</TableCell></TableRow>
                        ) : displayProjects.map((p: any) => {
                            const used = p.allocated ? Math.round(((Number(p.spent || 0) / Number(p.allocated || 0)) * 100)) : 0;
                            return (
                                <TableRow key={p.id}>
                                    <TableCell>{p.project_name}</TableCell>
                                    <TableCell>{p.department}</TableCell>
                                    <TableCell>{formatINR(p.allocated)}</TableCell>
                                    <TableCell>{formatINR(p.spent)}</TableCell>
                                    <TableCell>{used}%</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Card>

            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Reports by Cost Center</h3>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => {
                            if (!costCenterReports || !costCenterReports.length) return;
                            const headers = Object.keys(costCenterReports[0]);
                            const csv = [headers.join(','), ...costCenterReports.map((r: any) => headers.map(h => `"${r[h] ?? ''}"`).join(','))].join('\n');
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a'); a.href = url; a.download = 'cost-center-reports.csv'; a.click(); window.URL.revokeObjectURL(url);
                        }}><FileText className="mr-2" size={14} />Export CSV</Button>
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Center</TableHead>
                            <TableHead>Report</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Value</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ccReportsLoading ? (
                            <TableRow><TableCell colSpan={4} className="text-center p-4">Loading...</TableCell></TableRow>
                        ) : (costCenterReports.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center p-4">No reports</TableCell></TableRow>
                        ) : (
                            costCenterReports.map((r: any) => (
                                <TableRow key={r.id}>
                                    <TableCell>{r.center_name || r.center || '—'}</TableCell>
                                    <TableCell>{r.report_type || r.type || '—'}</TableCell>
                                    <TableCell>{r.date || r.report_date}</TableCell>
                                    <TableCell>{r.value ?? '—'}</TableCell>
                                </TableRow>
                            ))
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
};
