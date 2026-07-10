import React from 'react';
import { cn } from '@/utils/cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

const DefaultIcon: React.FC = () => (
  <svg
    className="w-16 h-16 text-gray-300 dark:text-gray-600"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={0.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
    />
  </svg>
);

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-8',
        className
      )}
    >
      <div className={cn(
        'mb-4 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center',
        compact ? 'w-12 h-12' : 'w-20 h-20'
      )}>
        <div className={cn(compact ? 'scale-75' : 'scale-100')}>
          {icon || <DefaultIcon />}
        </div>
      </div>
      <h3 className={cn(
        'font-semibold text-gray-900 dark:text-gray-100',
        compact ? 'text-sm' : 'text-lg'
      )}>
        {title}
      </h3>
      {description && (
        <p className={cn(
          'mt-1 text-gray-500 dark:text-gray-400 max-w-sm',
          compact ? 'text-xs' : 'text-sm'
        )}>
          {description}
        </p>
      )}
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
};
