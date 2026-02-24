import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { projectsService } from '@/services/projects.service';
import { Users, Briefcase, Calendar, Download, DollarSign, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { toast } from 'react-hot-toast';

type ReportType = 'project' | 'client';

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
                                    <div className="p-3 bg-violet-100 dark:bg-violet-900/20 rounded-full">
                                        <Calendar className="h-6 w-6 text-violet-600" />
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

                            {/* Financials Section */}
                            {projectReport.financials && (
                                <div className="mt-8 space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Financial Overview</h3>

                                    {/* Budget Overflow Warning */}
                                    {Number(projectReport.financials.wip_writeoff) > 0 && (
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4 flex items-start gap-4">
                                            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-full">
                                                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-red-800 dark:text-red-300">Budget Overflow Detected</h4>
                                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                                    The total billable value ({Number(projectReport.financials.total_billable_value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })})
                                                    has exceeded the project budget of {Number(projectReport.financials.budget).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.
                                                </p>
                                                <p className="text-sm font-semibold text-red-700 dark:text-red-300 mt-2">
                                                    WIP Write-off: {Number(projectReport.financials.wip_writeoff).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <Card className="p-6 flex items-center gap-4">
                                            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                                                <DollarSign className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Project Budget</p>
                                                <h3 className="text-2xl font-bold">
                                                    {Number(projectReport.financials.budget) > 0
                                                        ? Number(projectReport.financials.budget).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                                                        : 'No Limit'}
                                                </h3>
                                                <p className="text-xs text-gray-400 mt-1">{projectReport.financials.billing_type}</p>
                                            </div>
                                        </Card>

                                        <Card className="p-6 flex items-center gap-4">
                                            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-full">
                                                <DollarSign className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Billable Value</p>
                                                <h3 className="text-2xl font-bold">
                                                    {Number(projectReport.financials.total_billable_value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                                </h3>
                                                <p className="text-xs text-gray-400 mt-1">Total work value</p>
                                            </div>
                                        </Card>

                                        <Card className={cn("p-6 flex items-center gap-4", Number(projectReport.financials.wip_writeoff) > 0 ? "border-amber-500 border-2" : "")}>
                                            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                                                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Invoiced Amount</p>
                                                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                    {Number(projectReport.financials.invoiced_amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                                </h3>
                                                <p className="text-xs text-gray-400 mt-1">Actual billable</p>
                                            </div>
                                        </Card>
                                    </div>
                                </div>
                            )}
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
                                    <div className="p-3 bg-violet-100 dark:bg-violet-900/20 rounded-full">
                                        <Calendar className="h-6 w-6 text-violet-600" />
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


            </div>
        </div>
    );
};
