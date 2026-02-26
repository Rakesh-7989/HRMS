import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Save, Clock, Briefcase, ListTodo, Calendar, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';

import { projectsService } from '@/services/management/projects.service';
import { timesheetService } from '@/services/employee/timesheet.service';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/contexts/PermissionContext';
import { cn } from '@/utils/cn';

interface TimesheetEntryFormProps {
    onSuccess?: () => void;
}

export const TimesheetEntryForm: React.FC<TimesheetEntryFormProps> = ({ onSuccess }) => {
    const { user } = useAuth();
    const { hasPermission } = usePermission();
    const queryClient = useQueryClient();
    const [projectId, setProjectId] = useState('');
    const [taskId, setTaskId] = useState('');
    const [workDate, setWorkDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [hours, setHours] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Queries
    const { data: projects = [] } = useQuery({
        queryKey: ['projects', 'all'],
        queryFn: () => projectsService.getProjects(),
    });

    const { data: tasks = [] } = useQuery({
        queryKey: ['tasks', projectId, user?.role, user?.employee_id],
        queryFn: () => projectsService.getTasks({
            project_id: projectId,
            assigned_to: !hasPermission('tasks.manage') ? user?.employee_id : undefined
        }),
        enabled: !!projectId,
    });

    // Mutation
    const createMutation = useMutation({
        mutationFn: timesheetService.createTimesheet,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            setHours('');
            setTaskId('');
            if (onSuccess) onSuccess();
            alert('Timesheet submitted successfully');
            setIsSubmitting(false);
        },
        onError: () => {
            setIsSubmitting(false);
            alert('Failed to submit timesheet');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId || !taskId || !workDate || !hours) {
            alert('Please fill in all fields');
            return;
        }

        setIsSubmitting(true);
        createMutation.mutate({
            project_id: projectId,
            task_id: taskId,
            work_date: workDate,
            hours: Number(hours),
        });
    };

    return (
        <Card className="p-0 border-none shadow-sm ring-1 ring-black/5 overflow-hidden bg-white dark:bg-gray-800/50">
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                    <Clock size={24} className="stroke-[2.5px]" />
                </div>
                <div>
                    <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white uppercase leading-none">Log Work Hours</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em] mt-2">Activity Transmission Portal</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-gray-50/30 dark:bg-gray-950/20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="project" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Project Assignment</Label>
                        <div className="relative group/input">
                            <select
                                id="project"
                                value={projectId}
                                onChange={(e) => {
                                    setProjectId(e.target.value);
                                    setTaskId('');
                                }}
                                className="w-full h-11 pl-10 pr-4 text-sm font-semibold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer shadow-sm text-gray-700 dark:text-gray-200"
                                required
                            >
                                <option value="">Select Project</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-primary transition-colors">
                                <Briefcase size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="task" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Specific Task</Label>
                        <div className="relative group/input">
                            <select
                                id="task"
                                value={taskId}
                                onChange={(e) => setTaskId(e.target.value)}
                                className={cn(
                                    "w-full h-11 pl-10 pr-4 text-sm font-semibold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer shadow-sm text-gray-700 dark:text-gray-200",
                                    !projectId && "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900/50"
                                )}
                                required
                                disabled={!projectId}
                            >
                                <option value="">Select Task</option>
                                {tasks.map((t) => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-primary transition-colors">
                                <ListTodo size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="date" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Work Timeline</Label>
                        <div className="relative group/input text-gray-700 dark:text-gray-200">
                            {/* Overriding standard input style for date */}
                            <Input
                                id="date"
                                type="date"
                                value={workDate}
                                onChange={(e) => setWorkDate(e.target.value)}
                                className="h-11 pl-10 pr-4 font-bold bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
                                required
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-primary transition-colors pointer-events-none">
                                <Calendar size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hours" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Total Duration</Label>
                        <div className="relative group/input text-gray-700 dark:text-gray-200">
                            <Input
                                id="hours"
                                type="number"
                                min="0.5"
                                step="0.5"
                                max="24"
                                value={hours}
                                onChange={(e) => setHours(e.target.value)}
                                placeholder="e.g. 8.0"
                                className="h-11 pl-10 pr-12 font-black bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
                                required
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-primary transition-colors pointer-events-none">
                                <Clock size={16} />
                            </div>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-400 uppercase">Hrs</div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                    <Button
                        type="submit"
                        isLoading={isSubmitting}
                        className="h-11 px-10 bg-slate-900 dark:bg-primary hover:bg-slate-800 dark:hover:bg-primary/90 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center gap-3"
                    >
                        {isSubmitting ? (
                            <Loader2 className="animate-spin" size={16} />
                        ) : (
                            <Save size={16} className="stroke-[3px]" />
                        )}
                        Transmit Data
                    </Button>
                </div>
            </form>
        </Card>
    );
};
