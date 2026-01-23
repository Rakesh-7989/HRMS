import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Save } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';

import { projectsService } from '@/services/projects.service';
import { timesheetService } from '@/services/timesheet.service';
import { useAuth } from '@/contexts/AuthContext';

interface TimesheetEntryFormProps {
    onSuccess?: () => void;
}
export const TimesheetEntryForm: React.FC<TimesheetEntryFormProps> = ({ onSuccess }) => {
    const { user } = useAuth();
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
            assigned_to: user?.role === 'EMPLOYEE' ? user.employee_id : undefined
        }),
        enabled: !!projectId,
    });

    // Mutation
    const createMutation = useMutation({
        mutationFn: timesheetService.createTimesheet,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            // Reset form (except date maybe?)
            setHours('');
            setTaskId('');
            // Leave project selected for convenience
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
        <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Log Time</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="project">Project *</Label>
                        <select
                            id="project"
                            value={projectId}
                            onChange={(e) => {
                                setProjectId(e.target.value);
                                setTaskId(''); // Reset task when project changes
                            }}
                            className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            required
                        >
                            <option value="">Select Project</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="task">Task *</Label>
                        <select
                            id="task"
                            value={taskId}
                            onChange={(e) => setTaskId(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            required
                            disabled={!projectId}
                        >
                            <option value="">Select Task</option>
                            {tasks.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="date">Date *</Label>
                        <Input
                            id="date"
                            type="date"
                            value={workDate}
                            onChange={(e) => setWorkDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hours">Hours *</Label>
                        <Input
                            id="hours"
                            type="number"
                            min="0.5"
                            step="0.5"
                            max="24"
                            value={hours}
                            onChange={(e) => setHours(e.target.value)}
                            placeholder="e.g. 8"
                            required
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <Button type="submit" isLoading={isSubmitting}>
                        <Save size={18} className="mr-2" />
                        Submit
                    </Button>
                </div>
            </form>
        </Card>
    );
};
