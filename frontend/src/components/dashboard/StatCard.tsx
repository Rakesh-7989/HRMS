import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import './dashboard.css';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: {
    value: string | number;
    direction: 'up' | 'down';
  };
  icon: LucideIcon;
  iconColor?: string;
  isLoading?: boolean;
  subtitle?: string;
  className?: string;
}

// Animated counter hook for smooth number animation
const useAnimatedCounter = (end: number, duration: number = 1000, isLoading: boolean = false) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setCount(0);
      return;
    }

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, isLoading]);

  return count;
};

// Color utilities
const getColorConfig = (iconColor: string) => {
  if (iconColor.includes('blue')) {
    return {
      iconBg: 'bg-violet-50 dark:bg-violet-500/15',
      orbColor: 'bg-violet-400',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-blue-600',
    };
  }
  if (iconColor.includes('purple') || iconColor.includes('green')) {
    return {
      iconBg: 'bg-purple-50 dark:bg-purple-500/15',
      orbColor: 'bg-purple-400',
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-purple-600',
    };
  }
  if (iconColor.includes('purple') || iconColor.includes('violet')) {
    return {
      iconBg: 'bg-purple-50 dark:bg-purple-500/15',
      orbColor: 'bg-purple-400',
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-purple-600',
    };
  }
  if (iconColor.includes('amber') || iconColor.includes('yellow') || iconColor.includes('orange')) {
    return {
      iconBg: 'bg-fuchsia-50 dark:bg-fuchsia-500/15',
      orbColor: 'bg-fuchsia-400',
      gradientFrom: 'from-amber-500',
      gradientTo: 'to-violet-600',
    };
  }
  if (iconColor.includes('red')) {
    return {
      iconBg: 'bg-red-50 dark:bg-red-500/15',
      orbColor: 'bg-red-400',
      gradientFrom: 'from-red-500',
      gradientTo: 'to-red-600',
    };
  }
  if (iconColor.includes('pink')) {
    return {
      iconBg: 'bg-pink-50 dark:bg-pink-500/15',
      orbColor: 'bg-pink-400',
      gradientFrom: 'from-pink-500',
      gradientTo: 'to-pink-600',
    };
  }
  return {
    iconBg: 'bg-primary/10 dark:bg-primary/20',
    orbColor: 'bg-primary',
    gradientFrom: 'from-primary',
    gradientTo: 'to-primary/70',
  };
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  trend,
  icon: Icon,
  iconColor = 'text-primary',
  isLoading,
  subtitle,
  className,
}) => {
  const colorConfig = getColorConfig(iconColor);
  const trendValue = trend ? trend.value : change;
  const isUp = trend ? trend.direction === 'up' : (change || 0) >= 0;

  // Parse numeric value for animation
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
      <div className={cn(
        "dashboard-card relative overflow-hidden group p-5 h-full",
        "bg-white/90 dark:bg-gray-900/90",
        "border border-gray-100 dark:border-gray-800/80",
        "hover:border-gray-200 dark:hover:border-gray-700/80"
      )}>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl dashboard-skeleton" />
              <div className="w-14 h-5 rounded-full dashboard-skeleton" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-3 dashboard-skeleton rounded w-24" />
              <div className="h-8 dashboard-skeleton rounded w-28" />
            </div>
          </div>
        ) : (
          <>
            {/* Decorative gradient orb */}
            <motion.div
              className={cn(
                "absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl",
                "opacity-20 group-hover:opacity-30 transition-all duration-500",
                colorConfig.orbColor
              )}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.2, 0.25, 0.2]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full justify-between">
              {/* Header with Icon and Change */}
              <div className="flex items-start justify-between mb-3">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'p-3 rounded-xl transition-all duration-300',
                    'shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.03]',
                    colorConfig.iconBg
                  )}
                >
                  <Icon size={22} className={iconColor} strokeWidth={2} />
                </motion.div>

                {(change !== undefined || trend) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                    className={cn(
                      'flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full',
                      'ring-1 ring-inset',
                      isUp
                        ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/15 ring-purple-500/20'
                        : 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/15 ring-red-500/20'
                    )}
                  >
                    {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {typeof trendValue === 'number' ? `${Math.abs(trendValue)}%` : trendValue}
                  </motion.div>
                )}
              </div>

              {/* Value and Title */}
              <div className="space-y-1">
                <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">
                  {title}
                </p>
                <motion.p
                  key={value}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight dashboard-counter"
                >
                  {isNumeric ? animatedValue.toLocaleString() : value}
                </motion.p>

                {/* Optional Subtitle */}
                {subtitle && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-xs text-gray-400 dark:text-gray-500 mt-1"
                  >
                    {subtitle}
                  </motion.p>
                )}
              </div>
            </div>

            {/* Subtle bottom gradient line */}
            <div className={cn(
              "absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
              "bg-gradient-to-r",
              colorConfig.gradientFrom,
              colorConfig.gradientTo
            )} />
          </>
        )}
      </div>
    </motion.div>
  );
};
