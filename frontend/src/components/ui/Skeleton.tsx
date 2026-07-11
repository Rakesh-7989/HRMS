import React from 'react';
import { cn } from '@/utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  ...props
}) => {
  const baseClasses = 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 bg-[length:1000px_100%] rounded';

  const variantClasses = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-xl',
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={{ width, height }}
      aria-hidden="true"
      {...props}
    />
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl space-y-4', className)}>
    <Skeleton variant="circular" width={48} height={48} />
    <Skeleton variant="text" width="60%" />
    <Skeleton variant="text" width="80%" />
    <Skeleton variant="text" width="40%" />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
  rows = 5,
  columns = 4,
  className,
}) => (
  <div className={cn('space-y-3', className)}>
    <div className="flex gap-4 pb-2">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={`header-${i}`} variant="text" width={`${100 / columns}%`} height={16} />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div key={`row-${rowIdx}`} className="flex gap-4 py-2 border-b border-gray-100 dark:border-gray-800">
        {Array.from({ length: columns }).map((_, colIdx) => (
          <Skeleton
            key={`cell-${rowIdx}-${colIdx}`}
            variant="text"
            width={`${100 / columns}%`}
            height={14}
          />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonChart: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('relative overflow-hidden rounded-xl', className)}>
    <Skeleton variant="rectangular" width="100%" height={300} />
    <div className="absolute inset-0 flex items-end justify-around p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton
          key={`bar-${i}`}
          variant="rectangular"
          width={24}
          height={40 + Math.random() * 160}
        />
      ))}
    </div>
  </div>
);
