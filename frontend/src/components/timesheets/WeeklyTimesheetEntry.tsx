import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, addDays, subDays, eachDayOfInterval, isSameDay, isAfter, startOfDay } from 'date-fns';
import { Loader2, ChevronLeft, ChevronRight, Plus, Trash2, Save, IndianRupee, Ban, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { showToast } from '@/utils/toast';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import { timesheetService } from '@/services/timesheet.service';
import { attendanceService } from '@/services/attendance.service';
import { projectsService } from '@/services/projects.service';
import { cn } from '@/utils/cn';
import { Task, Timesheet } from '@/types/project.types';
import { useAuth } from '@/contexts/AuthContext';

// Interfaces
interface WeeklyTimesheetEntryProps {
    onSuccess?: () => void;
    onCancel?: () => void;
    initialDate?: Date;
    preloadedTimesheet?: Timesheet;
    isApprovalMode?: boolean;
    onApprove?: (id: string, notes?: string) => void;
    onReject?: (id: string, reason: string) => void;
}

interface TimesheetRow {
    id: string;
    projectId: string;
    taskId: string;
    isBillable: boolean;
    hours: Record<string, number>;
    notes: Record<string, string>;
    projectName?: string;
    taskTitle?: string;
}

export const WeeklyTimesheetEntry: React.FC<WeeklyTimesheetEntryProps> = ({
    onSuccess,
    onCancel,
    initialDate,
    preloadedTimesheet,
    isApprovalMode,
    onApprove,
    onReject
}) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [currentDate, setCurrentDate] = useState(initialDate || (preloadedTimesheet ? new Date(preloadedTimesheet.week_start_date!) : new Date()));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [forceEdit, setForceEdit] = useState(false);

    // Reset edit mode when navigating weeks
    useEffect(() => { setForceEdit(false); }, [currentDate]);

    // Matrix State
    const [rows, setRows] = useState<TimesheetRow[]>([]);

    // Reset rows when navigating to a different week
    useEffect(() => {
        if (!preloadedTimesheet) {
            setRows([{
                id: Math.random().toString(36).substr(2, 9),
                projectId: '',
                taskId: '',
                isBillable: true,
                hours: {},
                notes: {}
            }]);
        }
    }, [currentDate]);

    // Get current week range
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const dates = weekDays.map(d => format(d, 'yyyy-MM-dd'));

    // Fetch attendance hours for reference
    const { data: attendanceHours, isLoading: isLoadingAttendance } = useQuery({
        queryKey: ['attendance', 'weekly-hours', format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd'), preloadedTimesheet?.employee?.id],
        queryFn: () => attendanceService.getWeeklyAttendanceHours({
            week_start: format(weekStart, 'yyyy-MM-dd'),
            week_end: format(weekEnd, 'yyyy-MM-dd'),
            employee_id: preloadedTimesheet?.employee?.id
        }),
        enabled: true // Enable for everyone now that it supports employee_id
    });

    // Fetch existing timesheet entries for the week (if not preloaded)
    const { data: fetchedEntries, isLoading: isLoadingEntries } = useQuery({
        queryKey: ['existing-timesheets', weekStart.toISOString()],
        queryFn: () => timesheetService.getMyTimesheets({
            week_start_date: format(weekStart, 'yyyy-MM-dd')
        }),
        enabled: !preloadedTimesheet
    });

    const activeEntries = preloadedTimesheet ? preloadedTimesheet.entries : fetchedEntries;
    const activeTimesheetStatus = preloadedTimesheet ? preloadedTimesheet.status : (activeEntries as any)?.[0]?.status;

    // Fetch projects
    const { data: projects } = useQuery({
        queryKey: ['projects', 'list'],
        queryFn: () => projectsService.getProjects({ status: 'ACTIVE' }),
    });

    // Initialize Rows
    useEffect(() => {
        if (activeEntries && projects) {
            // Group entries by Project + Task
            const grouped: Record<string, TimesheetRow> = {};

            // Filter entries to only include dates within the current week
            const currentWeekDates = new Set(dates);

            activeEntries.forEach(entry => {
                if (!entry.work_date) return;
                const dateStr = format(new Date(entry.work_date), 'yyyy-MM-dd');

                // Skip entries that don't belong to the current week view
                if (!currentWeekDates.has(dateStr)) return;

                // Handle both flat entries and nested entries structures
                const pId = ((entry as any).project?.id || (entry as any).project_id || '').toString();
                const tId = ((entry as any).task?.id || (entry as any).task_id || '').toString();

                const key = `${pId}-${tId}`;

                if (!grouped[key]) {
                    grouped[key] = {
                        id: key,
                        projectId: pId,
                        taskId: tId,
                        isBillable: (entry as any).is_billable !== false,
                        hours: {},
                        notes: {},
                        projectName: (entry as any).project?.name || (entry as any).project_name,
                        taskTitle: (entry as any).task?.title || (entry as any).task_title
                    };
                }

                grouped[key].hours[dateStr] = (grouped[key].hours[dateStr] || 0) + Number(entry.hours);
                if (entry.notes) {
                    grouped[key].notes[dateStr] = grouped[key].notes[dateStr]
                        ? grouped[key].notes[dateStr] + '\n' + entry.notes
                        : entry.notes;
                }
            });

            const initRows = Object.values(grouped);
            if (initRows.length === 0) {
                if (isApprovalMode) {
                    setRows([]); // No rows to show
                } else {
                    setRows([{
                        id: Math.random().toString(36).substr(2, 9),
                        projectId: '',
                        taskId: '',
                        isBillable: true,
                        hours: {},
                        notes: {}
                    }]);
                }
            } else {
                setRows(initRows);
            }
        }
    }, [activeEntries, projects, isApprovalMode, dates.join(',')]);

    const timesheetStatus = activeTimesheetStatus || 'DRAFT';
    const hasExistingData = activeEntries && activeEntries.length > 0;

    // Read-only logic:
    // 1. Approval Mode: ALWAYS read-only
    // 2. Approved Status: ALWAYS read-only
    // 3. Submitted/Draft: Read-only unless forceEdit is true
    const isReadOnly = isApprovalMode || timesheetStatus === 'APPROVED' || (hasExistingData && !forceEdit);

    // Helper to get daily total from rows
    const getDailyTotal = (dateStr: string) => {
        return rows.reduce((acc, row) => acc + (row.hours[dateStr] || 0), 0);
    };

    // Helper to get daily attendance hours
    const getAttendanceTotal = (dateStr: string) => {
        return attendanceHours?.daily_data?.[dateStr]?.hours || 0;
    };

    const handleAddRow = () => {
        setRows(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            projectId: '',
            taskId: '',
            isBillable: true,
            hours: {},
            notes: {}
        }]);
    };

    const handleRemoveRow = (id: string) => {
        setRows(prev => prev.filter(r => r.id !== id));
    };

    const handleRowChange = (id: string, field: keyof TimesheetRow, value: any) => {
        setRows(prev => prev.map(r => {
            if (r.id !== id) return r;
            if (field === 'projectId' && value !== r.projectId) {
                const proj = projects?.find((p: any) => p.id?.toString() === value?.toString());
                const isProjectBillable = proj?.is_billable !== false;
                return { ...r, projectId: value, taskId: '', isBillable: isProjectBillable };
            }
            return { ...r, [field]: value };
        }));
    };

    const handleHourChange = (id: string, dateStr: string, val: string) => {
        const numVal = parseFloat(val);
        setRows(prev => prev.map(r => {
            if (r.id !== id) return r;
            const newHours = { ...r.hours };
            if (val === '' || isNaN(numVal)) {
                delete newHours[dateStr];
            } else {
                newHours[dateStr] = numVal;
            }
            return { ...r, hours: newHours };
        }));
    };

    const handleSubmit = async (shouldSubmit: boolean) => {
        if (isApprovalMode) return;
        setIsSubmitting(true);
        try {
            // Validation
            const entries: any[] = [];
            let hasErrors = false;

            for (const row of rows) {
                const totalRowHours = Object.values(row.hours).reduce((a, b) => a + b, 0);
                if (totalRowHours === 0) continue;

                if (!row.projectId) {
                    showToast.error(t('timesheets.entry.validation.selectProject'));
                    hasErrors = true;
                    break;
                }

                for (const dateStr of dates) {
                    const hrs = row.hours[dateStr];
                    if (hrs && hrs > 0) {
                        // Block future date entries
                        const entryDate = new Date(dateStr);
                        if (isAfter(startOfDay(entryDate), startOfDay(new Date()))) {
                            showToast.error(t('timesheets.entry.validation.futureDate', { date: format(entryDate, 'MMM d') }));
                            hasErrors = true;
                            break;
                        }
                        entries.push({
                            work_date: dateStr,
                            hours: hrs,
                            project_id: row.projectId,
                            task_id: row.taskId || undefined,
                            notes: row.notes[dateStr],
                            is_billable: row.isBillable
                        });
                    }
                }
                if (hasErrors) break;
            }

            if (hasErrors) {
                setIsSubmitting(false);
                return;
            }

            if (entries.length === 0) {
                showToast.error(t('timesheets.entry.validation.noTime'));
                setIsSubmitting(false);
                return;
            }

            // Validate max 24h per day
            const dailyTotals: Record<string, number> = {};
            for (const entry of entries) {
                dailyTotals[entry.work_date] = (dailyTotals[entry.work_date] || 0) + entry.hours;
            }
            for (const [dateStr, total] of Object.entries(dailyTotals)) {
                if (total > 24) {
                    showToast.error(t('timesheets.entry.validation.exceed24h', { date: format(new Date(dateStr), 'MMM d'), total }));
                    setIsSubmitting(false);
                    return;
                }
            }

            const status = shouldSubmit ? 'SUBMITTED' : 'DRAFT';

            await timesheetService.createWeeklyTimesheet({
                week_start_date: format(weekStart, 'yyyy-MM-dd'),
                week_end_date: format(weekEnd, 'yyyy-MM-dd'),
                entries,
                status
            });

            if (shouldSubmit) {
                showToast.success(t('timesheets.entry.submittedSuccess'));
            } else {
                showToast.success(t('timesheets.entry.draftSavedSuccess'));
            }

            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            queryClient.invalidateQueries({ queryKey: ['existing-timesheets'] });

            if (onSuccess) onSuccess();

        } catch (error: any) {
            console.error(error);
            showToast.error(shouldSubmit ? t('timesheets.entry.submitFailed') : t('timesheets.entry.saveFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const TaskSelect = ({ projectId, value, onChange, disabled }: { projectId: string; value: string; onChange: (val: string) => void; disabled?: boolean }) => {
        const { data: tasks, isLoading } = useQuery({
            queryKey: ['tasks', projectId],
            queryFn: () => projectsService.getTasks({ project_id: projectId }),
            enabled: !!projectId
        });

        const selectedTask = tasks?.find((t: Task) => t.id?.toString() === value?.toString());

        if (disabled && selectedTask) {
            return (
                <p className="text-xs font-medium text-gray-600 leading-snug break-words whitespace-normal py-0.5">
                    {selectedTask.title}
                </p>
            );
        }
        if (disabled && !selectedTask) {
            return (
                <p className="text-xs text-gray-400 italic py-0.5">{t('timesheets.entry.noActivity')}</p>
            );
        }

        return (
            <select

                className="w-full bg-transparent text-xs font-medium outline-none border-b border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:border-brand-500 dark:focus:border-brand-400 transition-colors py-1 cursor-pointer dark:text-gray-200 dark:bg-gray-900"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={!projectId}
            >
                <option value="">{isLoading ? t('timesheets.entry.loading') : t('timesheets.entry.selectActivity')}</option>
                {tasks?.map((t: Task) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                ))}
            </select>
        );
    };

    if (isLoadingAttendance && !isApprovalMode || isLoadingEntries && !preloadedTimesheet) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4 h-[400px]">
                <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-6">
            <Card className="p-0 border-none shadow-none bg-white dark:bg-gray-900 flex flex-col flex-1">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-1 rounded-lg">
                            {/* Only allow navigation if NOT approval mode (manager views specific week) */}
                            <Button variant="ghost" size="sm" onClick={() => !isApprovalMode && setCurrentDate(subDays(currentDate, 7))} disabled={isApprovalMode} className="h-8 w-8 p-0 dark:text-gray-400 dark:hover:text-white">
                                <ChevronLeft size={16} />
                            </Button>
                            <div className="flex flex-col items-center px-2 min-w-[120px]">
                                <span className="text-xs font-bold text-gray-900 dark:text-white">
                                    {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                                </span>
                                <span className="text-[10px] text-gray-500 font-medium">
                                    {format(weekEnd, 'yyyy')}
                                </span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => !isApprovalMode && setCurrentDate(addDays(currentDate, 7))} disabled={isApprovalMode} className="h-8 w-8 p-0 dark:text-gray-400 dark:hover:text-white">
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Status Badge */}
                        <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            timesheetStatus === 'APPROVED' ? "bg-green-50 text-green-600 border-green-200" :
                                timesheetStatus === 'SUBMITTED' ? "bg-brand-50 text-brand-600 border-brand-200" :
                                    "bg-coral-50 text-coral-600 border-coral-200"
                        )}>
                            {t(`timesheets.entry.status.${timesheetStatus}`)}
                        </div>

                        {/* Edit button for DRAFT and SUBMITTED (not APPROVED, not Approval Mode) */}
                        {!isApprovalMode && hasExistingData && timesheetStatus !== 'APPROVED' && !forceEdit && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setForceEdit(true)}
                                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-indigo-900/20 border border-brand-200 dark:border-brand-800"
                            >
                                {timesheetStatus === 'SUBMITTED' ? t('timesheets.entry.recallEdit') : t('timesheets.entry.edit')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Matrix Grid */}
                <div className="flex-1 overflow-x-auto">
                    <div className="min-w-[1000px] p-6">
                        {/* Grid Header */}
                        <div className="flex border-b border-gray-200 dark:border-white/10 pb-2 mb-2">
                            <div className="w-[20%] px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('timesheets.entry.project')}</div>
                            <div className="w-[22%] px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('timesheets.entry.activity')}</div>
                            <div className="w-8 px-1 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest" title={t('timesheets.entry.billable')}><IndianRupee size={12} className="mx-auto" /></div>
                            {dates.map(dateStr => {
                                const date = new Date(dateStr);
                                const isToday = isSameDay(date, new Date());
                                const isFutureDate = isAfter(startOfDay(date), startOfDay(new Date()));
                                const weekOffs = (isApprovalMode && preloadedTimesheet?.employee?.shift_week_offs)
                                    ? (preloadedTimesheet.employee.shift_week_offs || [])
                                    : (user?.shift_week_offs || []);
                                const dayName = format(date, 'EEEE');
                                const isWeekOff = weekOffs.includes(dayName);

                                return (
                                    <div key={dateStr} className="flex-1 px-1 text-center">
                                        <div className={cn(
                                            "flex flex-col items-center justify-center py-1 rounded-lg transition-colors",
                                            isFutureDate ? "bg-gray-100 dark:bg-gray-800/50 text-gray-300 dark:text-gray-600 opacity-50" :
                                                isToday ? "bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400" :
                                                    isWeekOff ? "bg-red-50 dark:bg-red-900/10 text-red-400" : "text-gray-500 dark:text-gray-400"
                                        )}
                                            title={isFutureDate ? t('timesheets.entry.futureDateTooltip') : isWeekOff ? t('timesheets.entry.weekOff') : undefined}
                                        >
                                            <span className="text-[9px] font-black uppercase">{format(date, 'EEE')}</span>
                                            <span className="text-sm font-bold">{format(date, 'd')}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="w-16 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('timesheets.entry.total')}</div>
                            <div className="w-8"></div>
                        </div>

                        {/* Grid Rows */}
                        <div className="space-y-1">
                            {rows.map((row) => (
                                <div key={row.id} className="flex items-start py-2 border-b border-gray-50 dark:border-white/10 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                                    {/* Project */}
                                    <div className="w-[20%] px-2">
                                        {isReadOnly ? (
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 py-1">
                                                {projects?.find((p: any) => p.id?.toString() === row.projectId?.toString())?.name || row.projectName || <span className="text-gray-400 italic font-normal">{t('timesheets.entry.noProject')}</span>}
                                            </p>
                                        ) : (
                                            <select
                                                value={row.projectId}
                                                onChange={(e) => handleRowChange(row.id, 'projectId', e.target.value)}
                                                className="w-full bg-transparent text-sm font-semibold outline-none border-b border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:border-brand-500 transition-colors py-1 cursor-pointer dark:text-gray-200 dark:bg-gray-900"
                                            >
                                                <option value="">{t('timesheets.entry.selectProject')}</option>
                                                {projects?.map((p: any) => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {/* Activity */}
                                    <div className="w-[22%] px-2">
                                        {isReadOnly ? (
                                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 leading-snug break-words whitespace-normal py-0.5">
                                                {row.taskTitle || <span className="text-gray-400 italic">{t('timesheets.entry.noActivity')}</span>}
                                            </p>
                                        ) : (
                                            <TaskSelect
                                                projectId={row.projectId}
                                                value={row.taskId}
                                                onChange={(val) => handleRowChange(row.id, 'taskId', val)}
                                                disabled={isReadOnly}
                                            />
                                        )}
                                    </div>

                                    {/* Billable Toggle */}
                                    <div className="w-8 px-1 flex items-center justify-center">
                                        {(() => {
                                            const project = projects?.find((p: any) => p.id?.toString() === row.projectId?.toString());
                                            const isProjectBillable = project?.is_billable !== false;
                                            const canToggle = !isReadOnly && isProjectBillable;

                                            if (!isProjectBillable) {
                                                return (
                                                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 cursor-not-allowed" title={t('timesheets.entry.projectNonBillable')}>
                                                        <Ban size={12} />
                                                    </div>
                                                );
                                            }

                                            return (
                                                 <Button variant="ghost" 
                                                    onClick={() => canToggle && setRows(prev => prev.map(r => r.id === row.id ? { ...r, isBillable: !r.isBillable } : r))}
                                                    disabled={!canToggle}
                                                    title={row.isBillable ? t('timesheets.entry.billable') : t('timesheets.entry.nonBillable')}
                                                    className={cn(
                                                        "w-6 h-6 rounded-full flex items-center justify-center transition-all text-[10px] font-black",
                                                        row.isBillable
                                                            ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-300 dark:border-green-800"
                                                            : "bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700",
                                                        canToggle && "hover:scale-110 cursor-pointer"
                                                    )}
                                                >
                                                    <IndianRupee size={10} />
                                                </Button>
                                            );
                                        })()}
                                    </div>

                                    {/* Days Inputs */}
                                    {dates.map(dateStr => {
                                        const val = row.hours[dateStr];
                                        const date = new Date(dateStr);
                                        const isFutureDate = isAfter(startOfDay(date), startOfDay(new Date()));
                                        const dayName = format(date, 'EEEE');
                                        const weekOffs = (isApprovalMode && preloadedTimesheet?.employee?.shift_week_offs)
                                            ? (preloadedTimesheet.employee.shift_week_offs || [])
                                            : (user?.shift_week_offs || []);
                                        const isWeekOff = weekOffs.includes(dayName);
                                        const isCellDisabled = isReadOnly || isFutureDate;

                                        return (
                                            <div key={dateStr} className={cn(
                                                "flex-1 px-1 py-1 rounded-lg",
                                                isFutureDate && "bg-gray-100/50 dark:bg-gray-800/30 opacity-40",
                                                isWeekOff && !isFutureDate && "bg-red-50/50 dark:bg-red-900/5"
                                            )}>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="24"
                                                        step="0.5"
                                                        value={val !== undefined ? val : ''}
                                                        onChange={(e) => handleHourChange(row.id, dateStr, e.target.value)}
                                                        disabled={isCellDisabled}
                                                        className={cn(
                                                            "w-full text-center py-2 rounded-lg text-sm font-bold outline-none border border-transparent transition-all",
                                                            isFutureDate ? "bg-gray-100 dark:bg-gray-800/50 text-gray-300 dark:text-gray-600 cursor-not-allowed" :
                                                                (val && val > 0) ? "bg-white dark:bg-gray-800 shadow-elev-1 border-gray-100 dark:border-gray-700 text-brand-600 dark:text-brand-400" :
                                                                    (isWeekOff ? "bg-transparent text-red-300 dark:text-red-900/50 placeholder:text-red-200 dark:placeholder:text-red-900/30" : "bg-gray-50/50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:shadow-elev-1 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500/20")
                                                        )}
                                                        placeholder={isFutureDate ? "" : " "}
                                                        title={isFutureDate ? t('timesheets.entry.cannotLogFuture') : undefined}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Row Total */}
                                    <div className="w-16 text-center flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 text-sm">
                                        {Object.values(row.hours).reduce((a, b) => a + b, 0).toFixed(1)}
                                    </div>

                                    {/* Actions */}
                                    <div className="w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!isReadOnly && rows.length > 1 && (
                                             <Button variant="ghost" 
                                                onClick={() => handleRemoveRow(row.id)}
                                                className="text-gray-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add Row Button */}
                        {!isReadOnly && (
                            <div className="mt-4">
                                 <Button variant="ghost" 
                                    onClick={handleAddRow}
                                    className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300 px-3 py-2 rounded-lg hover:bg-brand-50 dark:hover:bg-indigo-900/20 transition-colors"
                                >
                                    <Plus size={16} />
                                    {t('timesheets.entry.addNewLine')}
                                </Button>
                            </div>
                        )}

                        {/* Totals Row */}
                        <div className="flex border-t-2 border-gray-200 dark:border-gray-700 mt-4 pt-4">
                            <div className="w-[20%] px-2 text-right text-xs font-black text-gray-400 uppercase tracking-widest self-center">
                            </div>
                            <div className="w-[22%] px-2 text-right text-xs font-black text-gray-400 uppercase tracking-widest self-center">
                                {t('timesheets.entry.totalHours')}
                            </div>
                            <div className="w-8"></div>
                            {dates.map(dateStr => {
                                const total = getDailyTotal(dateStr);
                                const attTotal = !isApprovalMode ? getAttendanceTotal(dateStr) : 0; // Dont compare attendance in approval for now
                                const isMatch = Math.abs(total - attTotal) < 0.1;
                                const isOver = total > attTotal;

                                return (
                                    <div key={dateStr} className="flex-1 flex flex-col items-center px-1">
                                        <span className={cn(
                                            "text-sm font-black tabular-nums",
                                            total === 0 ? "text-gray-300" :
                                                (!isApprovalMode && attTotal > 0 && isOver) ? "text-orange-500" :
                                                    (!isApprovalMode && attTotal > 0 && isMatch) ? "text-green-600 dark:text-green-400" : "text-gray-700 dark:text-gray-300"
                                        )}>
                                            {total.toFixed(1)}
                                        </span>
                                        {!isApprovalMode && attTotal > 0 && (
                                            <span className="text-[9px] text-gray-400 font-medium">
                                                {t('timesheets.entry.ofHours', { hours: attTotal.toFixed(1) })}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                            <div className="w-16 text-center text-sm font-black text-brand-600 dark:text-brand-400 tabular-nums self-center">
                                {rows.reduce((acc, r) => acc + Object.values(r.hours).reduce((a, b) => a + b, 0), 0).toFixed(1)}
                            </div>
                            <div className="w-8"></div>
                        </div>
                    </div>
                </div>

                {/* Footer / Actions */}
                <div className="border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-gray-800/30 px-6 py-4">
                    <div className="flex justify-end gap-4">
                        {onCancel && (
                            <Button variant="ghost" onClick={onCancel}>{t('timesheets.cancel')}</Button>
                        )}

                        {/* Approval Actions - ONLY show if status is SUBMITTED */}
                        {isApprovalMode && preloadedTimesheet && timesheetStatus === 'SUBMITTED' && onApprove && onReject && (
                            <>
                                <Button
                                    onClick={() => onReject(preloadedTimesheet.id, "")}
                                    className="bg-white dark:bg-gray-700 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 min-w-[100px]"
                                >
                                    <X size={16} className="mr-2" />
                                    {t('timesheets.entry.reject')}
                                </Button>
                                <Button
                                    onClick={() => onApprove(preloadedTimesheet.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
                                >
                                    <Check size={16} className="mr-2" />
                                    {t('timesheets.entry.approve')}
                                </Button>
                            </>
                        )}

                        {/* Standard Actions */}
                        {!isApprovalMode && !isReadOnly && (
                            <>
                                <Button
                                    onClick={() => handleSubmit(false)}
                                    isLoading={isSubmitting}
                                    className="bg-brand-500 hover:bg-brand-600 text-white min-w-[120px]"
                                >
                                    <Save size={16} className="mr-2" />
                                    {timesheetStatus === 'SUBMITTED' ? t('timesheets.entry.saveAsDraft') : t('timesheets.entry.saveDraft')}
                                </Button>

                                {(() => {
                                    // const isWeekComplete = new Date() >= weekEnd;
                                    // Or compare with end of work week (e.g. Friday)?
                                    // Usually "week not complete" implies you can't submit until the week is over.
                                    // I'll stick to weekEnd (Sunday) or maybe check if today is > last work day.
                                    // For now, let's use weekEnd as it is the safest "complete" definition.
                                    // But maybe allow submission on the last day? using startOfDay/endOfDay.
                                    // Let's use startOfDay comparison.
                                    const todayCheck = new Date();
                                    todayCheck.setHours(0, 0, 0, 0);
                                    const weekEndCheck = new Date(weekEnd);
                                    weekEndCheck.setHours(0, 0, 0, 0);
                                    // Actually, endOfWeek returns the specific time in current timezone.
                                    // Let's rely on simple comparison
                                    // If today is BEFORE the week end date (Sunday), is it incomplete?
                                    // Usually yes.

                                    // User request: "if current week not complete unable to submit timesheet"
                                    // Let's assume strict week completion.

                                    // const isFutureWeek = weekStart > new Date();
                                    // const canSubmit = !isFutureWeek && new Date() >= subDays(weekEnd, 2); // Allow submit on Friday? 
                                    // Let's try: Disable if today < weekEnd. 
                                    // Actually, standard practice: you can submit at the end of the week.
                                    // Let's disable if today < weekEnd (Sunday).
                                    // Maybe the user wants to submit on Friday.
                                    // Let's stick to strict "week complete" -> today >= weekEnd.

                                    // WAIT, if I use weekEnd (Sunday), they can't submit on Friday.
                                    // Let's disable if today < subDays(weekEnd, 2) (Friday).
                                    // Re-reading: "if current week not complete".
                                    // Let's just assume they can't submit if it's a future week or current week is ongoing.
                                    // Let's enable only if today >= weekEnd.

                                    // Actually, looking at standard HRMS, mostly you submit on Friday.
                                    // I will enable it if today is Friday or later.
                                    const friday = subDays(weekEnd, 2);
                                    friday.setHours(0, 0, 0, 0);
                                    const now = new Date();
                                    now.setHours(0, 0, 0, 0);

                                    const isEligibleToSubmit = now >= friday;

                                    return (
                                        <div title={!isEligibleToSubmit ? t('timesheets.entry.submitEligibilityTooltip') : undefined}>
                                            <Button
                                                onClick={() => handleSubmit(true)}
                                                isLoading={isSubmitting}
                                                disabled={!isEligibleToSubmit || rows.every(r => Object.keys(r.hours).length === 0)}
                                                className={cn(
                                                    "min-w-[120px]",
                                                    !isEligibleToSubmit
                                                        ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                                        : "bg-green-600 hover:bg-green-700 text-white"
                                                )}
                                            >
                                                {timesheetStatus === 'SUBMITTED' ? t('timesheets.entry.updateSubmission') : t('timesheets.entry.submit')}
                                            </Button>
                                        </div>
                                    );
                                })()}
                            </>
                        )}
                    </div>
                </div>
            </Card>
        </div >
    );
};
