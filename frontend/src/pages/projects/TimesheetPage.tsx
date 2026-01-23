import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, CheckCircle } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui/Table';
import { StatusBadge } from '@/components/projects/StatusBadge';
import { TimesheetEntryForm } from '@/components/projects/TimesheetEntryForm';
import { TimesheetApprovals } from '@/components/projects/TimesheetApprovals';

import { timesheetService } from '@/services/timesheet.service';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';

export const TimesheetPage: React.FC = () => {
    const { user } = useAuth();
    const canManage = ['ADMIN', 'MANAGER'].includes(user?.role || '');

    const isAdmin = user?.role === 'ADMIN';
    const [activeTab, setActiveTab] = useState<'my' | 'approvals'>(isAdmin ? 'approvals' : 'my');

    // Fetch My Timesheets
    const { data: timesheets = [], isLoading } = useQuery({
        queryKey: ['timesheets', 'my'],
        queryFn: () => timesheetService.getMyTimesheets(),
        enabled: !isAdmin || activeTab === 'my', // optimization
    });

    return (
        <DashboardLayout
            title="Timesheets"
            breadcrumbs={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Timesheet' },
            ]}
        >
            <div className="space-y-6">
                {/* Tabs */}
                {canManage && (
                    <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-4">
                        <button
                            onClick={() => setActiveTab('my')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
                                activeTab === 'my'
                                    ? "bg-primary/10 text-primary"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                        >
                            <Clock size={16} />
                            My Timesheets
                        </button>
                        <button
                            onClick={() => setActiveTab('approvals')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
                                activeTab === 'approvals'
                                    ? "bg-primary/10 text-primary"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                        >
                            <CheckCircle size={16} />
                            Approvals
                        </button>
                    </div>
                )}

                {activeTab === 'my' ? (
                    <>
                        {/* Entry Form - Hidden for Admins */}
                        {!isAdmin && (
                            <div className="mb-8">
                                <TimesheetEntryForm />
                            </div>
                        )}

                        {/* History Table */}
                        <Card className="p-0 overflow-hidden">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <Clock size={18} />
                                    Recent Entries
                                </h3>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Project</TableHead>
                                        <TableHead>Task</TableHead>
                                        <TableHead>Hours</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell className="text-center py-8" >
                                                Loading timesheets...
                                            </TableCell>
                                        </TableRow>
                                    ) : timesheets.length === 0 ? (
                                        <TableRow>
                                            <TableCell className="text-center py-8" >
                                                No timesheet entries found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        timesheets.map((entry) => (
                                            <TableRow key={entry.id}>
                                                <TableCell>
                                                    <span className="flex items-center gap-2">
                                                        <CalendarIcon size={14} className="text-gray-400" />
                                                        {format(new Date(entry.work_date), 'MMM dd, yyyy')}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{entry.project?.name || '-'}</TableCell>
                                                <TableCell>{entry.task?.title || '-'}</TableCell>
                                                <TableCell>{entry.hours} hrs</TableCell>
                                                <TableCell>
                                                    <StatusBadge type="timesheet" status={entry.status} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </>
                ) : (
                    <TimesheetApprovals />
                )}
            </div>
        </DashboardLayout>
    );
};
