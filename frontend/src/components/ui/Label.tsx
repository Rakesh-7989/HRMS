import React from 'react';
import { cn } from '@/utils/cn';

interface LabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string;
  htmlFor?: string;
}

export const Label: React.FC<LabelProps> = ({ className, ...props }) => {
  return (
    <span
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    />
  );
};