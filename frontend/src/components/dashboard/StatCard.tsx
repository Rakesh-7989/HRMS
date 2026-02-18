import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/utils/cn';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  gradient?: string[];
  delay?: number;
  className?: string;
  trend?: number;
  iconColor?: string;
  isLoading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient = ['#6366f1', '#4f46e5'],
  delay = 0,
  className = '',
  trend,
  iconColor,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className={cn("p-6 rounded-2xl bg-white dark:bg-[#111827]/80 border border-gray-100 dark:border-white/5 animate-pulse h-32", className)}>
        <div className="flex justify-between items-start">
          <div className="space-y-3 flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`relative h-full ${className}`}
    >
      <div className="relative h-full overflow-hidden rounded-[2rem] p-5 bg-white dark:bg-[#111827]/80 backdrop-blur-xl border border-gray-100 dark:border-white/5 shadow-xl dark:shadow-2xl transition-all hover:translate-y-[-4px] hover:shadow-primary/20 group">
        <div className="flex flex-col h-full justify-between gap-4">
          <div className="flex items-center justify-between">
            {/* Icon Box */}
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform",
                !gradient && iconColor
              )}
              style={gradient ? { background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` } : {}}
            >
              <Icon className={cn("w-6 h-6", iconColor ? iconColor : "text-white")} />
            </div>

            {trend !== undefined && (
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black backdrop-blur-md ${trend >= 0 ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                {trend >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {Math.abs(trend)}%
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              {title}
            </p>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </h3>
            {subtitle && (
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
