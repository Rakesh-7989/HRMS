import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '@/services/employee/attendance.service';
import { geoFencingService } from '@/services/employee/geoFencing.service';
import { detectDeviceType } from '@/utils/deviceDetection';
import {
    LogIn, LogOut, Coffee, Play, CheckCircle2,
    Clock, Loader2, AlertCircle
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseTimeToSeconds(timeStr: string | null | undefined): number {
    if (!timeStr) return 0;

    // Handle ISO strings (e.g., "2024-02-18T12:25:00")
    if (timeStr.includes('T')) {
        const timePart = timeStr.split('T')[1];
        if (timePart) timeStr = timePart.split('.')[0]; // Remove ms if present
    }

    const parts = timeStr.split(':').map(val => {
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    });

    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
    return 0;
}

function formatDuration(totalSeconds: number): string {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00:00';

    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTime12(timeStr: string | null | undefined): string {
    if (!timeStr) return '--:--';

    // Handle ISO strings
    if (timeStr.includes('T')) {
        const timePart = timeStr.split('T')[1];
        if (timePart) timeStr = timePart.split('.')[0];
    }

    const parts = timeStr.split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return '--:--';

    const h = parts[0];
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}


const LiveClock: React.FC = () => {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    return (
        <span className="text-[10px] font-black uppercase tracking-widest tabular-nums">
            {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
    );
};


export const ClockWidget: React.FC = () => {
    const queryClient = useQueryClient();
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Live elapsed seconds (work time, excluding breaks)
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    // Live break elapsed seconds
    const [breakElapsedSeconds, setBreakElapsedSeconds] = useState(0);
    const [error, setError] = useState<string | null>(null);

    //Fetch today's attendance
    const { data: attendance, isLoading } = useQuery({
        queryKey: ['attendance', 'today'],
        queryFn: () => attendanceService.getTodayAttendance(),
        refetchInterval: 30_000, // refresh every 30s
    });

    const { data: geoSettings } = useQuery({
        queryKey: ['geo-fencing-settings'],
        queryFn: () => geoFencingService.getSettings(),
        staleTime: 1000 * 60 * 5,
    });

    // Derived state
    const isClockedIn = !!attendance?.check_in_time && !attendance?.check_out_time;
    const isClockedOut = !!attendance?.check_out_time;
    const isOnBreak = !!attendance?.active_break;
    const checkInSeconds = parseTimeToSeconds(attendance?.check_in_time);
    const totalBreakSeconds = attendance?.total_break_seconds ?? 0;

    // Live timer tick
    const startTick = useCallback(() => {
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = setInterval(() => {
            const nowSeconds = Math.floor(Date.now() / 1000);
            // Compute today midnight in local seconds
            const todayMidnight = new Date();
            todayMidnight.setHours(0, 0, 0, 0);
            const midnightSeconds = Math.floor(todayMidnight.getTime() / 1000);
            const nowTimeSeconds = nowSeconds - midnightSeconds;

            if (isClockedIn && !isClockedOut) {
                const rawElapsed = Math.max(0, nowTimeSeconds - checkInSeconds);
                // Subtract total break time (completed breaks + current break if on break)
                let currentBreakSecs = 0;
                if (isOnBreak && attendance?.active_break?.start_time) {
                    const breakStart = parseTimeToSeconds(attendance.active_break.start_time);
                    currentBreakSecs = Math.max(0, nowTimeSeconds - breakStart);
                    setBreakElapsedSeconds(currentBreakSecs);
                } else {
                    setBreakElapsedSeconds(0);
                }
                setElapsedSeconds(Math.max(0, rawElapsed - totalBreakSeconds - currentBreakSecs));
            }
        }, 1000);
    }, [isClockedIn, isClockedOut, isOnBreak, checkInSeconds, totalBreakSeconds, attendance?.active_break]);

    useEffect(() => {
        if (isClockedIn && !isClockedOut) {
            startTick();
        } else {
            if (tickRef.current) clearInterval(tickRef.current);
        }
        return () => { if (tickRef.current) clearInterval(tickRef.current); };
    }, [isClockedIn, isClockedOut, startTick]);

    // ── Geo helper ────────────────────────────────────────────────────────────
    const getCoords = useCallback(async (): Promise<{ latitude: number; longitude: number; device: string } | null> => {
        if (!geoSettings?.is_enabled) return null;
        const check = await geoFencingService.performGeoFenceCheck(geoSettings);
        if (!check.allowed) {
            setError(check.errorMessage || 'Geo-fence validation failed');
            return null;
        }
        return {
            latitude: check.position!.coords.latitude,
            longitude: check.position!.coords.longitude,
            device: detectDeviceType(),
        };
    }, [geoSettings]);

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'personal'] });
    };

    // ── Mutations ─────────────────────────────────────────────────────────────
    const clockInMutation = useMutation({
        mutationFn: async () => {
            const coords = await getCoords();
            return attendanceService.clockIn(coords ? { ...coords } : { device: detectDeviceType() } as any);
        },
        onSuccess: invalidate,
        onError: (e: any) => setError(e.response?.data?.message || e.message || 'Clock in failed'),
    });

    const clockOutMutation = useMutation({
        mutationFn: async () => {
            const coords = await getCoords();
            return attendanceService.clockOut(coords ? { ...coords } : { device: detectDeviceType() } as any);
        },
        onSuccess: invalidate,
        onError: (e: any) => setError(e.response?.data?.message || e.message || 'Clock out failed'),
    });

    const startBreakMutation = useMutation({
        mutationFn: () => attendanceService.startBreak(),
        onSuccess: invalidate,
        onError: (e: any) => setError(e.response?.data?.message || e.message || 'Failed to start break'),
    });

    const endBreakMutation = useMutation({
        mutationFn: () => attendanceService.endBreak(),
        onSuccess: invalidate,
        onError: (e: any) => setError(e.response?.data?.message || e.message || 'Failed to end break'),
    });

    const isAnyPending =
        clockInMutation.isPending ||
        clockOutMutation.isPending ||
        startBreakMutation.isPending ||
        endBreakMutation.isPending;

    // ── Render ────────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    // Status label & color
    const statusConfig = isClockedOut
        ? { label: 'Completed', color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' }
        : isOnBreak
            ? { label: 'On Break', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' }
            : isClockedIn
                ? { label: 'Working', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' }
                : { label: 'Not Started', color: 'text-slate-500 dark:text-gray-500', bg: 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5' };

    return (
        <div className="space-y-4">
            {/* Error Banner */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium"
                    >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400 ml-2">✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Status Badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest ${statusConfig.bg} ${statusConfig.color}`}>
                <span className={`w-2 h-2 rounded-full ${isOnBreak ? 'bg-amber-400' : isClockedIn && !isClockedOut ? 'bg-indigo-400 animate-pulse' : isClockedOut ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                {statusConfig.label}
            </div>

            {/* Live Timer Display */}
            <div className="text-center py-2">
                <AnimatePresence mode="wait">
                    {isOnBreak ? (
                        <motion.div key="break-timer" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                            <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-1">Break Time</p>
                            <p className="text-4xl font-black text-amber-500 dark:text-amber-400 tabular-nums tracking-tight font-mono">
                                {formatDuration(breakElapsedSeconds)}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-gray-600 font-bold uppercase tracking-widest mt-1">
                                Work: {formatDuration(elapsedSeconds)}
                            </p>
                        </motion.div>
                    ) : isClockedIn && !isClockedOut ? (
                        <motion.div key="work-timer" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                            <p className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-1">Time Worked</p>
                            <p className="text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight font-mono">
                                {formatDuration(elapsedSeconds)}
                            </p>
                        </motion.div>
                    ) : isClockedOut ? (
                        <motion.div key="done-timer" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Total Worked</p>
                            <p className="text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight font-mono">
                                {attendance?.effective_work_hours || '--:--'}
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div key="idle-timer" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                            <p className="text-[10px] font-black text-slate-400 dark:text-gray-600 uppercase tracking-widest mb-1">Ready to Start</p>
                            <p className="text-4xl font-black text-slate-200 dark:text-gray-700 tabular-nums tracking-tight font-mono">00:00:00</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Check In / Check Out Times */}
            <div className="grid grid-cols-2 gap-4">
                <div className="text-center py-2">
                    <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                        <LogIn className="w-3.5 h-3.5" /> Checked In
                    </p>
                    <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{formatTime12(attendance?.check_in_time)}</p>
                </div>
                <div className="text-center py-2 border-l border-slate-100 dark:border-white/5">
                    <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                        <LogOut className="w-3.5 h-3.5" /> Checked Out
                    </p>
                    <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{formatTime12(attendance?.check_out_time)}</p>
                </div>
            </div>

            {/* Break Summary (if any breaks taken) */}
            {(totalBreakSeconds > 0 || isOnBreak) && (
                <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-white/5 mt-2">
                    <div className="flex items-center gap-2">
                        <Coffee className="w-4 h-4 text-amber-500" />
                        <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">Total Break</p>
                    </div>
                    <p className="text-sm font-black text-amber-600 dark:text-amber-400 tabular-nums">
                        {formatDuration(totalBreakSeconds + (isOnBreak ? breakElapsedSeconds : 0))}
                    </p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
                {/* Primary: Clock In / Clock Out */}
                {!isClockedOut && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        disabled={isAnyPending || isOnBreak}
                        onClick={() => {
                            setError(null);
                            if (!isClockedIn) clockInMutation.mutate();
                            else clockOutMutation.mutate();
                        }}
                        className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 shadow-xl transition-all
              ${isOnBreak
                                ? 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-gray-600 cursor-not-allowed border border-slate-200 dark:border-white/5'
                                : !isClockedIn
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/30 hover:shadow-emerald-500/50'
                                    : 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-rose-500/30 hover:shadow-rose-500/50'
                            }`}
                    >
                        {isAnyPending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : !isClockedIn ? (
                            <><LogIn className="w-5 h-5" /> CLOCK IN</>
                        ) : (
                            <><LogOut className="w-5 h-5" /> CLOCK OUT</>
                        )}
                    </motion.button>
                )}

                {/* Completed state */}
                {isClockedOut && (
                    <div className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 bg-emerald-50 dark:bg-white/5 border border-emerald-100 dark:border-white/5 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                        DAY COMPLETED
                    </div>
                )}

                {/* Break Button — only visible when clocked in and not clocked out */}
                {isClockedIn && !isClockedOut && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        disabled={isAnyPending}
                        onClick={() => {
                            setError(null);
                            if (isOnBreak) endBreakMutation.mutate();
                            else startBreakMutation.mutate();
                        }}
                        className={`w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all border
              ${isOnBreak
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent shadow-indigo-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                            }`}
                    >
                        {isAnyPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isOnBreak ? (
                            <><Play className="w-4 h-4" /> RESUME WORK</>
                        ) : (
                            <><Coffee className="w-4 h-4" /> TAKE A BREAK</>
                        )}
                    </motion.button>
                )}
            </div>

            {/* Footer: current time */}
            <div className="flex items-center justify-center gap-1.5 text-gray-600">
                <Clock className="w-3 h-3" />
                <LiveClock />
            </div>
        </div>
    );
};


