import React from 'react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';
import { GripVertical, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
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
  emptyTitle,
  emptyDescription,
  emptyAction,
  error,
  onRetry,
  className,
  headerAction,
  collapsible = false,
  defaultCollapsed = false,
}) => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('group', className)}
    >
      <Card variant="elevated">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {collapsible && (
               <Button variant="ghost" 
                onClick={() => setCollapsed(c => !c)}
                className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                aria-label={collapsed ? 'Expand' : 'Collapse'}
              >
                {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </Button>
            )}
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            {error && onRetry && (
               <Button variant="ghost" 
                onClick={onRetry}
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-brand-500 transition-colors"
                aria-label="Retry"
              >
                <RefreshCw size={14} />
              </Button>
            )}
          </div>
        </div>

        {collapsed ? null : isLoading ? (
          <div className="space-y-3">
            <Skeleton variant="rectangular" width="100%" height={200} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-error-500 mb-3">{error}</p>
            {onRetry && (
               <Button variant="ghost" 
                onClick={onRetry}
                className="text-sm text-brand-600 dark:text-brand-400 hover:underline underline-offset-2 font-medium"
              >
                Try again
              </Button>
            )}
          </div>
        ) : isEmpty ? (
          <EmptyState
            title={emptyTitle || t('common.noData')}
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
      className="absolute -left-2 top-1/2 -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
    >
      <GripVertical size={16} />
    </div>
    <Widget {...props} />
  </div>
);
