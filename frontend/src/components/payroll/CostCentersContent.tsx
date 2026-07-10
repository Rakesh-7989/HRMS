import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollService } from '@/services/payroll.service';
import { usersService } from '@/services/users.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { StatCard } from '@/components/dashboard/StatCard';
import { CreditCard, FileText, Users, Banknote, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-hot-toast';

const formatINR = (amount: number | null | undefined) =>
    amount == null ? '—' : amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

export const CostCentersContent: React.FC = () => {
    const queryClient = useQueryClient();
    const [addAllocOpen, setAddAllocOpen] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [selectedCC, setSelectedCC] = useState('');
    const [percentage, setPercentage] = useState<number>(100);

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

    const { data: allocations = [], isLoading: allocationsLoading } = useQuery<any[]>({
        queryKey: ['payroll', 'cost-centre-allocations'],
        queryFn: () => payrollService.getCostCentreAllocations(),
    });

    const { data: employeesResult } = useQuery({
        queryKey: ['users', 'list'],
        queryFn: () => usersService.getUsers(),
    });
    const employees = Array.isArray(employeesResult) ? employeesResult : (employeesResult?.data || []);

    const upsertMutation = useMutation({
        mutationFn: (payload: { costCentreId: string; employeeId: string; allocationPercentage: number }) =>
            payrollService.upsertCostCentreAllocation(payload),
        onSuccess: () => {
            toast.success('Allocation saved successfully');
            queryClient.invalidateQueries({ queryKey: ['payroll', 'cost-centre-allocations'] });
            setAddAllocOpen(false);
            setSelectedEmp('');
            setSelectedCC('');
            setPercentage(100);
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to save allocation');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => payrollService.deleteCostCentreAllocation(id),
        onSuccess: () => {
            toast.success('Allocation removed');
            queryClient.invalidateQueries({ queryKey: ['payroll', 'cost-centre-allocations'] });
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to remove allocation');
        }
    });

    const handleSaveAllocation = () => {
        if (!selectedEmp || !selectedCC) {
            toast.error('Please select both employee and cost center');
            return;
        }
        upsertMutation.mutate({
            employeeId: selectedEmp,
            costCentreId: selectedCC,
            allocationPercentage: percentage
        });
    };

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

    const totalAllocated = displayCostCenters.reduce((s, c) => s + (Number((c as any).allocated || (c as any).budget_allocated || 0)), 0);
    const totalSpent = displayCostCenters.reduce((s, c) => s + (Number((c as any).spent || (c as any).budget_utilized || 0)), 0);

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
                            const allocated = Number(c.allocated || c.budget_allocated || 0);
                            const spent = Number(c.spent || c.budget_utilized || 0);
                            const remaining = allocated - spent;
                            const used = allocated ? Math.round(((spent / allocated) * 100)) : 0;
                            return (
                                <TableRow key={c.id}>
                                    <TableCell>{c.name}</TableCell>
                                    <TableCell>{formatINR(allocated)}</TableCell>
                                    <TableCell>{formatINR(spent)}</TableCell>
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
                    <h3 className="text-lg font-semibold">Employee Allocations</h3>
                    <Button size="sm" onClick={() => setAddAllocOpen(true)}>
                        <Plus className="mr-2" size={14} /> Add Allocation
                    </Button>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Cost Center</TableHead>
                            <TableHead>Allocation %</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {allocationsLoading ? (
                            <TableRow><TableCell colSpan={4} className="text-center p-4">Loading...</TableCell></TableRow>
                        ) : allocations.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center p-4 text-muted-foreground">No allocations found</TableCell></TableRow>
                        ) : (
                            allocations.map((a: any) => (
                                <TableRow key={a.id}>
                                    <TableCell>
                                        <div className="font-medium">{a.first_name} {a.last_name}</div>
                                        <div className="text-xs text-muted-foreground">{a.emp_code}</div>
                                    </TableCell>
                                    <TableCell>{a.cost_centre_name}</TableCell>
                                    <TableCell>{a.allocation_percentage}%</TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => {
                                                if (confirm('Are you sure you want to remove this allocation?')) {
                                                    deleteMutation.mutate(a.id);
                                                }
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
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

            {/* Add Allocation Dialog */}
            <Dialog open={addAllocOpen} onOpenChange={setAddAllocOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Employee Allocation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="employee">Employee</Label>
                            <select
                                id="employee"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedEmp}
                                onChange={(e) => setSelectedEmp(e.target.value)}
                            >
                                <option value="">Select Employee</option>
                                {employees.map((e: any) => (
                                    <option key={e.id} value={e.employee_uuid || e.id}>
                                        {e.first_name} {e.last_name} ({e.employee_id || e.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="cost-center">Cost Center</Label>
                            <select
                                id="cost-center"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedCC}
                                onChange={(e) => setSelectedCC(e.target.value)}
                            >
                                <option value="">Select Cost Center</option>
                                {costCenters.map((cc: any) => (
                                    <option key={cc.id} value={cc.id}>{cc.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="percentage">Allocation Percentage (%)</Label>
                            <Input
                                id="percentage"
                                type="number"
                                min="0"
                                max="100"
                                value={percentage}
                                onChange={(e) => setPercentage(Number(e.target.value))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddAllocOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveAllocation} isLoading={upsertMutation.isPending}>Save Allocation</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
