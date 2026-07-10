import React from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, User, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { StatusBadge } from '@/components/projects/StatusBadge';
import { Button } from '@/components/ui/Button';
import { TaskComments } from '@/components/projects/TaskComments';
import type { Task } from '@/types/project.types';

interface TaskDetailsModalProps {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit?: (task: Task) => void;
    canEdit?: boolean;
    projectId?: string;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
    task,
    isOpen,
    onClose,
    onEdit,
    canEdit,
    projectId
}) => {
    if (!task) return null;

    const resolvedProjectId = projectId || task.project_id;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden relative">
                {/* Floating Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors shadow-sm"
                    aria-label="Close"
                >
                    <X size={18} />
                </button>
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="space-y-1 pr-8">
                        <div className="flex items-center gap-2 text-sm text-gray-500 font-mono mb-2">
                            <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                Task-{task.id.slice(0, 4)}
                            </span>
                            {task.project && (
                                <>
                                    <span>•</span>
                                    <span>{task.project.name}</span>
                                </>
                            )}
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            {task.title}
                        </h2>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Status & Priority */}
                    <div className="flex flex-wrap gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
                            <StatusBadge type="task" status={(task.status || task.column_key || 'TODO') as any} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</label>
                            <StatusBadge type="priority" status={task.priority} />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</label>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                            {task.description || <span className="text-gray-400 italic">No description provided</span>}
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Assignees */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <User size={14} />
                                Assignees
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {task.assignees && task.assignees.length > 0 ? (
                                    task.assignees.map(assignee => (
                                        <div key={assignee.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 rounded-md border border-gray-100 dark:border-gray-700">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-[10px] text-white font-bold">
                                                {(assignee.first_name || '').charAt(0)}{(assignee.last_name || '').charAt(0)}
                                            </div>
                                            <div className="text-sm">
                                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                                    {assignee.first_name} {assignee.last_name}
                                                </div>
                                                {assignee.email && (
                                                    <div className="text-xs text-gray-500">{assignee.email}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : task.assignee ? (
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 rounded-md border border-gray-100 dark:border-gray-700">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-[10px] text-white font-bold">
                                            {(task.assignee.first_name || '').charAt(0)}{(task.assignee.last_name || '').charAt(0)}
                                        </div>
                                        <div className="text-sm">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                                {task.assignee.first_name} {task.assignee.last_name}
                                            </div>
                                            {task.assignee.email && (
                                                <div className="text-xs text-gray-500">{task.assignee.email}</div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    canEdit && onEdit ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-6 text-xs px-2 gap-1"
                                            onClick={() => {
                                                onEdit(task);
                                                onClose();
                                            }}
                                        >
                                            <User size={12} />
                                            Assign
                                        </Button>
                                    ) : (
                                        <span className="text-sm text-gray-400">Unassigned</span>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Assigned By */}
                        {task.assigned_by && (
                            <div className="space-y-2">
                                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <User size={14} />
                                    Assigned By
                                </label>
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 rounded-md border border-gray-100 dark:border-gray-700 w-fit">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-[10px] text-white font-bold">
                                        {(task.assigned_by.first_name || '').charAt(0)}{(task.assigned_by.last_name || '').charAt(0)}
                                    </div>
                                    <div className="text-sm">
                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                            {task.assigned_by.first_name} {task.assigned_by.last_name}
                                        </div>
                                        {task.assigned_by.email && (
                                            <div className="text-xs text-gray-500">{task.assigned_by.email}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Dates & Hours */}
                        <div className="space-y-4">
                            {task.due_date && (
                                <div className="space-y-1">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <Calendar size={14} />
                                        Due Date
                                    </label>
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {format(new Date(task.due_date), 'MMM d, yyyy')}
                                    </div>
                                </div>
                            )}

                            {task.estimated_hours && (
                                <div className="space-y-1">
                                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <Clock size={14} />
                                        Estimated Hours
                                    </label>
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {task.estimated_hours} hours
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-1 text-xs text-gray-400">
                        {task.created_at && (
                            <div>Created on {format(new Date(task.created_at), 'MMM d, yyyy h:mm a')}</div>
                        )}
                        {task.updated_at && (
                            <div>Last updated on {format(new Date(task.updated_at), 'MMM d, yyyy h:mm a')}</div>
                        )}
                    </div>

                    {/* Comments Section */}
                    {resolvedProjectId && (
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                            <TaskComments taskId={task.id} projectId={resolvedProjectId} />
                        </div>
                    )}
                </div>

                {/* Footer / Actions */}
                <div className="sticky bottom-0 z-10 p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>
                        Close
                    </Button>
                    {canEdit && onEdit && (
                        <Button onClick={() => {
                            onEdit(task);
                            onClose();
                        }}>
                            Edit Task
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

