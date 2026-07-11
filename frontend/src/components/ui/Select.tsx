import React from 'react';
import { cn } from '@/utils/cn';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
  options?: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  label?: string;
  helperText?: string;
  error?: boolean;
  required?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, options, placeholder, label, helperText, error, required, id, disabled, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
          >
            {label} {required && <span className="text-error-500">*</span>}
          </label>
        )}
        <div className="relative group">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            required={required}
            className={cn(
              'flex w-full rounded-xl border bg-white dark:bg-neutral-900 px-4 py-3 pr-10 text-sm text-neutral-900 dark:text-white',
              'transition-all duration-200 ease-out',
              'border-neutral-200 dark:border-neutral-700',
              'hover:border-neutral-300 dark:hover:border-neutral-600',
              'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-100 dark:disabled:bg-neutral-800',
              'appearance-none cursor-pointer',
              error && 'border-error-500 focus:ring-error-500/40 focus:border-error-500',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options ? (
              options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            ) : (
              children
            )}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && props['aria-describedby'] && (
          <p id={`${selectId}-error`} className="mt-1.5 text-sm text-error-500" role="alert">
            {props['aria-describedby']}
          </p>
        )}
        {helperText && !error && (
          <p id={`${selectId}-helper`} className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';