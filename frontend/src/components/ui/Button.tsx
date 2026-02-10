import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  requiresActivePlan?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  isLoading,
  disabled,
  requiresActivePlan,
  ...props
}) => {
  const { hasActivePlan } = useAuth();
  const isSubscriptionDisabled = requiresActivePlan && !hasActivePlan;
  const effectivelyDisabled = disabled || isLoading || isSubscriptionDisabled;

  const baseClasses =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary:
      'bg-primary-gradient text-white shadow-lg hover:shadow-premium transition-smooth hover:scale-[1.02] active:scale-[0.98]',
    outline:
      'border-2 border-[#9c9e9f] text-[#9c9e9f] hover:bg-[#9c9e9f] hover:text-white transition-smooth hover:scale-[1.02] active:scale-[0.98] dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white',
    ghost:
      'text-[#9c9e9f] dark:text-gray-300 hover:text-[#3f4850] dark:hover:text-white hover:bg-[#E3E8F0] dark:hover:bg-white/10 transition-elegant',
    destructive:
      'bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-premium transition-smooth hover:scale-[1.02] active:scale-[0.98]',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3 text-lg',
  };

  return (
    <motion.button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        isSubscriptionDisabled && 'grayscale-[0.5] opacity-60 cursor-not-allowed',
        className
      )}
      whileHover={effectivelyDisabled ? {} : { scale: 1.02, y: -1 }}
      whileTap={effectivelyDisabled ? {} : { scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      disabled={effectivelyDisabled}
      title={isSubscriptionDisabled ? 'This action requires an active subscription plan.' : props.title}
      {...(props as any)}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></span>
          Loading...
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
};

