import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/utils/cn';
import { TaskCard } from './TaskCard';
import type { Task, TaskStatus } from '@/types/project.types';

interface KanbanColumnProps {
    id: TaskStatus;
    title: string;
    tasks: Task[];
    onTaskClick?: (task: Task) => void;
    onEditTask?: (task: Task) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps & { className?: string }> = ({ id, title, tasks, className, onTaskClick, onEditTask }) => {
    const { setNodeRef: setDroppableNodeRef } = useDroppable({
        id: id,
    }) as { setNodeRef: (element: HTMLDivElement | null) => void };

    const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

    const getStatusColor = (status: TaskStatus) => {
        switch (status) {
            case 'TODO': return 'bg-neutral-500';
            case 'IN_PROGRESS': return 'bg-brand-500';
            case 'REVIEW': return 'bg-brand-500';
            case 'DONE': return 'bg-green-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className={cn(
            "flex flex-col h-full bg-gray-50 dark:bg-gray-900/50 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800",
            className // Allow overriding width
        )}>
            <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", getStatusColor(id))} />
                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                        {title}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-400">
                        {tasks.length}
                    </span>
                </div>
            </div>

            <div ref={setDroppableNodeRef} className="flex-1 p-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-2 min-h-full">
                        {tasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onClick={() => onTaskClick?.(task)}
                                onEdit={() => onEditTask?.(task)}
                            />
                        ))}
                        {tasks.length === 0 && (
                            <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-400">
                                Drop items here
                            </div>
                        )}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
};
