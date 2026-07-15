import React, { useState, useEffect } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor, closestCorners, DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';

import { KanbanColumn } from '@/components/projects/KanbanColumn';
import { TaskCard } from '@/components/projects/TaskCard';

import { projectsService } from '@/services/projects.service';
import type { Task, TaskStatus } from '@/types/project.types';

// Default configuration
// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_BOARD_CONFIG = [
    { id: 'TODO' as TaskStatus, title: 'To Do', isVisible: true },
    { id: 'IN_PROGRESS' as TaskStatus, title: 'In Progress', isVisible: true },
    { id: 'REVIEW' as TaskStatus, title: 'Review', isVisible: true },
    { id: 'DONE' as TaskStatus, title: 'Done', isVisible: true },
];

export type BoardConfigItem = {
    id: TaskStatus;
    title: string;
    isVisible: boolean;
};

interface TaskBoardProps {
    tasks: Task[];
    projectId: string;
    config?: BoardConfigItem[];
    onTaskClick?: (task: Task) => void;
    onEditTask?: (task: Task) => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, projectId, config = DEFAULT_BOARD_CONFIG, onTaskClick, onEditTask }) => {
    const queryClient = useQueryClient();
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [localTasks, setLocalTasks] = useState<Task[]>([]);

    // Sync local tasks with props
    useEffect(() => {
        setLocalTasks(tasks);
    }, [tasks]);

    // Mutation
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
            projectsService.updateTaskStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
            alert('Failed to move task');
        },
    });

    // Dnd Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Dnd Handlers
    const onDragStart = (event: DragStartEvent) => {
        const dragData = event.active.data.current as { type: string; task: Task } | undefined;
        if (dragData?.type === 'Task') {
            setActiveTask(dragData.task);
        }
    };

    const onDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;
        const activeId = active.id as string;
        const overId = over.id as string;
        if (activeId === overId) return;
    };

    const onDragEnd = (event: DragEndEvent) => {
        setActiveTask(null);
        const { active, over } = event;

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeTask = localTasks.find((t) => t.id === activeId);
        if (!activeTask) return;

        let newColumnKey: string | undefined;

        // Check if dropped on a column (using config to find valid columns)
        const droppedColumn = config.find((col) => col.id === overId);

        if (droppedColumn) {
            newColumnKey = droppedColumn.id;
        } else {
            // Check if dropped on another task
            const overTask = localTasks.find((t) => t.id === overId);
            if (overTask) {
                newColumnKey = overTask.column_key || overTask.status;
            }
        }

        const currentColumnKey = activeTask.column_key || activeTask.status;
        if (newColumnKey && newColumnKey !== currentColumnKey) {
            // Optimistic Update - update both column_key and status
            const updatedTasks = localTasks.map((t) =>
                t.id === activeId ? { ...t, column_key: newColumnKey, status: newColumnKey as TaskStatus } : t
            );
            setLocalTasks(updatedTasks);

            // Call API
            updateStatusMutation.mutate({ id: activeId, status: newColumnKey as TaskStatus });
        }
    };

    // Filter visible columns
    const visibleColumns = config.filter(c => c.isVisible);

    return (
        <div className="flex flex-col h-full w-full min-w-0 border-b border-gray-200 dark:border-gray-800">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
            >
                {/* Scrollable Columns Container */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 w-full scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                    <div className="flex gap-4 h-full px-4 min-w-max">
                        {visibleColumns.map((col) => (
                            <KanbanColumn
                                key={col.id}
                                id={col.id}
                                title={col.title}
                                tasks={localTasks.filter((t) => (t.column_key || t.status) === col.id)}
                                onTaskClick={onTaskClick}
                                onEditTask={onEditTask}
                                className="flex-shrink-0 w-[300px]"
                            />
                        ))}
                    </div>
                </div>

                {createPortal(
                    <DragOverlay>
                        {activeTask && <TaskCard task={activeTask} />}
                    </DragOverlay>,
                    document.body
                )}
            </DndContext>
        </div>
    );
};

import { useMutation, useQueryClient } from '@tanstack/react-query';
