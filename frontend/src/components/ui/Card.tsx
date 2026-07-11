import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
  premium?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  bordered?: boolean;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  hover = false, 
  glass = false, 
  premium = false,
  padding = 'md',
  bordered = true,
  variant = 'default',
} ) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };

  const variantClasses = {
    default: 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 shadow-elev-1 hover:shadow-elev-3',
    elevated: 'bg-white dark:bg-neutral-900 border-transparent shadow-elev-3 hover:shadow-elev-5',
    outlined: 'bg-transparent border-2 border-neutral-200 dark:border-neutral-600 hover:border-brand-300 dark:hover:border-brand-600',
    filled: 'bg-neutral-50 dark:bg-neutral-800/50 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800',
  };

  const cardContent = (
    <div
      className={cn(
        'rounded-2xl transition-all duration-300',
        bordered && 'border',
        paddingClasses[padding],
        variantClasses[variant],
        glass && 'bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md',
        hover && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );

  if (hover || premium) {
    return (
      <motion.div
        whileHover={{ y: premium ? -8 : -4, scale: premium ? 1.02 : 1 }}
        whileTap={{ scale: 0.98 }}
        transition={{
          duration: 0.3,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="relative"
      >
        {cardContent}
        {premium && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-brand-500/10 via-brand-500/10 to-teal-500/10 opacity-0 hover:opacity-100 transition-opacity duration-500 -z-10" />
        )}
      </motion.div>
    );
  }

  return cardContent;
};

// Card sub-components
export const CardHeader: React.FC<{ children: React.ReactNode; className?: string; action?: React.ReactNode }> = ({
  children,
  className,
  action,
}) => (
  <div className={cn('flex items-center justify-between mb-6', className)}>
    <div>{children}</div>
    {action && <div>{action}</div>}
  </div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string; subtitle?: string }> = ({
  children,
  className,
  subtitle,
}) => (
  <div className={className}>
    <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{children}</h3>
    {subtitle && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{subtitle}</p>}
  </div>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <div className={cn('', className)}>{children}</div>;

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn('flex items-center gap-3 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700', className)}>
    {children}
  </div>
);

// Stat Card variant
export const StatCard: React.FC<{
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: React.ReactNode;
  iconColor?: string;
  trend?: React.ReactNode;
}> = ({ title, value, change, changeType = 'neutral', icon, iconColor = 'brand', trend }) => (
  <Card variant="elevated" hover padding="lg">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">{title}</p>
        <p className="text-3xl font-bold text-neutral-900 dark:text-white">{value}</p>
        {change && (
          <p className={cn(
            'text-sm font-medium mt-2 flex items-center gap-1',
            changeType === 'increase' && 'text-success-600 dark:text-success-400',
            changeType === 'decrease' && 'text-error-600 dark:text-error-400',
            changeType === 'neutral' && 'text-neutral-500 dark:text-neutral-400'
          )}>
            {change}
          </p>
        )}
      </div>
      {icon && (
        <div className={cn(
          'p-3 rounded-xl',
          iconColor === 'brand' && 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400',
          iconColor === 'success' && 'bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400',
          iconColor === 'warning' && 'bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400',
          iconColor === 'error' && 'bg-error-100 dark:bg-error-900/30 text-error-600 dark:text-error-400',
          iconColor === 'teal' && 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
          iconColor === 'coral' && 'bg-coral-100 dark:bg-coral-900/30 text-coral-600 dark:text-coral-400',
        )}>
          {icon}
        </div>
      )}
    </div>
    {trend && <div className="mt-4">{trend}</div>}
  </Card>
);