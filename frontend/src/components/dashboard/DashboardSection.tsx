import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface DashboardSectionProps {
    icon: LucideIcon;
    iconColor?: 'brand' | 'success' | 'warning' | 'error' | 'teal' | 'coral' | 'neutral';
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    className?: string;
}

const iconBgMap: Record<string, { bg: string; text: string }> = {
    brand: { bg: 'bg-brand-100 dark:bg-brand-500/20', text: 'text-brand-600 dark:text-brand-400' },
    success: { bg: 'bg-success-100 dark:bg-success-500/20', text: 'text-success-600 dark:text-success-400' },
    warning: { bg: 'bg-warning-100 dark:bg-warning-500/20', text: 'text-warning-600 dark:text-warning-400' },
    error: { bg: 'bg-error-100 dark:bg-error-500/20', text: 'text-error-600 dark:text-error-400' },
    teal: { bg: 'bg-teal-100 dark:bg-teal-500/20', text: 'text-teal-600 dark:text-teal-400' },
    coral: { bg: 'bg-coral-100 dark:bg-coral-500/20', text: 'text-coral-600 dark:text-coral-400' },
    neutral: { bg: 'bg-neutral-100 dark:bg-neutral-500/20', text: 'text-neutral-600 dark:text-neutral-400' },
};

export const DashboardSection: React.FC<DashboardSectionProps> = ({
    icon: Icon,
    iconColor = 'brand',
    title,
    subtitle,
    action,
    className,
}) => {
    const colors = iconBgMap[iconColor];

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={cn("flex items-center justify-between", className)}
        >
            <div className="flex items-center gap-3">
                <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                    className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors.bg)}
                >
                    <Icon size={20} className={colors.text} />
                </motion.div>
                <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">{title}</h3>
                    {subtitle && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
                    )}
                </div>
            </div>

            {action && (
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    {action}
                </motion.div>
            )}
        </motion.div>
    );
};
