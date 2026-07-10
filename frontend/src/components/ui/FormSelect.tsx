import React from 'react';
import { cn } from '@/utils/cn';
import { Label } from '@/components/ui/Label';

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: string;
  error?: string;
  touched?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  name,
  error,
  touched,
  options,
  placeholder,
  className,
  required,
  ...selectProps
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={name} className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
      {label}
    </Label>
    <select
      id={name}
      name={name}
      className={cn(
        'form-select w-full',
        touched && error && 'border-red-500 focus-visible:ring-red-500',
        className
      )}
      aria-invalid={!!(touched && error)}
      aria-describedby={touched && error ? `${name}-error` : undefined}
      {...selectProps}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {touched && error && (
      <p id={`${name}-error`} className="text-xs text-red-500 mt-1" role="alert">
        {error}
      </p>
    )}
  </div>
);
