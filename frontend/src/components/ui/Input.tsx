import React from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  className?: string;
  error?: boolean;
  label?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Input: React.FC<InputProps> = ({
  className,
  type,
  error,
  label,
  helperText,
  leftIcon,
  rightIcon,
  id,
  disabled,
  required,
  inputSize = 'md',
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-5 py-3.5 text-base',
  };

  const paddingAdjustment = leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : '';

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
        >
          {label} {required && <span className="text-error-500">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          id={inputId}
          disabled={disabled}
          required={required}
          className={cn(
            'flex w-full rounded-xl border bg-white dark:bg-neutral-900',
            'transition-all duration-200 ease-out',
            'border-neutral-200 dark:border-neutral-700',
            'hover:border-neutral-300 dark:hover:border-neutral-600',
            'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-100 dark:disabled:bg-neutral-800',
            error && 'border-error-500 focus:ring-error-500/40 focus:border-error-500',
            (type === 'date' || type === 'time' || type === 'datetime-local') && '[color-scheme:light] dark:[color-scheme:dark]',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            sizeClasses[inputSize],
            paddingAdjustment,
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
            {rightIcon}
          </div>
        )}
      </div>
      {error && props['aria-describedby'] && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-error-500" role="alert">
          {props['aria-describedby']}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
          {helperText}
        </p>
      )}
    </div>
  );
};

// Textarea component
interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>, Pick<InputProps, 'label' | 'helperText' | 'error'> {
  inputSize?: 'sm' | 'md' | 'lg';
  rows?: number;
}

export const Textarea: React.FC<TextareaProps> = ({
  className,
  error,
  label,
  helperText,
  id,
  disabled,
  required,
  rows = 4,
  inputSize = 'md',
  ...props
}) => {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-5 py-3.5 text-base',
  };

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
        >
          {label} {required && <span className="text-error-500">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        disabled={disabled}
        required={required}
        rows={rows}
        className={cn(
          'flex w-full rounded-xl border bg-white dark:bg-neutral-900',
          'transition-all duration-200 ease-out',
          'border-neutral-200 dark:border-neutral-700',
          'hover:border-neutral-300 dark:hover:border-neutral-600',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-100 dark:disabled:bg-neutral-800',
          'resize-y min-h-[100px]',
          error && 'border-error-500 focus:ring-error-500/40 focus:border-error-500',
          sizeClasses[inputSize],
          className
        )}
        {...props}
      />
      {error && props['aria-describedby'] && (
        <p id={`${textareaId}-error`} className="mt-1.5 text-sm text-error-500" role="alert">
          {props['aria-describedby']}
        </p>
      )}
      {helperText && !error && (
        <p id={`${textareaId}-helper`} className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
          {helperText}
        </p>
      )}
    </div>
  );
};