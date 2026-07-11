import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card } from '@/components/ui/Card';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: {
    value: string | number;
    direction: 'up' | 'down';
  };
  icon: LucideIcon;
  iconColor?: 'brand' | 'success' | 'warning' | 'error' | 'teal' | 'coral' | 'neutral';
  isLoading?: boolean;
  subtitle?: string;
  className?: string;
}

const useAnimatedCounter = (end: number, duration: number = 1000, isLoading: boolean = false) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isLoading) { setCount(0); return; }
    let startTime: number;
    let animationFrame: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, isLoading]);

  return count;
};

const iconColorMap: Record<string, { bg: string; orb: string; gradient: string }> = {
  brand: { bg: 'bg-brand-100 dark:bg-brand-500/15', orb: 'bg-brand-400', gradient: 'from-brand-500 to-brand-600' },
  success: { bg: 'bg-success-100 dark:bg-success-500/15', orb: 'bg-success-400', gradient: 'from-success-500 to-success-600' },
  warning: { bg: 'bg-warning-100 dark:bg-warning-500/15', orb: 'bg-warning-400', gradient: 'from-warning-500 to-warning-600' },
  error: { bg: 'bg-error-100 dark:bg-error-500/15', orb: 'bg-error-400', gradient: 'from-error-500 to-error-600' },
  teal: { bg: 'bg-teal-100 dark:bg-teal-500/15', orb: 'bg-teal-400', gradient: 'from-teal-500 to-teal-600' },
  coral: { bg: 'bg-coral-100 dark:bg-coral-500/15', orb: 'bg-coral-400', gradient: 'from-coral-500 to-coral-600' },
  neutral: { bg: 'bg-neutral-100 dark:bg-neutral-500/15', orb: 'bg-neutral-400', gradient: 'from-neutral-500 to-neutral-600' },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  trend,
  icon: Icon,
  iconColor = 'brand',
  isLoading,
  subtitle,
  className,
}) => {
  const colors = iconColorMap[iconColor] || iconColorMap.brand;
  const trendValue = trend ? trend.value : change;
  const isUp = trend ? trend.direction === 'up' : (change || 0) >= 0;

  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  const isNumeric = !isNaN(numericValue) && typeof value === 'number';
  const animatedValue = useAnimatedCounter(isNumeric ? numericValue : 0, 1200, isLoading);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={cn("relative", className)}
    >
      <Card variant="default" padding="sm" bordered className="h-full group overflow-hidden">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-neutral-200 dark:bg-neutral-700" />
              <div className="w-14 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-24" />
              <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-28" />
            </div>
          </div>
        ) : (
          <>
            {/* Decorative gradient orb */}
            <motion.div
              className={cn(
                "absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl",
                "opacity-20 group-hover:opacity-30 transition-all duration-500",
                colors.orb
              )}
              animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.25, 0.2] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex items-start justify-between mb-3">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'p-3 rounded-xl transition-all duration-300 shadow-elev-1',
                    colors.bg
                  )}
                >
                  <Icon size={22} className={cn(
                    iconColor === 'brand' && 'text-brand-600 dark:text-brand-400',
                    iconColor === 'success' && 'text-success-600 dark:text-success-400',
                    iconColor === 'warning' && 'text-warning-600 dark:text-warning-400',
                    iconColor === 'error' && 'text-error-600 dark:text-error-400',
                    iconColor === 'teal' && 'text-teal-600 dark:text-teal-400',
                    iconColor === 'coral' && 'text-coral-600 dark:text-coral-400',
                    iconColor === 'neutral' && 'text-neutral-600 dark:text-neutral-400',
                  )} strokeWidth={2} />
                </motion.div>

                {(change !== undefined || trend) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                    className={cn(
                      'flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full ring-1 ring-inset',
                      isUp
                        ? 'text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-500/15 ring-success-500/20'
                        : 'text-error-500 dark:text-error-400 bg-error-50 dark:bg-error-500/15 ring-error-500/20'
                    )}
                  >
                    {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {typeof trendValue === 'number' ? `${Math.abs(trendValue)}%` : trendValue}
                  </motion.div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-neutral-500 dark:text-neutral-400 text-xs font-medium uppercase tracking-wider">
                  {title}
                </p>
                <motion.p
                  key={value}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight"
                >
                  {isNumeric ? animatedValue.toLocaleString() : value}
                </motion.p>

                {subtitle && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-xs text-neutral-400 dark:text-neutral-500 mt-1"
                  >
                    {subtitle}
                  </motion.p>
                )}
              </div>
            </div>

            {/* Bottom gradient line */}
            <div className={cn(
              "absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r",
              colors.gradient
            )} />
          </>
        )}
      </Card>
    </motion.div>
  );
};
