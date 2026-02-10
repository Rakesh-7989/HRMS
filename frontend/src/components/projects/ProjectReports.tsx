import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { projectsService } from '@/services/projects.service';
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from '@/components/ui/Table';
import { Users, Briefcase, Calendar, Download } from 'lucide-react';
import { cn } from '@/utils/cn';
import { toast } from 'react-hot-toast';

type ReportType = 'project' | 'client' | 'utilization';

export const ProjectReports: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ReportType>('project');
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Fetch Lists
    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsService.getProjects(),
        enabled: activeTab === 'project',
    });

    const { data: clients = [] } = useQuery({
        queryKey: ['clients'],
        queryFn: () => projectsService.getClients(),
        enabled: activeTab === 'client',
    });

    // Fetch Reports
    const { data: projectReport, isLoading: loadingProjectReport } = useQuery({
        queryKey: ['report', 'project', selectedProject, startDate, endDate],
        queryFn: () => projectsService.getProjectReport(selectedProject, { start_date: startDate, end_date: endDate }),
        enabled: activeTab === 'project' && !!selectedProject,
    });

    const { data: clientReport, isLoading: loadingClientReport } = useQuery({
        queryKey: ['report', 'client', selectedClient, startDate, endDate],
        queryFn: () => projectsService.getClientReport(selectedClient, { start_date: startDate, end_date: endDate }),
        enabled: activeTab === 'client' && !!selectedClient,
    });

    const { data: utilizationReport, isLoading: loadingUtilizationReport } = useQuery({
        queryKey: ['report', 'utilization', startDate, endDate],
        queryFn: () => projectsService.getUtilizationReport({ start_date: startDate, end_date: endDate }),
        enabled: activeTab === 'utilization',
    });

    // Helper function to download CSV
    const downloadCSV = (data: string[][], filename: string) => {
        const csvContent = data.map(row =>
            row.map(cell => {
                const escaped = String(cell ?? '').replace(/"/g, '""');
                return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')
                    ? `"${escaped}"`
                    : escaped;
            }).join(',')
        ).join('\n');

        // Add BOM for Excel compatibility
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;

        // Append to body, click, then remove after delay
        document.body.appendChild(link);
        link.click();

        // Delay cleanup to ensure download starts
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    };

    const handleExport = () => {
        const today = new Date().toISOString().split('T')[0];
        const dateRange = startDate && endDate ? `${startDate}_to_${endDate}` : today;

        try {
            if (activeTab === 'project' && projectReport) {
                const projectName = projects.find((p: any) => p.id === selectedProject)?.name || 'Project';
                const rows: string[][] = [
                    ['Project Report'],
                    ['Project', projectName],
                    ['Date Range', startDate && endDate ? `${startDate} to ${endDate}` : 'All time'],
                    ['Generated On', new Date().toLocaleString()],
                    [],
                    ['Summary'],
                    ['Total Hours', String(Number(projectReport.total_hours || 0).toFixed(2))],
                    ['Total Timesheets', String(projectReport.total_timesheets || 0)],
                ];
                downloadCSV(rows, `project_report_${projectName.replace(/\s+/g, '_')}_${dateRange}.csv`);
                toast.success('Project report exported successfully!');

            } else if (activeTab === 'client' && clientReport) {
                const clientName = clients.find((c: any) => c.id === selectedClient)?.name || 'Client';
                const rows: string[][] = [
                    ['Client Report'],
                    ['Client', clientName],
                    ['Date Range', startDate && endDate ? `${startDate} to ${endDate}` : 'All time'],
                    ['Generated On', new Date().toLocaleString()],
                    [],
                    ['Summary'],
                    ['Total Projects', String(clientReport.total_projects || 0)],
                    ['Total Hours', String(Number(clientReport.total_hours || 0).toFixed(2))],
                    ['Total Timesheets', String(clientReport.total_timesheets || 0)],
                    [],
                    ['Active Projects'],
                    ...(clientReport.projects || []).map((p: string) => [p]),
                ];
                downloadCSV(rows, `client_report_${clientName.replace(/\s+/g, '_')}_${dateRange}.csv`);
                toast.success('Client report exported successfully!');

            } else if (activeTab === 'utilization' && utilizationReport && utilizationReport.length > 0) {
                const rows: string[][] = [
                    ['Employee Utilization Report'],
                    ['Date Range', startDate && endDate ? `${startDate} to ${endDate}` : 'All time'],
                    ['Generated On', new Date().toLocaleString()],
                    [],
                    ['Employee Name', 'Email', 'Assigned Projects', 'Logged Hours', 'Utilization %'],
                    ...utilizationReport.map((emp: any) => [
                        `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
                        emp.email || '',
                        String(emp.projects_assigned || 0),
                        String(Number(emp.total_hours_logged || 0).toFixed(2)),
                        `${emp.utilization_percent || 0}%`,
                    ]),
                ];
                downloadCSV(rows, `utilization_report_${dateRange}.csv`);
                toast.success('Utilization report exported successfully!');

            } else {
                toast.error('No data available to export. Please select filters and load report first.');
            }
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export report. Please try again.');
        }
    };

    return (
        <div className="space-y-6">

            {/* Tabs & Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
                    <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('project')}
                            className={cn("px-4 py-2 text-sm font-medium rounded-md transition-colors", activeTab === 'project' ? "bg-white dark:bg-gray-900 shadow text-primary" : "text-gray-600 dark:text-gray-400 hover:text-gray-900")}
                        >
                            Project Report
                        </button>
                        <button
                            onClick={() => setActiveTab('client')}
                            className={cn("px-4 py-2 text-sm font-medium rounded-md transition-colors", activeTab === 'client' ? "bg-white dark:bg-gray-900 shadow text-primary" : "text-gray-600 dark:text-gray-400 hover:text-gray-900")}
                        >
                            Client Report
                        </button>
                        <button
                            onClick={() => setActiveTab('utilization')}
                            className={cn("px-4 py-2 text-sm font-medium rounded-md transition-colors", activeTab === 'utilization' ? "bg-white dark:bg-gray-900 shadow text-primary" : "text-gray-600 dark:text-gray-400 hover:text-gray-900")}
                        >
                            Utilization Report
                        </button>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    {activeTab === 'project' && (
                        <div className="md:col-span-2">
                            <Label>Select Project</Label>
                            <select
                                className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md text-sm"
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                            >
                                <option value="">-- Select Project --</option>
                                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    )}
                    {activeTab === 'client' && (
                        <div className="md:col-span-2">
                            <Label>Select Client</Label>
                            <select
                                className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md text-sm"
                                value={selectedClient}
                                onChange={(e) => setSelectedClient(e.target.value)}
                            >
                                <option value="">-- Select Client --</option>
                                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <Label>Start Date</Label>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div>
                        <Label>End Date</Label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                </div>
            </Card>

            {/* Content */}
            <div className="space-y-6">
                {/* PROJECT REPORT */}
                {activeTab === 'project' && (
                    loadingProjectReport ? <div>Loading...</div> : projectReport ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="p-6 flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                                        <Calendar className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Total Hours</p>
                                        <h3 className="text-2xl font-bold">{Number(projectReport.total_hours || 0).toFixed(2)}</h3>
                                    </div>
                                </Card>
                                <Card className="p-6 flex items-center gap-4">
                                    <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                                        <Users className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Total Timesheets</p>
                                        <h3 className="text-2xl font-bold">{projectReport.total_timesheets || 0}</h3>
                                    </div>
                                </Card>
                            </div>
                            {/* If backend returns employee breakdown, render here. Currently assuming totals mainly. */}
                        </>
                    ) : selectedProject ? <div className="text-center py-10 text-gray-500">No data found.</div> : <div className="text-center py-10 text-gray-500">Please select a project.</div>
                )}

                {/* CLIENT REPORT */}
                {activeTab === 'client' && (
                    loadingClientReport ? <div>Loading...</div> : clientReport ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="p-6 flex items-center gap-4">
                                    <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                                        <Briefcase className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Total Projects</p>
                                        <h3 className="text-2xl font-bold">{clientReport.total_projects || 0}</h3>
                                    </div>
                                </Card>
                                <Card className="p-6 flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                                        <Calendar className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Total Hours</p>
                                        <h3 className="text-2xl font-bold">{Number(clientReport.total_hours || 0).toFixed(2)}</h3>
                                    </div>
                                </Card>
                                <Card className="p-6 flex items-center gap-4">
                                    <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                                        <Users className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Total Timesheets</p>
                                        <h3 className="text-2xl font-bold">{clientReport.total_timesheets || 0}</h3>
                                    </div>
                                </Card>
                            </div>

                            <Card className="p-6">
                                <h3 className="text-lg font-semibold mb-4">Active Projects</h3>
                                <div className="flex flex-wrap gap-2">
                                    {clientReport.projects && clientReport.projects.map((p: string, idx: number) => (
                                        <span key={idx} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm">
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            </Card>
                        </>
                    ) : selectedClient ? <div className="text-center py-10 text-gray-500">No data found.</div> : <div className="text-center py-10 text-gray-500">Please select a client.</div>
                )}

                {/* UTILIZATION REPORT */}
                {activeTab === 'utilization' && (
                    loadingUtilizationReport ? <div>Loading...</div> : utilizationReport ? (
                        <Card className="overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Assigned Projects</TableHead>
                                        <TableHead className="text-right">Logged Hours</TableHead>
                                        <TableHead className="text-right">Utilization %</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {utilizationReport.map((emp: any) => (
                                        <TableRow key={emp.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-[10px] text-white font-bold">
                                                        {emp.first_name?.charAt(0)}{emp.last_name?.charAt(0)}
                                                    </div>
                                                    {emp.first_name} {emp.last_name}
                                                </div>
                                            </TableCell>
                                            <TableCell>{emp.email}</TableCell>
                                            <TableCell>{emp.projects_assigned}</TableCell>
                                            <TableCell className="text-right">{Number(emp.total_hours_logged || 0).toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                <span className={cn(
                                                    "px-2 py-1 rounded text-xs font-medium",
                                                    Number(emp.utilization_percent) > 80 ? "bg-red-100 text-red-700" :
                                                        Number(emp.utilization_percent) > 50 ? "bg-green-100 text-green-700" :
                                                            "bg-yellow-100 text-yellow-700"
                                                )}>
                                                    {emp.utilization_percent}%
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    ) : <div className="text-center py-10 text-gray-500">No utilization data available.</div>
                )}
            </div>
        </div>
    );
};
