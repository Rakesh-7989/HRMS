import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'premium' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  requiresActivePlan?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  isLoading,
  disabled,
  requiresActivePlan,
  fullWidth = false,
  ...props
}) => {
  const { hasActivePlan } = useAuth();
  const isSubscriptionDisabled = requiresActivePlan && !hasActivePlan;
  const effectivelyDisabled = disabled || isLoading || isSubscriptionDisabled;

  const baseClasses =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-brand-500 text-white shadow-elev-4 hover:bg-brand-600 hover:shadow-elev-5 active:bg-brand-700 border border-brand-400/20';
      case 'secondary':
        return 'bg-brand-600 text-white shadow-elev-4 hover:bg-brand-700 hover:shadow-elev-5 active:bg-brand-800 border border-brand-500/20';
      case 'premium':
        return 'bg-gradient-to-r from-brand-600 via-brand-600 to-teal-500 text-white shadow-elev-6 hover:shadow-brand-hover active:shadow-brand border border-white/10 backdrop-blur-sm';
      case 'outline':
        return 'border-2 border-brand-300 dark:border-brand-600 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all duration-200 hover:border-brand-500 hover:shadow-elev-3';
      case 'ghost':
        return 'text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all duration-200';
      case 'destructive':
        return 'bg-error-500 text-white shadow-elev-4 hover:bg-error-600 hover:shadow-elev-5 active:bg-error-700 border border-error-400/20';
      case 'success':
        return 'bg-success-500 text-white shadow-elev-4 hover:bg-success-600 hover:shadow-elev-5 active:bg-success-700 border border-success-400/20';
      case 'warning':
        return 'bg-warning-500 text-white shadow-elev-4 hover:bg-warning-600 hover:shadow-elev-5 active:bg-warning-700 border border-warning-400/20';
      default:
        return 'bg-brand-500 text-white shadow-elev-4 hover:bg-brand-600 hover:shadow-elev-5 active:bg-brand-700 border border-brand-400/20';
    }
  };

  const sizeClasses = {
    sm: 'px-4 py-2.5 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-3.5 text-lg',
    xl: 'px-10 py-4 text-xl',
  };

  return (
    <motion.button
      className={cn(
        baseClasses,
        getVariantClasses(),
        sizeClasses[size],
        fullWidth && 'w-full',
        isSubscriptionDisabled && 'grayscale-[0.5] opacity-60 cursor-not-allowed',
        className
      )}
      whileHover={effectivelyDisabled ? {} : { scale: 1.02, y: -2 }}
      whileTap={effectivelyDisabled ? {} : { scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      disabled={effectivelyDisabled}
      title={isSubscriptionDisabled ? 'This action requires an active subscription plan.' : props.title}
      {...(props as any)}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <motion.span
            className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          Loading...
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
};