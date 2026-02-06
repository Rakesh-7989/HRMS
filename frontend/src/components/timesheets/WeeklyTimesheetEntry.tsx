import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, addDays, subDays, eachDayOfInterval, isSameDay } from 'date-fns';
import { Loader2, Trash2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Layers } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import { projectsService } from '@/services/projects.service';
import { timesheetService } from '@/services/timesheet.service';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';

// Interfaces
interface WeeklyTimesheetEntryProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

interface TimesheetRow {
    id: string;
    projectId: string;
    projectName?: string;
    taskId: string;
    hours: Record<string, number>;
    description: string;
}

export const WeeklyTimesheetEntry: React.FC<WeeklyTimesheetEntryProps> = ({ onSuccess, onCancel }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [rows, setRows] = useState<TimesheetRow[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedProjectToAdd, setSelectedProjectToAdd] = useState<string>('');

    // Get current week range
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const dates = weekDays.map(d => format(d, 'yyyy-MM-dd'));

    // Queries
    const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
        queryKey: ['projects', 'all'],
        queryFn: () => projectsService.getProjects(),
    });

    const assignedProjects = projects;

    // Fetch tasks filtering by assignee if employee (kept for potential future use)
    const { isLoading: isLoadingTasks } = useQuery({
        queryKey: ['tasks', 'my-tasks', user?.id],
        queryFn: () => projectsService.getTasks({
            assigned_to: user?.role === 'EMPLOYEE' ? user.employee_id : undefined,
            limit: 1000
        }),
    });

    // Initialize with one empty row if none - REMOVED, now user adds projects
    useEffect(() => {
        // No initial row, user adds projects via dropdown
    }, []);

    const handleAddProject = (projectId: string) => {
        if (!projectId) return;
        const project = assignedProjects.find((p: any) => p.id === projectId);
        if (!project) return;

        // Check availability
        if (rows.some(r => r.projectId === projectId)) {
            toast.error("Project already added to the list");
            return;
        }

        const newRow: TimesheetRow = {
            id: Math.random().toString(36).substr(2, 9),
            projectId: project.id,
            projectName: project.name, // Display name
            taskId: '', // No task selection at this level
            description: '',
            hours: dates.reduce((acc, date) => ({ ...acc, [date]: 0 }), {}),
        };
        setRows([...rows, newRow]);
        setSelectedProjectToAdd(''); // Reset dropdown
    };

    const handleRemoveRow = (id: string) => {
        setRows(rows.filter(r => r.id !== id));
    };

    // handleUpdateRow is no longer needed as project/task selection is removed from rows.

    const handleHourChange = (rowId: string, dateStr: string, value: string) => {
        const numValue = parseFloat(value);
        setRows(rows.map(r => {
            if (r.id === rowId) {
                return {
                    ...r,
                    hours: {
                        ...r.hours,
                        [dateStr]: isNaN(numValue) ? 0 : numValue
                    }
                };
            }
            return r;
        }));
    };

    // Calculate totals
    const getDayTotal = (dateStr: string) => {
        return rows.reduce((acc, row) => acc + (row.hours[dateStr] || 0), 0);
    };

    const getRowTotal = (row: TimesheetRow) => {
        return Object.values(row.hours).reduce((acc, h) => acc + h, 0);
    };

    const getWeekTotal = () => {
        return rows.reduce((acc, row) => acc + getRowTotal(row), 0);
    };

    const validate = () => {
        if (rows.length === 0) {
            toast.error("Please add at least one project");
            return false;
        }
        for (const row of rows) {
            if (!row.projectId) {
                toast.error("A project ID is missing for one or more rows."); // Should not happen with new flow
                return false;
            }
        }
        if (getWeekTotal() === 0) {
            toast.error("Please enter some hours");
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setIsSubmitting(true);

        try {
            // Flatten rows into entries
            const entries = [];
            for (const row of rows) {
                for (const [dateStr, hours] of Object.entries(row.hours)) {
                    if (hours > 0) {
                        entries.push({
                            project_id: row.projectId,
                            // taskId is no longer selected per row, so it's not included here
                            work_date: dateStr,
                            hours: hours,
                            notes: row.description // Description is not currently in the UI, but kept for data structure
                        });
                    }
                }
            }

            if (entries.length === 0) {
                toast.error("No hours to submit");
                setIsSubmitting(false);
                return;
            }

            // Check if all rows belong to the same project
            const uniqueProjects = new Set(rows.map(r => r.projectId).filter(Boolean));
            const commonProjectId = uniqueProjects.size === 1 ? Array.from(uniqueProjects)[0] : undefined;

            await timesheetService.createWeeklyTimesheet({
                project_id: commonProjectId, // Pass common project ID to header if all entries are for one project
                week_start_date: format(weekStart, 'yyyy-MM-dd'),
                week_end_date: format(weekEnd, 'yyyy-MM-dd'),
                entries
            });

            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            toast.success("Timesheet submitted successfully");
            if (onSuccess) onSuccess();
            // Reset form after successful submission
            setRows([]);
            setSelectedProjectToAdd('');
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to submit timesheet");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingProjects || isLoadingTasks) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4 h-[400px]">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-sm font-medium text-gray-400 animate-pulse">Loading assigned projects...</p>
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

            {/* Project Selector */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700/50">
                <div className="mb-6 flex gap-4 items-end">
                    <div className="flex-1 max-w-md">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Select Project to Log Time
                        </label>
                        <select
                            value={selectedProjectToAdd}
                            onChange={(e) => {
                                setSelectedProjectToAdd(e.target.value);
                                handleAddProject(e.target.value);
                            }}
                            className="w-full h-10 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                            disabled={isLoadingProjects}
                        >
                            <option value="">Select an assigned project...</option>
                            {assignedProjects.map((project: any) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="overflow-x-auto">
                <div className="min-w-[1000px] p-6">
                    {/* Grid Header */}
                    <div className="grid grid-cols-[250px_1fr_40px] gap-4 mb-2 px-4">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Project</div>
                        <div className="grid grid-cols-7 gap-2">
                            {weekDays.map(day => (
                                <div key={day.toString()} className="text-center">
                                    <div className="text-[10px] text-gray-400 font-bold uppercase">{format(day, 'EEE')}</div>
                                    <div className={cn("text-xs font-bold mt-1", isSameDay(day, new Date()) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300')}>
                                        {format(day, 'd')}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Total
                        </div>
                    </div>

                    <div className="space-y-3">
                        <AnimatePresence>
                            {rows.map((row) => (
                                <motion.div
                                    key={row.id}
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="grid grid-cols-[250px_1fr_40px] gap-4 items-start group"
                                >
                                    {/* Project Name Display */}
                                    <div className="flex items-center h-full">
                                        <div className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-semibold w-full">
                                            {row.projectName || 'Unknown Project'}
                                        </div>
                                    </div>

                                    {/* Hours Inputs */}
                                    <div className="grid grid-cols-7 gap-2">
                                        {dates.map(dateStr => {
                                            return (
                                                <div key={dateStr} className="h-full">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="24"
                                                        step="0.5"
                                                        value={row.hours[dateStr] === 0 ? '' : row.hours[dateStr]}
                                                        onChange={(e) => handleHourChange(row.id, dateStr, e.target.value)}
                                                        className="w-full h-full min-h-[4rem] text-center text-sm font-bold bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-transparent hover:bg-gray-50 dark:hover:bg-gray-800"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Row Actions/Total */}
                                    <div className="flex flex-col items-center justify-between h-full py-1">
                                        <span className="text-sm font-black text-gray-700 dark:text-gray-200">{getRowTotal(row)}</span>
                                        <button
                                            onClick={() => handleRemoveRow(row.id)}
                                            className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {rows.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                <Layers className="w-8 h-8 mb-2 opacity-50" />
                                <p className="text-sm">No projects added yet.</p>
                                <p className="text-xs">Select a project above to start logging time.</p>
                            </div>
                        )}
                    </div>

                    {/* Removed the old "Add Row" button */}

                    {/* Daily Totals Footer Row */}
                    <div className="grid grid-cols-[250px_1fr_40px] gap-4 mt-6 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                        <div className="text-right text-xs font-bold text-gray-400 uppercase tracking-wider self-center">
                            Daily Totals
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {dates.map(dateStr => {
                                const total = getDayTotal(dateStr);
                                return (
                                    <div key={dateStr} className="text-center">
                                        <div className={cn("text-sm font-black", total > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-300 dark:text-gray-700')}>
                                            {total > 0 ? total : '-'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div></div>
                    </div>
                </div>
            </div>

            {/* Footer / Totals */}
            <div className="p-6 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Hours</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white">{getWeekTotal()}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {onCancel && (
                        <Button variant="ghost" onClick={onCancel} className="text-gray-500">Cancel</Button>
                    )}
                    <Button
                        onClick={handleSubmit}
                        isLoading={isSubmitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 shadow-lg shadow-indigo-500/20"
                    >
                        Submit Timesheet
                    </Button>
                </div>
            </div>
        </Card>
    );
};
