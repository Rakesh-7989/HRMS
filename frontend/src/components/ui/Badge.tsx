import React from 'react';
import { cn } from '@/utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'error' | 'info' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  ...props
}) => {
  const variantClasses = {
    default: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 border-brand-200 dark:border-brand-800',
    secondary: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700',
    success: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300 border-success-200 dark:border-success-800',
    warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300 border-warning-200 dark:border-warning-800',
    error: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300 border-error-200 dark:border-error-800',
    destructive: 'bg-error-500 text-white dark:bg-error-600 border-error-600 dark:border-error-500',
    info: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 border-brand-200 dark:border-brand-800',
    outline: 'bg-transparent text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600',
    ghost: 'bg-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 border-transparent',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full border transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            variant === 'default' && 'bg-brand-500',
            variant === 'success' && 'bg-success-500',
            variant === 'warning' && 'bg-warning-500',
            variant === 'error' && 'bg-error-500',
            variant === 'info' && 'bg-brand-500',
            variant === 'outline' && 'bg-neutral-500',
            variant === 'ghost' && 'bg-neutral-400'
          )}
        />
      )}
      {children}
    </span>
  );
};