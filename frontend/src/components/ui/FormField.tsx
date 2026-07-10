import React from 'react';
import { cn } from '@/utils/cn';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';

interface FormFieldProps {
  label: string;
  name: string;
  error?: string;
  touched?: boolean;
  children?: React.ReactNode;
  className?: string;
  required?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  error,
  touched,
  children,
  className,
  required,
}) => (
  <div className={cn('space-y-1.5', className)}>
    <Label htmlFor={name} className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
      {label}
    </Label>
    {children}
    {touched && error && (
      <p className="text-xs text-red-500 mt-1">{error}</p>
    )}
  </div>
);

export const FormInput: React.FC<Omit<FormFieldProps, 'children'> & React.InputHTMLAttributes<HTMLInputElement>> = ({
  label,
  name,
  error,
  touched,
  className,
  required,
  ...inputProps
}) => (
  <FormField label={label} name={name} error={error} touched={touched} className={className} required={required}>
    <Input
      id={name}
      name={name}
      className={cn(
        touched && error && 'border-red-500 focus-visible:ring-red-500'
      )}
      aria-invalid={!!(touched && error)}
      aria-describedby={touched && error ? `${name}-error` : undefined}
      {...inputProps}
    />
    {touched && error && (
      <p id={`${name}-error`} className="text-xs text-red-500 mt-1" role="alert">
        {error}
      </p>
    )}
  </FormField>
);

export const FormTextarea: React.FC<Omit<FormFieldProps, 'children'> & React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  label,
  name,
  error,
  touched,
  className,
  required,
  ...textareaProps
}) => (
  <FormField label={label} name={name} error={error} touched={touched} className={className} required={required}>
    <textarea
      id={name}
      name={name}
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm ring-offset-white dark:ring-offset-gray-900 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        touched && error && 'border-red-500 focus-visible:ring-red-500'
      )}
      aria-invalid={!!(touched && error)}
      aria-describedby={touched && error ? `${name}-error` : undefined}
      {...textareaProps}
    />
    {touched && error && (
      <p id={`${name}-error`} className="text-xs text-red-500 mt-1" role="alert">
        {error}
      </p>
    )}
  </FormField>
);
