import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, addDays, subDays, eachDayOfInterval, isSameDay } from 'date-fns';
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, Trash2, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import { timesheetService } from '@/services/timesheet.service';
import { attendanceService } from '@/services/attendance.service';
import { projectsService } from '@/services/projects.service';
import { cn } from '@/utils/cn';

// Interfaces
interface WeeklyTimesheetEntryProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

const MAX_HOURS = 9; // Standard work hours
const GRACE_PERIOD = 0.5; // 30 minutes grace period
const OVERTIME_THRESHOLD = MAX_HOURS + GRACE_PERIOD; // 9.5 hours - only show overtime above this

interface DaySplit {
    project_id: string;
    hours: number;
    notes?: string;
}

export const WeeklyTimesheetEntry: React.FC<WeeklyTimesheetEntryProps> = ({ onSuccess, onCancel }) => {
    const queryClient = useQueryClient();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [overtimeReasons, setOvertimeReasons] = useState<Record<string, string>>({});
    const [billableDays, setBillableDays] = useState<Record<string, boolean>>({});
    const [daySplits, setDaySplits] = useState<Record<string, DaySplit[]>>({});

    // Get current week range
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const dates = weekDays.map(d => format(d, 'yyyy-MM-dd'));

    // Fetch attendance hours for the current week
    const { data: attendanceHours, isLoading: isLoadingAttendance, error: attendanceError } = useQuery({
        queryKey: ['attendance', 'weekly-hours', format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')],
        queryFn: () => attendanceService.getWeeklyAttendanceHours({
            week_start: format(weekStart, 'yyyy-MM-dd'),
            week_end: format(weekEnd, 'yyyy-MM-dd')
        }),
    });

    // Fetch existing timesheet entries for the week
    const { data: existingEntries, isLoading: isLoadingEntries } = useQuery({
        queryKey: ['existing-timesheets', weekStart.toISOString()],
        queryFn: () => timesheetService.getMyTimesheets({
            week_start_date: format(weekStart, 'yyyy-MM-dd')
        })
    });

    // Fetch projects
    const { data: projects } = useQuery({
        queryKey: ['projects', 'list'],
        queryFn: () => projectsService.getProjects({ status: 'ACTIVE' }),
    });

    // Initialize state from attendance and existing entries
    useEffect(() => {
        if (attendanceHours?.daily_data) {
            const initialBillable: Record<string, boolean> = {};
            const initialSplits: Record<string, DaySplit[]> = {};
            const initialOvertime: Record<string, string> = {};

            dates.forEach(dateStr => {
                // Find existing entries for this date
                const dayEntries = existingEntries?.filter(e =>
                    e.work_date && isSameDay(new Date(e.work_date), new Date(dateStr))
                ) || [];

                if (dayEntries.length > 0) {
                    // Check if any entry has a project (meaning it was billable)
                    // The backend returns project: { id, name }
                    const isBillable = dayEntries.some(e => e.project?.id || e.project_id);
                    initialBillable[dateStr] = isBillable;

                    if (isBillable) {
                        initialSplits[dateStr] = dayEntries
                            .filter(e => e.project?.id || e.project_id)
                            .map(e => ({
                                project_id: (e.project?.id || e.project_id || '').toString(),
                                hours: Number(e.hours),
                                notes: e.notes || ''
                            }));
                    } else {
                        // If not billable but has entry, it's a standard entry
                        // Prefer the saved hours from DB for accuracy
                        initialSplits[dateStr] = [{
                            project_id: '',
                            hours: Number(dayEntries[0].hours),
                            notes: dayEntries[0].notes || ''
                        }];
                    }

                    // Collect notes as overtime reason if needed (combine all entry notes)
                    const combinedNotes = dayEntries.map(e => e.notes).filter(Boolean).join('. ');
                    if (combinedNotes) initialOvertime[dateStr] = combinedNotes;
                } else {
                    // Default for new days
                    initialBillable[dateStr] = false;
                    initialSplits[dateStr] = [{
                        project_id: '',
                        hours: getDailyHours(dateStr),
                        notes: ''
                    }];
                }
            });

            setBillableDays(initialBillable);
            setDaySplits(initialSplits);
            setOvertimeReasons(initialOvertime);
        }
    }, [attendanceHours, existingEntries, weekStart]);

    // Check if any existing entry is in a state that prevents editing
    const isReadOnly = existingEntries?.some(e => e.status === 'APPROVED' || e.status === 'SUBMITTED');
    const timesheetStatus = existingEntries?.[0]?.status || 'DRAFT';

    useEffect(() => {
        if (attendanceError) {
            toast.error("Failed to load attendance hours");
        }
    }, [attendanceError]);

    // Get daily data from attendance
    const getDailyData = (dateStr: string) => {
        return attendanceHours?.daily_data?.[dateStr] || null;
    };

    // Get daily hours from attendance data
    const getDailyHours = (dateStr: string): number => {
        return getDailyData(dateStr)?.hours || 0;
    };

    // Check if day is on leave
    const isOnLeave = (dateStr: string): boolean => {
        return getDailyData(dateStr)?.status === 'LEAVE';
    };

    // Get leave type name
    const getLeaveType = (dateStr: string): string => {
        return getDailyData(dateStr)?.leave_type || 'Leave';
    };

    // Check if a day has overtime (beyond max + grace period)
    const hasOvertime = (dateStr: string): boolean => {
        const hours = getDailyHours(dateStr);
        return hours > OVERTIME_THRESHOLD;
    };

    // Count days with overtime that need reasons
    const daysNeedingReason = dates.filter(d => hasOvertime(d) && !overtimeReasons[d]?.trim());

    // Handle overtime reason change
    const handleOvertimeReasonChange = (dateStr: string, reason: string) => {
        setOvertimeReasons(prev => ({ ...prev, [dateStr]: reason }));
    };

    // Handle billable toggle
    const handleBillableToggle = (dateStr: string, isBillable: boolean) => {
        setBillableDays(prev => ({ ...prev, [dateStr]: isBillable }));
    };

    // Handle adding a split
    const addSplit = (dateStr: string) => {
        const dailyHours = getDailyHours(dateStr);
        const currentSplits = daySplits[dateStr] || [];
        const currentTotal = currentSplits.reduce((acc, s) => acc + s.hours, 0);
        const remainingHours = Math.max(0, dailyHours - currentTotal);

        setDaySplits(prev => ({
            ...prev,
            [dateStr]: [
                ...(prev[dateStr] || []),
                { project_id: '', hours: remainingHours, notes: '' }
            ]
        }));
    };

    // Handle removing a split
    const removeSplit = (dateStr: string, index: number) => {
        setDaySplits(prev => ({
            ...prev,
            [dateStr]: prev[dateStr].filter((_, i) => i !== index)
        }));
    };

    // Handle split update
    const updateSplit = (dateStr: string, index: number, updates: Partial<DaySplit>) => {
        // Validation: Project Uniqueness
        if (updates.project_id) {
            const currentSplits = daySplits[dateStr] || [];
            const isDuplicate = currentSplits.some((s, i) => i !== index && s.project_id === updates.project_id);
            if (isDuplicate) {
                toast.error('This project is already selected for this day.');
                return;
            }
        }

        // Validation: Split hours cannot exceed total daily hours
        if (updates.hours !== undefined) {
            const dailyTotal = getDailyHours(dateStr);
            if (updates.hours > dailyTotal) {
                toast.error(`Individual split cannot exceed daily total of ${dailyTotal} hrs`);
                return;
            }
        }

        setDaySplits(prev => {
            const current = [...(prev[dateStr] || [])];
            current[index] = { ...current[index], ...updates };
            return { ...prev, [dateStr]: current };
        });
    };

    // Copy one day's configuration to all other days with attendance
    const copyDaySetupToAll = (sourceDateStr: string) => {
        const sourceSplits = daySplits[sourceDateStr] || [];
        if (sourceSplits.length === 0 || sourceSplits.every(s => !s.project_id)) {
            toast.error("Please select at least one project first.");
            return;
        }

        const sourceTotal = getDailyHours(sourceDateStr);

        setDaySplits(prev => {
            const next = { ...prev };
            dates.forEach(targetDateStr => {
                if (targetDateStr === sourceDateStr) return;

                const targetHours = getDailyHours(targetDateStr);
                if (targetHours > 0 && !isOnLeave(targetDateStr)) {
                    // Proportionally scale hours if daily totals differ
                    const scaledSplits = sourceSplits.map(s => ({
                        ...s,
                        hours: Number(((s.hours / sourceTotal) * targetHours).toFixed(1))
                    }));

                    next[targetDateStr] = scaledSplits;
                    setBillableDays(b => ({ ...b, [targetDateStr]: true }));
                }
            });
            return next;
        });
        toast.success("Applied to all working days!");
    };

    // Validate before submit
    const validate = () => {
        for (const dateStr of dates) {
            const dailyHours = getDailyHours(dateStr);
            const onLeave = isOnLeave(dateStr);

            if (onLeave) continue;

            if (hasOvertime(dateStr) && !overtimeReasons[dateStr]?.trim()) {
                toast.error(`Please provide a reason for overtime on ${format(new Date(dateStr), 'MMM d')}`);
                return false;
            }

            if (billableDays[dateStr]) {
                const splits = daySplits[dateStr] || [];
                if (splits.length === 0) {
                    toast.error(`Please add at least one project for ${format(new Date(dateStr), 'MMM d')}`);
                    return false;
                }

                const projectsSeen = new Set<string>();
                let splitTotal = 0;
                for (const split of splits) {
                    if (!split.project_id) {
                        toast.error(`Please select a project for all splits on ${format(new Date(dateStr), 'MMM d')}`);
                        return false;
                    }

                    if (projectsSeen.has(split.project_id)) {
                        toast.error(`Duplicate project selected for ${format(new Date(dateStr), 'MMM d')}`);
                        return false;
                    }
                    projectsSeen.add(split.project_id);

                    if (split.hours <= 0) {
                        toast.error(`Hours must be greater than 0 for all splits on ${format(new Date(dateStr), 'MMM d')}`);
                        return false;
                    }
                    splitTotal += split.hours;
                }

                // Small tolerance for floating point precision
                if (Math.abs(splitTotal - dailyHours) > 0.01) {
                    toast.error(`Total split hours (${splitTotal.toFixed(1)}) must match attendance hours (${dailyHours.toFixed(1)}) for ${format(new Date(dateStr), 'MMM d')}`);
                    return false;
                }
            }
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setIsSubmitting(true);

        try {
            // Create entries from attendance hours and splits
            const entries: any[] = [];

            dates.forEach(dateStr => {
                const dailyHours = getDailyHours(dateStr);
                if (dailyHours <= 0) return;

                if (billableDays[dateStr]) {
                    const splits = daySplits[dateStr] || [];
                    splits.forEach(split => {
                        entries.push({
                            work_date: dateStr,
                            hours: split.hours,
                            notes: (overtimeReasons[dateStr] ? `${overtimeReasons[dateStr]}. ${split.notes || ''}` : split.notes) || undefined,
                            project_id: split.project_id
                        });
                    });
                } else {
                    // Non-billable day: only create entry if there are actual attendance hours
                    if (dailyHours > 0) {
                        entries.push({
                            work_date: dateStr,
                            hours: dailyHours,
                            notes: overtimeReasons[dateStr] || undefined,
                            project_id: undefined
                        });
                    }
                }
            });

            if (entries.length === 0) {
                toast.error("No attendance hours to submit");
                setIsSubmitting(false);
                return;
            }

            await timesheetService.createWeeklyTimesheet({
                week_start_date: format(weekStart, 'yyyy-MM-dd'),
                week_end_date: format(weekEnd, 'yyyy-MM-dd'),
                entries
            });

            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            queryClient.invalidateQueries({ queryKey: ['attendance', 'weekly-hours'] });
            toast.success("Timesheet submitted successfully");
            if (onSuccess) onSuccess();
            setOvertimeReasons({});
        } catch (error: any) {
            console.error(error);
            toast.error(error?.response?.data?.message || "Failed to submit timesheet");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingAttendance || isLoadingEntries) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4 h-[400px]">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-sm font-medium text-gray-400 animate-pulse">Syncing timesheet data...</p>
            </div>
        );
    }

    return (
        <Card className="p-0 border-none shadow-none bg-white dark:bg-gray-800/50">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                        <CalendarIcon size={20} className="stroke-[2.5px]" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">Weekly Timesheet</h3>
                        <p className="text-xs text-gray-500 font-medium">{format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 p-1 rounded-lg">
                    <Button variant="ghost" size="sm" onClick={() => setCurrentDate(subDays(currentDate, 7))} className="h-8 w-8 p-0">
                        <ChevronLeft size={16} />
                    </Button>
                    <span className="text-xs font-bold px-2 min-w-[100px] text-center">
                        {isSameDay(currentDate, new Date()) ? 'Current Week' : format(weekStart, 'MMM d')}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addDays(currentDate, 7))} className="h-8 w-8 p-0">
                        <ChevronRight size={16} />
                    </Button>
                </div>
            </div>

            {/* Attendance Days List */}
            <div className="p-6 space-y-4">
                {dates.map(dateStr => {
                    const hours = getDailyHours(dateStr);
                    const onLeave = isOnLeave(dateStr);
                    const leaveType = getLeaveType(dateStr);
                    const isOvertime = hasOvertime(dateStr);
                    const needsReason = isOvertime && !overtimeReasons[dateStr]?.trim();
                    const dayDate = new Date(dateStr);
                    const isToday = isSameDay(dayDate, new Date());
                    const dayIsLogged = existingEntries?.some(e => e.work_date && isSameDay(new Date(e.work_date), new Date(dateStr)));

                    return (
                        <div
                            key={dateStr}
                            className={cn(
                                "group relative bg-white dark:bg-gray-800/40 rounded-2xl border transition-all duration-300",
                                isToday ? "border-indigo-200 dark:border-indigo-500/30 shadow-md shadow-indigo-500/5 ring-1 ring-indigo-50/50" : "border-gray-100 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600 shadow-sm"
                            )}
                        >
                            <div className="flex flex-col md:flex-row p-4 gap-6">
                                {/* Left Side: Day Identity */}
                                <div className="flex items-center gap-4 min-w-[140px]">
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black transition-colors",
                                        isToday ? "bg-indigo-600 text-white" : "bg-gray-50 dark:bg-gray-800 text-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-gray-700"
                                    )}>
                                        <span className="text-[10px] uppercase tracking-tighter leading-none mb-0.5">{format(dayDate, 'EEE')}</span>
                                        <span className="text-lg leading-none">{format(dayDate, 'd')}</span>
                                    </div>
                                    <div>
                                        <p className={cn("text-xs font-bold uppercase tracking-widest leading-none mb-1", isToday ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400")}>
                                            {format(dayDate, 'MMMM')}
                                        </p>
                                        {onLeave ? (
                                            <div className="flex items-center gap-1 text-amber-500">
                                                <span className="text-[10px] font-extrabold uppercase truncate max-w-[80px]">{leaveType}</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                {hours > 0 ? (
                                                    <div className={cn("flex items-center gap-1", isOvertime ? "text-orange-500" : "text-green-500")}>
                                                        <Clock size={12} />
                                                        <span className="text-xs font-black">{hours.toFixed(1)} hrs</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 uppercase italic">No Entry</span>
                                                )}
                                                {existingEntries?.some(e => e.work_date && isSameDay(new Date(e.work_date), new Date(dateStr))) && (
                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-md border border-green-100 dark:border-green-500/20 w-fit">
                                                        <span className="text-[8px] font-black uppercase">Logged</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Middle Section: Billable Toggle or Logged Status */}
                                <div className="flex items-center md:px-6 md:border-l md:border-r border-gray-100 dark:border-gray-700/50">
                                    {!onLeave && (
                                        dayIsLogged ? (
                                            <div className="flex flex-row md:flex-col items-center gap-1">
                                                <div className="px-2.5 py-1 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/20">
                                                    <span className="text-[9px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">Saved</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-row md:flex-col items-center gap-2">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:block">Billable</span>
                                                <button
                                                    disabled={hours === 0 || isReadOnly}
                                                    onClick={() => handleBillableToggle(dateStr, !billableDays[dateStr])}
                                                    className={cn(
                                                        "w-10 h-5 rounded-full transition-all relative focus:outline-none ring-offset-2 focus:ring-2",
                                                        billableDays[dateStr] ? "bg-indigo-600 ring-indigo-500" : "bg-gray-200 dark:bg-gray-700 ring-gray-200 dark:ring-gray-700",
                                                        (hours === 0 || isReadOnly) && "opacity-30 cursor-not-allowed"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                                                        billableDays[dateStr] ? "left-5.5" : "left-0.5"
                                                    )} />
                                                </button>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest md:hidden">Billable</span>
                                            </div>
                                        )
                                    )}
                                </div>

                                {/* Right Section: Splits / Projects */}
                                <div className="flex-1 min-w-0">
                                    {!onLeave && !dayIsLogged && billableDays[dateStr] ? (
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap gap-3">
                                                {daySplits[dateStr]?.map((split, idx) => (
                                                    <div key={idx} className="flex-1 min-w-[240px] bg-gray-50/50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-3 group/split transition-all hover:bg-white dark:hover:bg-gray-800 hover:border-indigo-100 dark:hover:border-indigo-900/30">
                                                        <div className="flex-1 min-w-0">
                                                            <select
                                                                value={split.project_id}
                                                                onChange={(e) => updateSplit(dateStr, idx, { project_id: e.target.value })}
                                                                disabled={isReadOnly}
                                                                className={cn(
                                                                    "w-full text-[11px] font-bold bg-transparent border-none outline-none text-indigo-700 dark:text-indigo-300 cursor-pointer disabled:cursor-default",
                                                                    !split.project_id ? "text-orange-500" : ""
                                                                )}
                                                            >
                                                                <option value="" disabled className="text-gray-400">Select Project...</option>
                                                                {projects?.map((p: any) => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-700">
                                                            <input
                                                                type="number"
                                                                step="0.5"
                                                                min="0"
                                                                max={hours}
                                                                value={split.hours || ''}
                                                                onChange={(e) => updateSplit(dateStr, idx, { hours: parseFloat(e.target.value) || 0 })}
                                                                disabled={isReadOnly}
                                                                className="w-8 text-xs bg-transparent outline-none font-black text-indigo-600 dark:text-indigo-400 text-center"
                                                                placeholder="0"
                                                            />
                                                            <span className="text-[9px] text-gray-400 font-black uppercase">hrs</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {daySplits[dateStr].length > 1 && !isReadOnly && (
                                                                <button
                                                                    onClick={() => removeSplit(dateStr, idx)}
                                                                    className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                                                                    title="Remove Split"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {!isReadOnly && (
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => addSplit(dateStr)}
                                                            disabled={isReadOnly}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 dark:bg-indigo-500/5 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 rounded-lg transition-all border border-indigo-100/50 dark:border-indigo-500/20"
                                                        >
                                                            <Plus size={14} /> ADD PROJECT SPLIT
                                                        </button>
                                                        <button
                                                            onClick={() => copyDaySetupToAll(dateStr)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-gray-500 hover:text-indigo-600 bg-gray-50 dark:bg-gray-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all border border-gray-100 dark:border-gray-700/50"
                                                            title="Apply this project setup to all working days this week"
                                                        >
                                                            <Copy size={13} /> COPY TO ALL DAYS
                                                        </button>
                                                    </div>

                                                    {daySplits[dateStr]?.length > 1 && (
                                                        <div className={cn(
                                                            "px-3 py-1 font-black text-[10px] rounded-lg border",
                                                            Math.abs((daySplits[dateStr]?.reduce((acc, s) => acc + s.hours, 0) || 0) - hours) < 0.01
                                                                ? "bg-green-50 dark:bg-green-900/10 text-green-600 border-green-100 dark:border-green-900/30"
                                                                : "bg-orange-50 dark:bg-orange-900/10 text-orange-600 border-orange-100 dark:border-orange-900/30"
                                                        )}>
                                                            TOTAL: {daySplits[dateStr].reduce((acc, s) => acc + s.hours, 0).toFixed(1)} / {hours.toFixed(1)} HRS
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col justify-center">
                                            {isOvertime && needsReason ? (
                                                <div className="flex-1 animate-pulse">
                                                    <input
                                                        type="text"
                                                        placeholder={`Reason for extended hours (${hours.toFixed(1)} hrs)...`}
                                                        value={overtimeReasons[dateStr] || ''}
                                                        onChange={(e) => handleOvertimeReasonChange(dateStr, e.target.value)}
                                                        className="w-full px-4 py-3 text-xs rounded-xl border-2 border-orange-300 dark:border-orange-500/50 bg-orange-50/50 dark:bg-orange-900/10 focus:ring-2 focus:ring-orange-500 outline-none placeholder:text-orange-400 font-bold"
                                                    />
                                                </div>
                                            ) : onLeave ? (
                                                <p className="text-xs text-amber-500/60 font-bold italic tracking-wide">Leave entries are automatically excluded from timesheets.</p>
                                            ) : dayIsLogged ? (
                                                <div className="bg-green-50/30 dark:bg-green-500/5 p-3 rounded-xl border border-green-100/50 dark:border-green-500/10">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest">Logged Detail</p>
                                                        <span className="text-[10px] font-bold text-green-600/60 tabular-nums">
                                                            {existingEntries
                                                                ?.filter(e => isSameDay(new Date(e.work_date), new Date(dateStr)))
                                                                .reduce((sum, e) => sum + Number(e.hours), 0).toFixed(1)} HRS
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {existingEntries
                                                            ?.filter(e => isSameDay(new Date(e.work_date), new Date(dateStr)))
                                                            .map((entry, idx) => (
                                                                <div key={idx} className="flex items-start gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1" />
                                                                    <div className="flex-1">
                                                                        <p className="text-[11px] font-bold text-green-800 dark:text-green-300">
                                                                            {entry.project?.name || entry.project_name || "Standard Attendance Record"}
                                                                            <span className="ml-2 text-green-600/50">({Number(entry.hours).toFixed(1)} hrs)</span>
                                                                        </p>
                                                                        {entry.notes && (
                                                                            <p className="text-[9px] text-green-600/70 font-medium italic line-clamp-1">{entry.notes}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                    <p className="mt-2 text-[9px] text-green-500 font-bold uppercase tracking-tight cursor-default">✓ Timesheet saved</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {existingEntries?.some(e => isSameDay(new Date(e.work_date), new Date(dateStr))) ? (
                                                        <div className="bg-green-50/30 dark:bg-green-500/5 p-3 rounded-xl border border-green-100/50 dark:border-green-500/10">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <p className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest">Logged Detail</p>
                                                                <span className="text-[10px] font-bold text-green-600/60 tabular-nums">
                                                                    {existingEntries
                                                                        .filter(e => isSameDay(new Date(e.work_date), new Date(dateStr)))
                                                                        .reduce((sum, e) => sum + Number(e.hours), 0).toFixed(1)} HRS
                                                                </span>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                {existingEntries
                                                                    .filter(e => isSameDay(new Date(e.work_date), new Date(dateStr)))
                                                                    .map((entry, idx) => (
                                                                        <div key={idx} className="flex items-start gap-2">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1" />
                                                                            <div className="flex-1">
                                                                                <p className="text-[11px] font-bold text-green-800 dark:text-green-300">
                                                                                    {entry.project_name || "Standard Attendance Record"}
                                                                                    <span className="ml-2 text-green-600/50">({Number(entry.hours).toFixed(1)} hrs)</span>
                                                                                </p>
                                                                                {entry.notes && (
                                                                                    <p className="text-[9px] text-green-600/70 font-medium italic line-clamp-1">{entry.notes}</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                }
                                                            </div>
                                                            <p className="mt-2 text-[9px] text-indigo-500 font-bold uppercase tracking-tight cursor-default">
                                                                {isReadOnly ? "Timesheet is locked" : "Enable billable to edit projects"}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-gray-400 font-bold tracking-wide italic">
                                                            {hours > 0 ? "Standard work entry. Enable billable to split by projects." : "No activity recorded for this date."}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer / Totals */}
            <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 flex items-center gap-8">
                    {/* Total Attendance Hours */}
                    <div className="flex flex-col">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Weekly Total</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                                {attendanceHours?.total_hours?.toFixed(1) ?? '0'}
                            </span>
                            <span className="text-xs font-black text-gray-400 uppercase">hrs</span>
                        </div>
                    </div>

                    {/* Pending Actions Tracker */}
                    <div className="hidden lg:flex flex-col gap-2">
                        {daysNeedingReason.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/10 rounded-full border border-orange-100 dark:border-orange-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-tight"> {daysNeedingReason.length} OVERTIME REASONS NEEDED</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    {onCancel && (
                        <Button variant="ghost" onClick={onCancel} className="text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-50 flex-1 md:flex-none h-12">Cancel</Button>
                    )}
                    {isReadOnly ? (
                        <div className={cn(
                            "px-8 h-12 flex items-center justify-center rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border-2",
                            timesheetStatus === 'APPROVED'
                                ? "bg-green-50 text-green-600 border-green-200"
                                : "bg-blue-50 text-blue-600 border-blue-200"
                        )}>
                            {timesheetStatus}
                        </div>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            isLoading={isSubmitting}
                            disabled={daysNeedingReason.length > 0 || (attendanceHours?.total_hours ?? 0) === 0}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 h-12 rounded-xl shadow-[0_8px_30px_rgb(79,70,229,0.3)] transition-all hover:-translate-y-0.5 active:translate-y-0 flex-1 md:flex-none uppercase tracking-widest text-xs"
                        >
                            Submit Timesheet
                        </Button>
                    )}
                </div>
            </div>
        </Card >
    );
};
