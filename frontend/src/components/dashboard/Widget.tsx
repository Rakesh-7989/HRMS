import React from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';
import { GripVertical, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface WidgetProps {
  title: string;
  children: React.ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
  headerAction?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export const Widget: React.FC<WidgetProps> = ({
  title,
  children,
  isLoading,
  isEmpty,
  emptyTitle = 'No data',
  emptyDescription,
  emptyAction,
  error,
  onRetry,
  className,
  headerAction,
  collapsible = false,
  defaultCollapsed = false,
}) => {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('group', className)}
    >
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {collapsible && (
              <button
                onClick={() => setCollapsed(c => !c)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                aria-label={collapsed ? 'Expand' : 'Collapse'}
              >
                {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            {error && onRetry && (
              <button
                onClick={onRetry}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary transition-colors"
                aria-label="Retry"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>

        {collapsed ? null : isLoading ? (
          <div className="space-y-3">
            <Skeleton variant="rectangular" width="100%" height={200} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-sm text-primary hover:text-primary-hover underline underline-offset-2"
              >
                Try again
              </button>
            )}
          </div>
        ) : isEmpty ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
            compact
          />
        ) : (
          children
        )}
      </Card>
    </motion.div>
  );
};

export const DraggableWidget: React.FC<WidgetProps & { dragHandleProps?: Record<string, unknown> }> = ({
  dragHandleProps,
  ...props
}) => (
  <div className="relative">
    <div
      {...dragHandleProps}
      className="absolute -left-2 top-1/2 -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
    >
      <GripVertical size={16} />
    </div>
    <Widget {...props} />
  </div>
);
