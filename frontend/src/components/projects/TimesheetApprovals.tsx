import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Check, X } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui/Table';

import { timesheetService } from '@/services/timesheet.service';

export const TimesheetApprovals: React.FC = () => {
    const queryClient = useQueryClient();

    // Fetch Pending Approvals
    const { data: timesheets = [], isLoading } = useQuery({
        queryKey: ['timesheets', 'approvals'],
        queryFn: () => timesheetService.getPendingApprovals(),
    });

    // Approve Mutation
    const approveMutation = useMutation({
        mutationFn: timesheetService.approveTimesheet,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            // alert('Timesheet approved');
        },
        onError: () => {
            alert('Failed to approve timesheet');
        },
    });

    const handleApprove = (id: string) => {
        if (window.confirm('Are you sure you want to approve this timesheet entry?')) {
            approveMutation.mutate({ timesheet_id: id });
        }
    };

    return (
        <div className="space-y-6">
            <Card className="p-0 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead>Task</TableHead>
                            <TableHead>Hours</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell className="text-center py-8" >
                                    Loading approvals...
                                </TableCell>
                            </TableRow>
                        ) : timesheets.length === 0 ? (
                            <TableRow>
                                <TableCell className="text-center py-8" >
                                    No pending approvals.
                                </TableCell>
                            </TableRow>
                        ) : (
                            timesheets.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm text-primary font-medium">
                                                {entry.employee?.first_name.charAt(0)}
                                            </div>
                                            <span className="font-medium">
                                                {entry.employee ? `${entry.employee.first_name} ${entry.employee.last_name}` : 'Unknown'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(entry.work_date), 'MMM dd, yyyy')}
                                    </TableCell>
                                    <TableCell>{entry.project?.name || '-'}</TableCell>
                                    <TableCell>{entry.task?.title || '-'}</TableCell>
                                    <TableCell className="font-medium">{entry.hours} hrs</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => handleApprove(entry.id)}
                                            >
                                                <Check size={16} className="mr-1" />
                                                Approve
                                            </Button>
                                            {/* Reject button not implemented as per spec/service */}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
};
