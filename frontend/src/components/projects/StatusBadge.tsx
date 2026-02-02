import React from 'react';
import { cn } from '@/utils/cn';
import type { ClientStatus, ProjectStatus, TaskStatus, TaskPriority, TimesheetStatus } from '@/types/project.types';

type BadgeType = 'client' | 'project' | 'task' | 'priority' | 'timesheet';

interface StatusBadgeProps {
    type: BadgeType;
    status: ClientStatus | ProjectStatus | TaskStatus | TaskPriority | TimesheetStatus;
    className?: string;
}

/**
 * Reusable status badge component for Projects module
 * Handles different status types with appropriate colors
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, status, className }) => {
    const getStatusStyles = (): string => {
        // Client status colors
        if (type === 'client') {
            switch (status as ClientStatus) {
                case 'ACTIVE':
                    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
                case 'INACTIVE':
                    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
                default:
                    return 'bg-gray-100 text-gray-600';
            }
        }

        // Project status colors
        if (type === 'project') {
            switch (status as ProjectStatus) {
                case 'PLANNING':
                    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
                case 'ACTIVE':
                    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
                case 'ON_HOLD':
                    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
                case 'COMPLETED':
                    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
                case 'ARCHIVED':
                    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
                default:
                    return 'bg-gray-100 text-gray-600';
            }
        }

        // Task status colors
        if (type === 'task') {
            switch (status as TaskStatus) {
                case 'TODO':
                    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
                case 'IN_PROGRESS':
                    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
                case 'REVIEW':
                    return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
                case 'DONE':
                    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
                default:
                    return 'bg-gray-100 text-gray-600';
            }
        }

        // Priority colors
        if (type === 'priority') {
            switch (status as TaskPriority) {
                case 'LOW':
                    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
                case 'MEDIUM':
                    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
                case 'HIGH':
                    return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
                case 'URGENT':
                    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
                default:
                    return 'bg-gray-100 text-gray-600';
            }
        }

        // Timesheet status colors
        if (type === 'timesheet') {
            switch (status as TimesheetStatus) {
                case 'DRAFT':
                    return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
                case 'SUBMITTED':
                    return 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
                case 'APPROVED':
                    return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30';
                case 'REJECTED':
                    return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-900/30';
                default:
                    return 'bg-gray-100 text-gray-600';
            }
        }

        return 'bg-gray-100 text-gray-600';
    };

    const formatStatus = (status: string): string => {
        return status.replace(/_/g, ' ');
    };

    return (
        <span
            className={cn(
                'inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border shadow-sm transition-all',
                getStatusStyles(),
                className
            )}
        >
            {formatStatus(status)}
        </span>
    );
};
