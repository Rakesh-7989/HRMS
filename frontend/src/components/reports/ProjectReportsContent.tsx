import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
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

type ReportType = 'project' | 'client' | 'utilization';

export const ProjectReportsContent: React.FC = () => {
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

    const handleExport = () => {
        alert("Export functionality to be implemented.");
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
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <Label>Start Date</Label>
                        <div className="mt-1">
                            <DatePicker value={startDate} onChange={setStartDate} placeholder="Select start" />
                        </div>
                    </div>
                    <div>
                        <Label>End Date</Label>
                        <div className="mt-1">
                            <DatePicker value={endDate} onChange={setEndDate} placeholder="Select end" />
                        </div>
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
