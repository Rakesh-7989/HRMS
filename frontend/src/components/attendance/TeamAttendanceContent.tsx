import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { attendanceService } from '@/services/attendance.service';
import { usersService, User } from '@/services/users.service';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

export const TeamAttendanceContent: React.FC = () => {
    const queryClient = useQueryClient();
    const [rejectionAttendanceId, setRejectionAttendanceId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const { data: users = [] } = useQuery<User[]>({
        queryKey: ['users'],
        queryFn: () => usersService.getUsers(),
    });

    const userMap = useMemo(() => {
        return users.reduce((acc, user) => {
            acc[user.id] = `${user.first_name} ${user.last_name}`;
            return acc;
        }, {} as Record<string, string>);
    }, [users]);

    const { data: allPendingCheckouts = [] } = useQuery({
        queryKey: ['attendance', 'all-pending'],
        queryFn: () => attendanceService.getPendingCheckouts(),
    });

    const { data: teamAttendance = [] } = useQuery({
        queryKey: ['attendance', 'team'],
        queryFn: () => attendanceService.getTeamAttendance(),
    });

    const { data: records = [] } = useQuery({
        queryKey: ['attendance', 'records'],
        queryFn: () => attendanceService.getAttendanceRecords({ limit: 50 }),
    });

    const approveAttendanceMutation = useMutation({
        mutationFn: (id: string) => attendanceService.approveAttendance(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
        },
    });

    const rejectAttendanceMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            attendanceService.rejectAttendance(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            setRejectionAttendanceId(null);
            setRejectionReason('');
        },
    });

    const autoApprovePendingMutation = useMutation({
        mutationFn: () => attendanceService.autoApprovePending(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
        },
    });

    return (
        <div className="space-y-6">
            {/* All Pending Checkouts (Admin/Manager) */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Pending Checkouts</h3>
                    <Button
                        onClick={() => autoApprovePendingMutation.mutate()}
                        isLoading={autoApprovePendingMutation.isPending}
                        disabled={allPendingCheckouts.length === 0}
                    >
                        Auto Approve
                    </Button>
                </div>
                {allPendingCheckouts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-muted">No pending checkouts</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Check In</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Device</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {allPendingCheckouts.map((att) => (
                                    <tr
                                        key={att.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                                    >
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{userMap[att.employee_id] || att.employee_id}</td>
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                                            {format(new Date(att.date), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{att.check_in_time || '-'}</td>
                                        <td className="py-3 px-4">
                                            {att.check_in_device && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium whitespace-nowrap">
                                                    IN: {att.check_in_device}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded text-xs font-medium'}
                                            >
                                                {att.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 space-x-2">
                                            <Button size="sm" variant="outline" onClick={() => approveAttendanceMutation.mutate(att.id)}>Approve</Button>
                                            <Button size="sm" variant="destructive" onClick={() => setRejectionAttendanceId(att.id)}>Reject</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Team Attendance (Manager) */}
            <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Team Attendance</h3>
                {teamAttendance.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-muted">No team attendance records found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Check In</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Check Out</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Device</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {teamAttendance.map((att) => (
                                    <tr
                                        key={att.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                                    >
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{userMap[att.employee_id] || att.employee_id}</td>
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                                            {format(new Date(att.date), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{att.check_in_time || '-'}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{att.check_out_time || '-'}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col gap-1">
                                                {att.check_in_device && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium whitespace-nowrap w-fit">
                                                        IN: {att.check_in_device}
                                                    </span>
                                                )}
                                                {att.check_out_device && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 font-medium whitespace-nowrap w-fit">
                                                        OUT: {att.check_out_device}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`px-2 py-0.5 rounded text-xs font-medium ${att.status === 'PRESENT' || att.status === 'APPROVED'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : att.status === 'REJECTED'
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    }`}
                                            >
                                                {att.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* All Records (Admin/HR/Manager) */}
            <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">All Attendance Records</h3>
                {records.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-muted">No records found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-light-border dark:border-dark-border">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Date</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Employee</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Check In</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Check Out</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Device</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((att) => (
                                    <tr
                                        key={att.id}
                                        className="border-b border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-white/5"
                                    >
                                        <td className="py-3 px-4 text-gray-900 dark:text-white">
                                            {format(new Date(att.date), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-muted">{userMap[att.employee_id] || att.employee_id}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-muted">{att.check_in_time || '-'}</td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-muted">{att.check_out_time || '-'}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col gap-1">
                                                {att.check_in_device && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium whitespace-nowrap w-fit">
                                                        IN: {att.check_in_device}
                                                    </span>
                                                )}
                                                {att.check_out_device && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 font-medium whitespace-nowrap w-fit">
                                                        OUT: {att.check_out_device}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-medium ${att.status === 'PRESENT' || att.status === 'APPROVED'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : att.status === 'REJECTED'
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    }`}
                                            >
                                                {att.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 space-x-2">
                                            {att.status !== 'APPROVED' && (
                                                <Button size="sm" variant="outline" onClick={() => approveAttendanceMutation.mutate(att.id)}>Approve</Button>
                                            )}
                                            {att.status !== 'REJECTED' && (
                                                <Button size="sm" variant="destructive" onClick={() => setRejectionAttendanceId(att.id)}>Reject</Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Dialog open={!!rejectionAttendanceId} onOpenChange={(open) => !open && setRejectionAttendanceId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Attendance</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="rejection-reason">Reason</Label>
                            <Input
                                id="rejection-reason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="e.g., Invalid request"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (rejectionAttendanceId) {
                                    rejectAttendanceMutation.mutate({
                                        id: rejectionAttendanceId,
                                        reason: rejectionReason,
                                    });
                                }
                            }}
                            isLoading={rejectAttendanceMutation.isPending}
                        >
                            Reject
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
