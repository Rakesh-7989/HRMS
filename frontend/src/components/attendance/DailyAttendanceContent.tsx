import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { attendanceService } from '@/services/attendance.service';
import { geoFencingService } from '@/services/geoFencing.service';
import { Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { detectDeviceType } from '@/utils/deviceDetection';
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

export const DailyAttendanceContent: React.FC = () => {
    const queryClient = useQueryClient();
    const [currentTimer, setCurrentTimer] = useState<number>(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [selectedAttendanceId, setSelectedAttendanceId] = useState<string | null>(null);
    const [confirmStatus, setConfirmStatus] = useState<'PRESENT' | 'HALF_DAY'>('PRESENT');
    const [confirmReason, setConfirmReason] = useState('');

    const { data: todayAttendance } = useQuery({
        queryKey: ['attendance', 'today'],
        queryFn: () => attendanceService.getTodayAttendance(),
    });

    const { data: myAttendance = [], isLoading } = useQuery({
        queryKey: ['attendance', 'my'],
        queryFn: () => attendanceService.getMyAttendance({ limit: 30 }),
    });

    const { data: myPendingCheckouts = [] } = useQuery({
        queryKey: ['attendance', 'my-pending'],
        queryFn: () => attendanceService.getMyPendingCheckouts(),
    });

    const { data: geoSettings } = useQuery({
        queryKey: ['geo-fencing-settings'],
        queryFn: () => geoFencingService.getSettings(),
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
                    console.error('Invalid check-in time format:', todayAttendance);
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

    const formatTimer = (seconds: number) => {
        if (isNaN(seconds) || seconds < 0) return '00:00:00';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const calculateDuration = (checkInTime: string, checkOutTime: string) => {
        if (!checkInTime || !checkOutTime) return '-';
        const checkIn = new Date(`1970-01-01T${checkInTime}`);
        const checkOut = new Date(`1970-01-01T${checkOutTime}`);
        const diffMs = checkOut.getTime() - checkIn.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours.toFixed(1) + 'h';
    };

    const clockInMutation = useMutation({
        mutationFn: (coords?: { latitude: number; longitude: number; device?: string }) => attendanceService.clockIn(coords),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            setIsTimerRunning(true);
        },
        onError: (error: any) => {
            const serverMessage = error.response?.data?.message || error.message || '';

            if (serverMessage.includes('Employee profile not linked')) {
                alert('Your employee profile is not complete. Please contact HR to set up your employee details.');
            } else if (serverMessage.includes('on approved leave')) {
                alert('You are on approved leave today and cannot clock in.');
            } else if (serverMessage.includes('Already clocked in')) {
                alert('You have already clocked in today.');
            } else if (serverMessage.includes('Location validation failed')) {
                alert(serverMessage);
            } else {
                alert(serverMessage || 'Failed to clock in. Please try again.');
            }
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

            if (serverMessage.includes('Employee profile not linked')) {
                alert('Your employee profile is not complete. Please contact HR to set up your employee details.');
            } else if (serverMessage.includes('No check-in found')) {
                alert('No check-in record found for today. Please clock in first.');
            } else if (serverMessage.includes('Already clocked out')) {
                alert('You have already clocked out today.');
            } else if (serverMessage.includes('Location validation failed')) {
                alert(serverMessage);
            } else {
                alert(serverMessage || 'Failed to clock out. Please try again.');
            }
        },
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

    const confirmCheckoutMutation = useMutation({
        mutationFn: ({ id, status, reason }: { id: string; status: 'PRESENT' | 'HALF_DAY'; reason?: string }) =>
            attendanceService.confirmCheckout(id, status, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            setSelectedAttendanceId(null);
        },
    });

    const status = todayAttendance?.status || 'NOT_CHECKED_IN';
    const canClockOut = status === 'PRESENT' || status === 'HALF_DAY' || status === 'PENDING_CHECKOUT';

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Today's Attendance</h3>
                        <p className="text-sm text-gray-600 dark:text-muted">
                            {todayAttendance?.check_in_time
                                ? `Checked in at ${todayAttendance.check_in_time}`
                                : 'Not checked in yet'}
                        </p>
                        {isTimerRunning && (
                            <div className="mt-2">
                                <p className="text-xs text-gray-500 dark:text-muted">Current Session</p>
                                <p className="text-xl font-mono font-bold text-primary">{formatTimer(currentTimer)}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 flex-wrap md:flex-nowrap">
                        {status === 'NOT_CHECKED_IN' && (
                            <Button
                                onClick={handleClockIn}
                                isLoading={clockInMutation.isPending}
                                size="md"
                            >
                                {geoSettings?.is_enabled ? <MapPin className="mr-2" size={18} /> : <Clock className="mr-2" size={18} />}
                                Clock In {geoSettings?.is_enabled && '(Protected)'}
                            </Button>
                        )}
                        {canClockOut && isTimerRunning && (
                            <Button
                                variant="destructive"
                                onClick={handleClockOut}
                                isLoading={clockOutMutation.isPending}
                                size="md"
                            >
                                {geoSettings?.is_enabled ? <MapPin className="mr-2" size={18} /> : <Clock className="mr-2" size={18} />}
                                Clock Out
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">My Attendance History</h3>
                {isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    </div>
                ) : myAttendance.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-muted">No attendance records found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Check In</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Check Out</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Duration</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Device</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {myAttendance.map((att) => (
                                    <tr
                                        key={att.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                                    >
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                                            {format(new Date(att.date), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{att.check_in_time || '-'}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{att.check_out_time || '-'}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                            {calculateDuration(att.check_in_time ?? '', att.check_out_time ?? '')}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col gap-1">
                                                {att.check_in_device && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 inline-block w-fit">
                                                        IN: {att.check_in_device}
                                                    </span>
                                                )}
                                                {att.check_out_device && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 inline-block w-fit">
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

            <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">My Pending Checkouts</h3>
                {myPendingCheckouts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-muted">No pending checkouts</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Check In</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {myPendingCheckouts.map((att) => (
                                    <tr
                                        key={att.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                                    >
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                                            {format(new Date(att.date), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{att.check_in_time || '-'}</td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded text-xs font-medium'}
                                            >
                                                {att.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Button size="sm" onClick={() => setSelectedAttendanceId(att.id)}>Confirm</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

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
        </div>
    );
};
