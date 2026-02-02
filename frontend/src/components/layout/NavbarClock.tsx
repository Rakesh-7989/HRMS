import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceService } from '@/services/attendance.service';
import { geoFencingService } from '@/services/geoFencing.service';
import { Clock, MapPin, Coffee } from 'lucide-react';
import { detectDeviceType } from '@/utils/deviceDetection';
import { formatDuration } from '@/utils/timeFormat';


export const NavbarClock: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [currentTimer, setCurrentTimer] = useState<number>(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    const { data: todayAttendance, isLoading: isLoadingAttendance, isError } = useQuery({
        queryKey: ['attendance', 'today'],
        queryFn: () => attendanceService.getTodayAttendance(),
        staleTime: 1000 * 60, // 1 minute stale time to prevent flickering on every nav change
    });

    const { data: geoSettings } = useQuery({
        queryKey: ['geo-fencing-settings'],
        queryFn: () => geoFencingService.getSettings(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isTimerRunning && todayAttendance?.check_in_time && !todayAttendance?.check_out_time) {
            try {
                const recordDate = new Date(todayAttendance.date);
                const year = recordDate.getFullYear();
                const month = String(recordDate.getMonth() + 1).padStart(2, '0');
                const day = String(recordDate.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                const timeStr = todayAttendance.check_in_time;
                const checkInDate = new Date(`${dateStr}T${timeStr}`);
                const now = new Date();

                if (!isNaN(checkInDate.getTime())) {
                    const elapsedSeconds = Math.floor((now.getTime() - checkInDate.getTime()) / 1000);
                    setCurrentTimer(elapsedSeconds >= 0 ? elapsedSeconds : 0);

                    interval = setInterval(() => {
                        setCurrentTimer(prev => prev + 1);
                    }, 1000);
                } else {
                    setCurrentTimer(0);
                }
            } catch (error) {
                console.error('Error calculating timer:', error);
                setCurrentTimer(0);
            }
        } else if (!isTimerRunning) {
            setCurrentTimer(0);
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
            setIsTimerRunning(true);
        },
        onError: (error: any) => {
            const serverMessage = error.response?.data?.message || error.message || '';
            alert(serverMessage || 'Failed to clock in. Please try again.');
        },
    });

    const clockOutMutation = useMutation({
        mutationFn: (coords?: { latitude: number; longitude: number; device?: string }) => attendanceService.clockOut(coords),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            setIsTimerRunning(false);
            setCurrentTimer(0);
        },
        onError: (error: any) => {
            const serverMessage = error.response?.data?.message || error.message || '';
            alert(serverMessage || 'Failed to clock out. Please try again.');
        },

    });

    const startBreakMutation = useMutation({
        mutationFn: () => attendanceService.startBreak(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
        },
        onError: (error: any) => {
            const serverMessage = error.response?.data?.message || error.message || '';
            alert(serverMessage || 'Failed to start break. Please try again.');
        }
    });

    const endBreakMutation = useMutation({
        mutationFn: () => attendanceService.endBreak(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
        },
        onError: (error: any) => {
            const serverMessage = error.response?.data?.message || error.message || '';
            alert(serverMessage || 'Failed to end break. Please try again.');
        }
    });

    const handleClockIn = async () => {
        if (geoSettings?.is_enabled) {
            const check = await geoFencingService.performGeoFenceCheck(geoSettings);
            if (!check.allowed) {
                alert(check.errorMessage || 'Geo-fence validation failed');
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
        if (geoSettings?.is_enabled) {
            const check = await geoFencingService.performGeoFenceCheck(geoSettings);
            if (!check.allowed) {
                alert(check.errorMessage || 'Geo-fence validation failed');
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
    const canClockOut = status === 'PRESENT' || status === 'HALF_DAY' || status === 'PENDING_CHECKOUT';

    // Don't render anything while loading initial state to avoid jumpiness
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
                    <span className="text-xs">Error loading status</span>
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
                    <span className="hidden sm:inline">Clocked Out</span>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex items-center mr-2">
            {status === 'NOT_CHECKED_IN' && (
                <Button
                    onClick={handleClockIn}
                    isLoading={clockInMutation.isPending}
                    variant="outline"
                    className="h-9 gap-2 border-green-200 hover:bg-green-50 text-green-700 hover:text-green-800 dark:border-green-900/30 dark:hover:bg-green-900/20 dark:text-green-400"
                >
                    {geoSettings?.is_enabled ? <MapPin size={16} /> : <Clock size={16} />}
                    <span className="hidden sm:inline">Clock In</span>
                </Button>
            )}

            {canClockOut && isTimerRunning && (
                <div className="flex items-center gap-2">
                    <div className="hidden lg:flex flex-col items-end mr-2 leading-none">
                        <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
                            {activeBreak ? 'On Break' : 'Session'}
                        </span>
                        <span className="text-sm font-mono font-bold text-gray-700 dark:text-gray-300">
                            {formatDuration(currentTimer)}
                        </span>
                    </div>

                    {activeBreak ? (
                        <Button
                            variant="outline"
                            onClick={handleEndBreak}
                            isLoading={endBreakMutation.isPending}
                            className="h-9 gap-2 border-orange-200 hover:bg-orange-50 text-orange-700 hover:text-orange-800 dark:border-orange-900/30 dark:hover:bg-orange-900/20 dark:text-orange-400"
                            size="sm"
                        >
                            <Coffee size={16} />
                            <span className="hidden sm:inline">Break Out</span>
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={handleStartBreak}
                            isLoading={startBreakMutation.isPending}
                            className="h-9 gap-2"
                            size="sm"
                        >
                            <Coffee size={16} />
                            <span className="hidden sm:inline">Break In</span>
                        </Button>
                    )}

                    {!activeBreak && (
                        <Button
                            variant="destructive"
                            onClick={handleClockOut}
                            isLoading={clockOutMutation.isPending}
                            className="h-9 gap-2"
                            size="sm"
                        >
                            {geoSettings?.is_enabled ? <MapPin size={16} /> : <Clock size={16} />}
                            <span className="hidden sm:inline">Clock Out</span>
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};
