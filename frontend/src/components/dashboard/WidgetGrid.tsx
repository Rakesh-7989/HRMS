import React from 'react';
import { cn } from '@/utils/cn';

interface WidgetGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

const columnMap: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

export const WidgetGrid: React.FC<WidgetGridProps> = ({
  children,
  columns = 2,
  className,
}) => (
  <div className={cn('grid gap-6', columnMap[columns], className)}>
    {children}
  </div>
);
