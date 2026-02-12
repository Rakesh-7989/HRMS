import React from 'react';
import { cn } from '@/utils/cn';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    className?: string;
    options?: { value: string; label: string }[];
    placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, options, placeholder, ...props }, ref) => {
        return (
            <div className="relative group">
                <select
                    className={cn(
                        "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm appearance-none cursor-pointer",
                        className
                    )}
                    ref={ref}
                    {...props}
                >
                    {placeholder && <option value="">{placeholder}</option>}
                    {options ? (
                        options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))
                    ) : (
                        children
                    )}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                    <ChevronDown className="w-4 h-4" />
                </div>
            </div>
        );
    }
);

Select.displayName = 'Select';
