import React from 'react';
import { Button } from '@/components/ui/Button';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/utils/cn';
import { StatusBadge } from './StatusBadge';
import type { Task } from '@/types/project.types';

import { useAuth } from '@/contexts/AuthContext';

interface TaskCardProps {
    task: Task;
    onClick?: () => void;
    onEdit?: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onEdit }) => {
    const { user } = useAuth();

    // Check if user has permission to move this task
    const canMove = React.useMemo(() => {
        if (!user) return false;
        // Admins and Managers can move everything
        if (['ADMIN', 'MANAGER'].includes(user.role)) return true;
        // HR and Employees can only move tasks assigned to them
        if (['HR', 'EMPLOYEE'].includes(user.role)) {
            const userEmployeeId = user.employee_id;

            // Allow if user is one of the assignees
            if (task.assignees && task.assignees.length > 0) {
                return task.assignees.some(a => a.id === userEmployeeId);
            }

            // Fallback for backward compatibility
            const taskAssigneeId = task.assignee_id || task.assignee?.id;
            if (!userEmployeeId || !taskAssigneeId) return false;
            return taskAssigneeId === userEmployeeId;
        }
        return false;
    }, [user, task.assignee_id, task.assignee, task.assignees]);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: 'Task',
            task,
        },
        disabled: !canMove, // Disable drag if permission denied
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className={cn(
                    "bg-white dark:bg-gray-800 p-4 rounded-lg shadow-elev-1 border-2 border-brand-500/20 opacity-50 h-[120px]",
                    "cursor-grabbing relative z-50"
                )}
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={cn(
                "bg-white dark:bg-gray-800 p-3 rounded-lg shadow-elev-1 border border-gray-200 dark:border-gray-700",
                "hover:shadow-elev-3 transition-shadow group flex flex-col gap-2",
                canMove ? "cursor-grab active:cursor-grabbing" : "cursor-default"
            )}
        >
            <div className="flex justify-between items-start gap-2">
                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                    {task.title}
                </h4>
            </div> 


            {task.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                    {task.description}
                </p>
            )}

            <div className="flex items-center justify-between mt-1">
                <StatusBadge type="priority" status={task.priority} className="scale-90 origin-left" />

                {task.assignees && task.assignees.length > 0 ? (
                    <div className="flex -space-x-1.5">
                        {task.assignees.slice(0, 3).map((assignee, idx) => (
                            <div
                                key={assignee.id}
                                className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-brand-500-dark flex items-center justify-center text-[10px] text-white font-bold border border-white dark:border-gray-800"
                                title={`${assignee.first_name} ${assignee.last_name}`}
                                style={{ zIndex: 3 - idx }}
                            >
                                {assignee.first_name.charAt(0)}{assignee.last_name?.charAt(0)}
                            </div>
                        ))}
                        {task.assignees.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[9px] font-medium border border-white dark:border-gray-800" style={{ zIndex: 0 }}>
                                +{task.assignees.length - 3}
                            </div>
                        )}
                    </div>
                ) : task.assignee ? (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-brand-500-dark flex items-center justify-center text-[10px] text-white font-bold" title={`${task.assignee.first_name} ${task.assignee.last_name}`}>
                        {task.assignee.first_name.charAt(0)}{task.assignee.last_name?.charAt(0)}
                    </div>
                ) : (
                    onEdit ? (
                         <Button variant="ghost" 
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                            className="flex items-center gap-1 text-[10px] font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
                        >
                            + Assign
                        </Button>
                    ) : null
                )}
            </div>

            {/* Optional: Show task ID or date if needed */}
            <div className="flex items-center text-xs text-gray-400 mt-1">
                <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    Task-{task.id.slice(0, 4)}
                </span>
            </div>
        </div>
    );
};
