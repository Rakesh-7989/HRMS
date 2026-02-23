import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceService } from '@/services/attendance.service';
import { geoFencingService } from '@/services/geoFencing.service';
import { Clock, MapPin, Coffee } from 'lucide-react';
import { detectDeviceType } from '@/utils/deviceDetection';
import { formatDuration } from '@/utils/timeFormat';
import { useConfirm } from '@/contexts/ConfirmContext';
import { showToast } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

export const NavbarClock: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { alert: showAlert, confirm } = useConfirm();
    const { t } = useTranslation();

    const [currentTimer, setCurrentTimer] = useState<number>(0);
    const [breakTimer, setBreakTimer] = useState<number>(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    const { data: todayAttendance, isLoading: isLoadingAttendance, isError } = useQuery({
        queryKey: ['attendance', 'today'],
        queryFn: async () => {
            try {
                return await attendanceService.getTodayAttendance();
            } catch (error) {
                console.error("Failed to fetch attendance", error);
                return null;
            }
        },
        staleTime: 1000 * 60, // 1 minute stale time
        retry: 1,
    });

    const { data: geoSettings } = useQuery({
        queryKey: ['geo-fencing-settings'],
        queryFn: () => geoFencingService.getSettings(),
        retry: false,
    });

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isTimerRunning && todayAttendance?.check_in_time && !todayAttendance?.check_out_time) {
            const updateTimers = () => {
                try {
                    const now = new Date();

                    // Get check-in date
                    let checkInTime = todayAttendance.check_in_time;
                    if (!checkInTime) return;

                    let checkInDate: Date;

                    if (checkInTime.includes('T')) {
                        checkInDate = new Date(checkInTime);
                    } else {
                        const recordDate = new Date(todayAttendance.date);
                        const year = recordDate.getFullYear();
                        const month = String(recordDate.getMonth() + 1).padStart(2, '0');
                        const day = String(recordDate.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        checkInDate = new Date(`${dateStr}T${checkInTime}`);
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
            showAlert({
                title: 'Attendance Error',
                message: serverMessage || 'Failed to clock in. Please try again.',
                confirmText: 'OK'
            });
            showToast.error(error);
        },
    });

    const clockOutMutation = useMutation({
        mutationFn: (coords?: { latitude: number; longitude: number; device?: string }) => attendanceService.clockOut(coords),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            setIsTimerRunning(false);
            setCurrentTimer(0);
            toast.success('Successfully clocked out!');
        },
        onError: (error: any) => {
            const serverMessage = error.response?.data?.message || error.message || '';
            showAlert({
                title: 'Attendance Error',
                message: serverMessage || 'Failed to clock out. Please try again.',
                confirmText: 'OK'
            });
            showToast.error(error);
        },

    });

    const startBreakMutation = useMutation({
        mutationFn: () => attendanceService.startBreak(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            toast.success('Break started');
        },
        onError: (error: any) => {
            const serverMessage = error.response?.data?.message || error.message || '';
            showAlert({
                title: 'Break Error',
                message: serverMessage || 'Failed to start break. Please try again.',
                confirmText: 'OK'
            });
            showToast.error(error);
        }
    });

    const endBreakMutation = useMutation({
        mutationFn: () => attendanceService.endBreak(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            toast.success('Break ended');
        },
        onError: (error: any) => {
            const serverMessage = error.response?.data?.message || error.message || '';
            showAlert({
                title: 'Break Error',
                message: serverMessage || 'Failed to end break. Please try again.',
                confirmText: 'OK'
            });
            showToast.error(error);
        }
    });

    const handleClockIn = async () => {
        if (geoSettings?.is_enabled) {
            const check = await geoFencingService.performGeoFenceCheck(geoSettings);
            if (!check.allowed) {
                showAlert({
                    title: 'Geo-fence Validation Failed',
                    message: check.errorMessage || 'You are outside the permitted work area.',
                    confirmText: 'OK'
                });
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
        const isConfirmed = await confirm({
            title: 'Confirm Clock Out',
            message: 'Are you sure you want to clock out now? This will end your current working session.',
            confirmText: 'Clock Out',
            cancelText: 'Cancel',
            type: 'destructive'
        });

        if (!isConfirmed) return;

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
            clockOutMutation.mutate({
                latitude: check.position?.coords.latitude!,
                longitude: check.position?.coords.longitude!,
                device: detectDeviceType()
            });
        } else {
            clockOutMutation.mutate({ device: detectDeviceType() } as any);
        }
    };

    const handleStartBreak = () => {
        startBreakMutation.mutate();
    };

    const handleEndBreak = () => {
        endBreakMutation.mutate();
    };

    const status = todayAttendance?.status || 'NOT_CHECKED_IN';
    const canClockOut = !!todayAttendance?.check_in_time && !todayAttendance?.check_out_time;

    // Loading state
    if (isLoadingAttendance) {
        return (
            <div className="flex items-center mr-2">
                <Button variant="outline" disabled className="h-9 w-24 gap-2 border-gray-200 bg-gray-50">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                </Button>
            </div>
        );
    }


    const activeBreak = todayAttendance?.active_break;

    // Admins and Super Admins don't clock in/out
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
        return null;
    }


    // Failed to load attendance
    if (isError) {
        return (
            <div className="flex items-center mr-2">
                <Button variant="outline" className="h-9 w-auto gap-2 border-red-200 bg-red-50 text-red-600">
                    <span className="text-xs">{t('attendance.unavailable')}</span>
                </Button>
            </div>
        );
    }


    // Already clocked out for the day
    if (todayAttendance?.check_out_time) {
        return (
            <div className="flex items-center mr-2">
                <Button
                    disabled
                    variant="outline"
                    className="h-9 gap-2 border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-500 cursor-not-allowed"
                >
                    <Clock size={16} />
                    <span className="hidden sm:inline">{t('attendance.clockedOut')}</span>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex items-center">
            {status === 'NOT_CHECKED_IN' && (
                <Button
                    onClick={handleClockIn}
                    isLoading={clockInMutation.isPending}
                    variant="outline"
                    className="h-9 gap-2 px-3 sm:px-4 border-green-200 hover:bg-green-50 text-green-700 hover:text-green-800 dark:border-green-900/30 dark:hover:bg-green-900/20 dark:text-green-400"
                >
                    {geoSettings?.is_enabled ? <MapPin size={16} /> : <Clock size={16} />}
                    <span className="hidden sm:inline">{t('attendance.clockIn')}</span>
                </Button>
            )}

            {canClockOut && isTimerRunning && (
                <div className="flex items-center gap-2">
                    <div className="hidden lg:flex flex-col items-end mr-2 leading-none">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
                            {t('attendance.session')}
                        </span>
                        <span className="text-sm font-mono font-bold text-gray-700 dark:text-gray-300">
                            {formatDuration(currentTimer)}
                        </span>
                    </div>

                    {(breakTimer > 0 || activeBreak) && (
                        <div className="hidden lg:flex flex-col items-end mr-2 leading-none">
                            <span className="text-[10px] text-orange-500 uppercase font-semibold tracking-wider">
                                {t('attendance.break')}
                            </span>
                            <span className="text-sm font-mono font-bold text-orange-600 dark:text-orange-400">
                                {formatDuration(breakTimer)}
                            </span>
                        </div>
                    )}

                    {activeBreak ? (
                        <Button
                            variant="outline"
                            onClick={handleEndBreak}
                            isLoading={endBreakMutation.isPending}
                            className="h-9 gap-2 px-3 sm:px-4 border-orange-200 hover:bg-orange-50 text-orange-700 hover:text-orange-800 dark:border-orange-900/30 dark:hover:bg-orange-900/20 dark:text-orange-400"
                            size="sm"
                        >
                            <Coffee size={16} />
                            <span className="hidden sm:inline">{t('attendance.breakOut')}</span>
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={handleStartBreak}
                            isLoading={startBreakMutation.isPending}
                            className="h-9 gap-2 px-3 sm:px-4"
                            size="sm"
                        >
                            <Coffee size={16} />
                            <span className="hidden sm:inline">{t('attendance.breakIn')}</span>
                        </Button>
                    )}

                    {!activeBreak && (
                        <Button
                            variant="destructive"
                            onClick={handleClockOut}
                            isLoading={clockOutMutation.isPending}
                            className="h-9 gap-2 px-3 sm:px-4"
                            size="sm"
                        >
                            {geoSettings?.is_enabled ? <MapPin size={16} /> : <Clock size={16} />}
                            <span className="hidden sm:inline">{t('attendance.clockOut')}</span>
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};
