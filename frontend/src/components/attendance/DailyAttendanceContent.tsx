import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { attendanceService } from '@/services/attendance.service';
import { wfhService } from '@/services/wfh.service';
import { geoFencingService } from '@/services/geoFencing.service';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, MapPin, Search, Coffee } from 'lucide-react';
import { format } from 'date-fns';
import { detectDeviceType } from '@/utils/deviceDetection';
import { formatTime12Hour, formatDuration, calculateWorkDuration, getCurrentDate } from '@/utils/timeFormat';
import { useConfirm } from '@/contexts/ConfirmContext';
import { usePermissions } from '@/contexts/PermissionsContext';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { DataTable } from '@/components/ui/DataTable';
import { SkeletonTable } from '@/components/ui/Skeleton';

export const DailyAttendanceContent: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { alert: showAlert } = useConfirm();
    const [currentTimer, setCurrentTimer] = useState<number>(0);
    const [breakTimer, setBreakTimer] = useState<number>(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [selectedAttendanceId, setSelectedAttendanceId] = useState<string | null>(null);
    const [confirmStatus, setConfirmStatus] = useState<'PRESENT' | 'HALF_DAY'>('PRESENT');
    const [confirmReason, setConfirmReason] = useState('');

    // For HR/Manager View
    const [searchQuery, setSearchQuery] = useState('');
    const { hasPermission } = usePermissions();

    const canManage = hasPermission('attendance', 'manage');
    const canViewTeam = hasPermission('attendance', 'view_team') || canManage;
    const canViewAll = hasPermission('attendance', 'view_all') || canManage;
    const isAnyAdmin = canViewTeam || canViewAll;

    const hasEmployeeProfile = !!user?.employee_id;
    const canClock = hasPermission('attendance', 'clock_in_out') || hasPermission('attendance', 'view_my');
    const shouldFetchPersonal = hasEmployeeProfile && canClock;

    const { data: todayAttendance } = useQuery({
        queryKey: ['attendance', 'today'],
        queryFn: () => attendanceService.getTodayAttendance(),
        enabled: shouldFetchPersonal,
        staleTime: 1000 * 60 * 5,
    });

    // Employee: Fetches their own history
    const { data: myAttendance = [], isLoading: isLoadingMyAttendance } = useQuery({
        queryKey: ['attendance', 'my'],
        queryFn: () => attendanceService.getMyAttendance({ limit: 30 }),
        enabled: shouldFetchPersonal,
        staleTime: 1000 * 60 * 5,
    });

    // Employee: Fetches their own pending checkouts
    const { data: myPendingCheckouts = [] } = useQuery({
        queryKey: ['attendance', 'my-pending'],
        queryFn: () => attendanceService.getMyPendingCheckouts(),
        enabled: shouldFetchPersonal,
        staleTime: 1000 * 60 * 10,
    });

    // HR/Manager: Fetches Today's Attendance Log (Team/All)
    const { data: todayTeamAttendance = [], isLoading: isLoadingTeamAttendance } = useQuery({
        queryKey: ['attendance', 'today-team-log'],
        queryFn: async () => {
            try {
                return await attendanceService.getAttendanceRecords({
                    from_date: getCurrentDate(user?.timezone),
                    to_date: getCurrentDate(user?.timezone)
                });
            } catch (error) {
                console.error("Failed to fetch team attendance:", error);
                return [];
            }
        },
        enabled: isAnyAdmin,
        staleTime: 1000 * 60 * 2, // 2 minutes for real-time log
    });

    // HR/Manager: Fetches Pending Checkouts (Team/All - API handles filtering based on role)
    const { data: teamPendingCheckouts = [] } = useQuery({
        queryKey: ['attendance', 'team-pending'],
        queryFn: async () => {
            try {
                return await attendanceService.getPendingCheckouts({});
            } catch (error) {
                console.error("Failed to fetch pending checkouts:", error);
                return [];
            }
        },
        enabled: isAnyAdmin,
        staleTime: 1000 * 60 * 5,
    });

    const { data: geoSettings } = useQuery({
        queryKey: ['geo-fencing-settings'],
        queryFn: async () => {
            try {
                return await geoFencingService.getSettings();
            } catch (error) {
                return {
                    is_enabled: false,
                    allow_clock_without_location: true,
                    location_timeout_seconds: 30,
                    require_high_accuracy: false
                } as any;
            }
        },
        enabled: shouldFetchPersonal,
        staleTime: 1000 * 60 * 10,
    });

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isTimerRunning && todayAttendance?.check_in_time && !todayAttendance?.check_out_time) {
            const updateTimers = () => {
                try {
                    const now = new Date();

                    // Get check-in absolute time
                    const checkInUtc = (todayAttendance as any).check_in_time_utc;
                    let checkInDate: Date;

                    if (checkInUtc) {
                        checkInDate = new Date(checkInUtc);
                    } else if (todayAttendance.check_in_time?.includes('T')) {
                        checkInDate = new Date(todayAttendance.check_in_time);
                    } else {
                        const recordDate = new Date(todayAttendance.date);
                        const year = recordDate.getFullYear();
                        const month = String(recordDate.getMonth() + 1).padStart(2, '0');
                        const day = String(recordDate.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        checkInDate = new Date(`${dateStr}T${todayAttendance.check_in_time}`);
                    }

                    if (isNaN(checkInDate.getTime())) return;

                    const totalCompletedBreakSeconds = Number(todayAttendance.total_break_seconds || 0);
                    const activeBreak = todayAttendance.active_break;

                    if (activeBreak) {
                        // Calculate Break Timer (Completed + current active)
                        const breakStartTime = new Date(activeBreak.start_time);
                        const elapsedBreak = Math.floor((now.getTime() - breakStartTime.getTime()) / 1000);
                        setBreakTimer(totalCompletedBreakSeconds + (elapsedBreak >= 0 ? elapsedBreak : 0));

                        // Freeze Session Timer: (BreakStart - CheckIn) - CompletedBreaks
                        const sessionTillBreak = Math.floor((breakStartTime.getTime() - checkInDate.getTime()) / 1000);
                        setCurrentTimer(sessionTillBreak - totalCompletedBreakSeconds);
                    } else {
                        // Total break time is just completed breaks
                        setBreakTimer(totalCompletedBreakSeconds);
                        // Calculate Session Timer: (Now - CheckIn) - CompletedBreaks
                        const totalElapsed = Math.floor((now.getTime() - checkInDate.getTime()) / 1000);
                        setCurrentTimer(totalElapsed - totalCompletedBreakSeconds);
                    }
                } catch (error) {
                    console.error('Error in timer logic:', error);
                }
            };

            updateTimers();
            interval = setInterval(updateTimers, 1000);
        } else {
            setCurrentTimer(0);
            setBreakTimer(0);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTimerRunning, todayAttendance]);

    // Start timer when clocked in
    useEffect(() => {
        if (todayAttendance?.check_in_time && !todayAttendance?.check_out_time) {
            setIsTimerRunning(true);
        } else {
            setIsTimerRunning(false);
        }
    }, [todayAttendance]);


    const clockInMutation = useMutation({
        mutationFn: (coords?: { latitude: number; longitude: number; device?: string }) => attendanceService.clockIn(coords),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            setIsTimerRunning(true);
            toast.success('Successfully clocked in!');
        },
        onError: (error: any) => {
            const serverMessage = error.response?.data?.message || error.message || '';

            let message = serverMessage || 'Failed to clock in. Please try again.';
            if (serverMessage.includes('Employee profile not linked')) {
                toast.error('Your employee profile is not complete. Please contact HR to set up your employee details.');
            } else if (serverMessage.includes('on approved leave')) {
                toast.error('You are on approved leave today and cannot clock in.');
            } else if (serverMessage.includes('Already clocked in')) {
                toast.error('You have already clocked in today.');
            } else if (serverMessage.includes('Location validation failed')) {
                toast.error(serverMessage);
            } else {
                toast.error(serverMessage || 'Failed to clock in. Please try again.');
            }

            showAlert({
                title: 'Attendance Error',
                message: message,
                confirmText: 'OK'
            });
        },
    });

    const clockOutMutation = useMutation({
        mutationFn: (coords?: { latitude: number; longitude: number; device?: string; eodReport?: string }) => attendanceService.clockOut(coords),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            setIsTimerRunning(false);
            setCurrentTimer(0);
            toast.success('Successfully clocked out!');
        },
        onError: (error: any) => {
            const serverMessage = error.response?.data?.message || error.message || '';

            let message = serverMessage || 'Failed to clock out. Please try again.';
            if (serverMessage.includes('Employee profile not linked')) {
                toast.error('Your employee profile is not complete. Please contact HR to set up your employee details.');
            } else if (serverMessage.includes('No check-in found')) {
                toast.error('No check-in record found for today. Please clock in first.');
            } else if (serverMessage.includes('Already clocked out')) {
                toast.error('You have already clocked out today.');
            } else if (serverMessage.includes('Location validation failed')) {
                toast.error(serverMessage);
            } else {
                toast.error(serverMessage || 'Failed to clock out. Please try again.');
            }

            showAlert({
                title: 'Attendance Error',
                message: message,
                confirmText: 'OK'
            });
        },
    });

    const [showEODDialog, setShowEODDialog] = useState(false);
    const [eodReport, setEodReport] = useState('');
    const [clockOutCoords, setClockOutCoords] = useState<{ latitude: number; longitude: number; device?: string } | undefined>(undefined);

    const { data: myWFHRequests = [] } = useQuery({
        queryKey: ['my-wfh-requests', 'approved'],
        queryFn: () => wfhService.getMyRequests({ status: 'APPROVED' }),
    });

    const isWFHApprovedToday = () => {
        const todayStr = getCurrentDate(user?.timezone);
        return myWFHRequests.some(req => req.request_date === todayStr && req.status === 'APPROVED');
    };

    const handleClockIn = async () => {
        // Skip Geofence if WFH is approved today
        if (isWFHApprovedToday()) {
            clockInMutation.mutate({ device: detectDeviceType() } as any);
            return;
        }

        if (geoSettings?.is_enabled) {
            const check = await geoFencingService.performGeoFenceCheck(geoSettings);
            if (!check.allowed) {
                showAlert({
                    title: 'Geo-fence Validation Failed',
                    message: check.errorMessage || 'You are outside the permitted work area.',
                    confirmText: 'OK'
                });
                return;
            }
            clockInMutation.mutate({
                latitude: check.position?.coords.latitude!,
                longitude: check.position?.coords.longitude!,
                device: detectDeviceType()
            });
        } else {
            clockInMutation.mutate({ device: detectDeviceType() } as any);
        }
    };

    const handleClockOut = async () => {
        // Prepare coords first
        let coords: { latitude: number; longitude: number; device?: string } | undefined = undefined;

        // Skip Geofence check if WFH (REMOTE) - though backend checks too
        const isRemote = todayAttendance?.work_mode === 'REMOTE' || isWFHApprovedToday();

        if (geoSettings?.is_enabled && !isRemote) {
            const check = await geoFencingService.performGeoFenceCheck(geoSettings);
            if (!check.allowed) {
                showAlert({
                    title: 'Geo-fence Validation Failed',
                    message: check.errorMessage || 'You are outside the permitted work area.',
                    confirmText: 'OK'
                });
                return;
            }
            coords = {
                latitude: check.position?.coords.latitude!,
                longitude: check.position?.coords.longitude!,
                device: detectDeviceType()
            };
        } else {
            coords = { device: detectDeviceType() } as any;
        }

        // Check if EOD Report is needed (WFH / Remote)
        if (isRemote) {
            setClockOutCoords(coords);
            setShowEODDialog(true);
            return;
        }

        clockOutMutation.mutate(coords);
    };

    const submitEODReport = () => {
        if (eodReport.trim().length < 10) return;

        clockOutMutation.mutate({
            ...clockOutCoords,
            eodReport: eodReport
        } as any); // Cast as any because react-query types might be tricky with optional args in mutationFn

        setShowEODDialog(false);
        setEodReport('');
    };

    const confirmCheckoutMutation = useMutation({
        mutationFn: ({ id, status, reason }: { id: string; status: 'PRESENT' | 'HALF_DAY'; reason?: string }) =>
            attendanceService.confirmCheckout(id, status, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            setSelectedAttendanceId(null);
        },
    });

    // Helper to filter team logs
    const filteredTeamLogs = todayTeamAttendance.filter(record =>
        (record.first_name + ' ' + record.last_name).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // DataTable column definitions
    const teamAttendanceColumns = [
        {
            header: 'Employee',
            cell: (att: any) => `${att.first_name} ${att.last_name}`,
        },
        {
            header: 'Check In',
            cell: (att: any) => formatTime12Hour(att.check_in_time, user?.timezone),
        },
        {
            header: 'Check Out',
            cell: (att: any) => formatTime12Hour(att.check_out_time, user?.timezone),
        },
        {
            header: 'Status',
            cell: (att: any) => (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${att.is_late ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {att.is_late ? `Late ${att.late_by ? `(${att.late_by})` : ''}` : 'On Time'}
                </span>
            ),
        },
    ];

    const pendingCheckoutColumns = [
        {
            header: 'Employee',
            cell: (att: any) => `${att.first_name} ${att.last_name}`,
        },
        {
            header: 'Date',
            cell: (att: any) => format(new Date(att.date), 'MMM dd, yyyy'),
        },
        {
            header: 'Check In',
            cell: (att: any) => formatTime12Hour(att.check_in_time, user?.timezone),
        },
        {
            header: 'Status',
            cell: () => (
                <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-medium">
                    Warning: Pending
                </span>
            ),
        },
    ];

    const myAttendanceColumns = [
        {
            header: 'Date',
            cell: (att: any) => format(new Date(att.date), 'MMM dd, yyyy'),
        },
        {
            header: 'Check In',
            cell: (att: any) => formatTime12Hour(att.check_in_time, user?.timezone),
        },
        {
            header: 'Check Out',
            cell: (att: any) => formatTime12Hour(att.check_out_time, user?.timezone),
        },
        {
            header: 'Total Duration',
            cell: (att: any) => calculateWorkDuration(att.check_in_time, att.check_out_time),
        },
        {
            header: 'Eff. Hours',
            cell: (att: any) => att.effective_work_hours ? `${att.effective_work_hours} hrs` : '-',
        },
        {
            header: 'Overtime',
            cell: (att: any) => att.overtime_hours && parseFloat(att.overtime_hours) > 0 ? (
                <span className="text-green-600 font-semibold">+{att.overtime_hours} hrs</span>
            ) : '-',
        },
        {
            header: 'Device',
            cell: (att: any) => (
                <div className="flex flex-col gap-1">
                    {att.check_in_device && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 inline-block w-fit">
                            IN: {att.check_in_device}
                        </span>
                    )}
                    {att.check_out_device && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 inline-block w-fit">
                            OUT: {att.check_out_device}
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: 'Status',
            cell: (att: any) => (
                <div className="flex flex-col gap-1 items-start">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${att.status === 'PRESENT' || att.status === 'APPROVED'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : att.status === 'REJECTED'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                        {att.status.replace('_', ' ')}
                    </span>
                    {att.is_late && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            Late {att.late_by ? `(${att.late_by})` : ''}
                        </span>
                    )}
                </div>
            ),
        },
    ];

    const myPendingCheckoutColumns = [
        {
            header: 'Date',
            cell: (att: any) => format(new Date(att.date), 'MMM dd, yyyy'),
        },
        {
            header: 'Check In',
            cell: (att: any) => formatTime12Hour(att.check_in_time, user?.timezone),
        },
        {
            header: 'Status',
            cell: () => (
                <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded text-xs font-medium">
                    Pending
                </span>
            ),
        },
        {
            header: 'Actions',
            cell: (att: any) => (
                <Button size="sm" onClick={() => setSelectedAttendanceId(att.id)}>Confirm</Button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="w-full sm:w-auto">
                        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Today's Attendance</h3>
                        <p className="text-sm text-gray-600 dark:text-muted">
                            {todayAttendance?.check_in_time
                                ? `Checked in at ${formatTime12Hour(todayAttendance.check_in_time, user?.timezone)}`
                                : 'Not checked in yet'}
                        </p>

                        {(todayAttendance?.shift_name || todayAttendance?.late_by) && (
                            <div className="mt-2 text-sm space-y-1">
                                {todayAttendance.shift_name && (
                                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                        <span className="font-medium">Shift:</span>
                                        <span>{todayAttendance.shift_name} ({formatTime12Hour(todayAttendance.shift_start, user?.timezone)} - {formatTime12Hour(todayAttendance.shift_end, user?.timezone)})</span>
                                    </div>
                                )}
                                {todayAttendance.late_by && (
                                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
                                        <span>Late by:</span>
                                        <span>{todayAttendance.late_by}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {isTimerRunning && (
                            <div className="mt-2 flex gap-6">
                                <div>
                                    <p className="text-[10px] text-gray-500 dark:text-muted uppercase font-semibold tracking-wider">Session</p>
                                    <p className="text-xl font-mono font-bold text-brand-500">{formatDuration(currentTimer)}</p>
                                </div>
                                {(breakTimer > 0 || todayAttendance?.active_break) && (
                                    <div>
                                        <p className="text-[10px] text-orange-500 uppercase font-semibold tracking-wider">Break</p>
                                        <p className="text-xl font-mono font-bold text-orange-600 dark:text-orange-400">{formatDuration(breakTimer)}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="w-full sm:w-auto flex flex-col xs:flex-row items-stretch xs:items-center gap-3">
                        {status === 'NOT_CHECKED_IN' && (
                            <Button
                                onClick={handleClockIn}
                                isLoading={clockInMutation.isPending}
                                size="md"
                                className="w-full sm:w-auto"
                            >
                                {geoSettings?.is_enabled ? <MapPin className="mr-2" size={18} /> : <Clock className="mr-2" size={18} />}
                                Clock In {geoSettings?.is_enabled && '(Protected)'}
                            </Button>
                        )}

                        {canClockOut && isTimerRunning && (
                            <div className="w-full sm:w-auto grid grid-cols-2 sm:flex gap-3">
                                {todayAttendance?.active_break ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => attendanceService.endBreak().then(() => queryClient.invalidateQueries({ queryKey: ['attendance'] }))}
                                        className="border-orange-200 hover:bg-orange-50 text-orange-700 hover:text-orange-800 dark:border-orange-900/30 dark:hover:bg-orange-900/20 dark:text-orange-400 w-full sm:w-auto"
                                        size="md"
                                    >
                                        <Coffee className="mr-2" size={18} />
                                        <span className="truncate">Break Out</span>
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        onClick={() => attendanceService.startBreak().then(() => queryClient.invalidateQueries({ queryKey: ['attendance'] }))}
                                        size="md"
                                        className="w-full sm:w-auto"
                                    >
                                        <Coffee className="mr-2" size={18} />
                                        <span className="truncate">Break In</span>

                                    </Button>
                                )}

                                <Button
                                    variant="destructive"
                                    onClick={handleClockOut}
                                    isLoading={clockOutMutation.isPending}
                                    disabled={!!todayAttendance?.active_break}
                                    size="md"
                                    className="w-full sm:w-auto"
                                >
                                    {geoSettings?.is_enabled ? <MapPin className="mr-2" size={18} /> : <Clock className="mr-2" size={18} />}
                                    <span className="truncate">Clock Out</span>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* CONDITIONAL RENDERING BASED ON PERMISSIONS */}
            {isAnyAdmin ? (
                <>
                    {/* HR/MANAGER VIEW: TODAY'S TEAM ATTENDANCE LOG */}
                    <Card>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Today's Attendance Log {canViewAll ? '(All Employees)' : '(My Team)'}
                            </h3>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Search employee..."
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {isLoadingTeamAttendance ? (
                            <div className="h-64 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-500 border-t-transparent"></div>
                            </div>
                        ) : filteredTeamLogs.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-muted">No attendance records for today</div>
                        ) : (
                            <DataTable
                                data={filteredTeamLogs}
                                columns={teamAttendanceColumns}
                                loading={isLoadingTeamAttendance}
                                emptyMessage="No attendance records for today"
                            />
                        )}
                    </Card>

                    {/* HR/MANAGER VIEW: PENDING CHECKOUTS (TEAM/ALL) */}
                    <Card>
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                            Pending Checkout Confirmations {canViewAll ? '(All)' : '(My Team)'}
                        </h3>
                        {teamPendingCheckouts.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-muted">No pending checkouts to review</div>
                        ) : (
                            <DataTable
                                data={teamPendingCheckouts}
                                columns={pendingCheckoutColumns}
                                loading={false}
                                emptyMessage="No pending checkouts to review"
                            />
                        )}
                    </Card>
                </>
            ) : (
                <>
                    {/* EMPLOYEE VIEW: MY ATTENDANCE HISTORY */}
                    <Card>
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">My Attendance History</h3>
                        {isLoadingMyAttendance ? (
                            <div className="h-64 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-500 border-t-transparent"></div>
                            </div>
                        ) : myAttendance.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-muted">No attendance records found</div>
                        ) : (
                            <DataTable
                                data={myAttendance}
                                columns={myAttendanceColumns}
                                loading={isLoadingMyAttendance}
                                emptyMessage="No attendance records found"
                            />
                        )}
</Card>

                    {/* EMPLOYEE VIEW: MY PENDING CHECKOUTS */}
                    <Card>
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">My Pending Checkouts</h3>
                        {myPendingCheckouts.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-muted">No pending checkouts</div>
                        ) : (
                            <DataTable
                                data={myPendingCheckouts}
                                columns={myPendingCheckoutColumns}
                                loading={false}
                                emptyMessage="No pending checkouts"
                            />
                        )}
</Card>
                </>
            )}


            <Dialog open={!!selectedAttendanceId} onOpenChange={(open) => !open && setSelectedAttendanceId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Checkout</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Select Checkout Status</Label>
                            <RadioGroup
                                value={confirmStatus}
                                onValueChange={(value) => setConfirmStatus(value as 'PRESENT' | 'HALF_DAY')}
                                className="mt-2"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="PRESENT" id="present" />
                                    <Label htmlFor="present">Full Day</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="HALF_DAY" id="half_day" />
                                    <Label htmlFor="half_day">Half Day</Label>
                                </div>
                            </RadioGroup>
                        </div>
                        <div>
                            <Label htmlFor="reason">Reason (Optional)</Label>
                            <Input
                                id="reason"
                                value={confirmReason}
                                onChange={(e) => setConfirmReason(e.target.value)}
                                placeholder="e.g., Forgot to clock out"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                            onClick={() => {
                                if (selectedAttendanceId) {
                                    confirmCheckoutMutation.mutate({
                                        id: selectedAttendanceId,
                                        status: confirmStatus,
                                        reason: confirmReason,
                                    });
                                }
                            }}
                            isLoading={confirmCheckoutMutation.isPending}
                        >
                            Confirm
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* EOD Report Dialog */}
            <Dialog open={showEODDialog} onOpenChange={setShowEODDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>End of Day Report</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200 p-3 rounded-md text-sm border border-brand-100 dark:border-brand-800">
                            Since you are working from home today, detailed daily report is required to clock out.
                        </div>
                        <div>
                            <Label htmlFor="eod-report" className="text-gray-700 dark:text-gray-300">Accomplishments & Updates *</Label>
                            <textarea
                                id="eod-report"
                                value={eodReport}
                                onChange={(e) => setEodReport(e.target.value)}
                                className="w-full mt-2 p-3 border rounded-md min-h-[120px] focus:ring-2 focus:ring-brand-500/50 focus:border-transparent text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                                placeholder="Please list your tasks completed, meetings attended, and any pending items... (Min 10 chars)"
                            />
                            <p className="text-xs text-right mt-1 text-gray-500 dark:text-gray-400">
                                {eodReport.length}/10 characters
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowEODDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={submitEODReport}
                            disabled={eodReport.trim().length < 10}
                            isLoading={clockOutMutation.isPending}
                        >
                            Submit & Clock Out
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
