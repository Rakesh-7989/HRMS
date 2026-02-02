import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import './dashboard.css';

interface ChartCardProps {
    title: string;
    subtitle?: string;
    badge?: {
        label: string;
        color?: 'blue' | 'purple' | 'emerald' | 'amber';
    };
    children: React.ReactNode;
    isLoading?: boolean;
    height?: number;
    className?: string;
    headerAction?: React.ReactNode;
}

const badgeColors = {
    blue: 'dashboard-chart-badge--blue',
    purple: 'dashboard-chart-badge--purple',
    emerald: 'dashboard-chart-badge--emerald',
    amber: 'dashboard-chart-badge--amber',
};

export const ChartCard: React.FC<ChartCardProps> = ({
    title,
    subtitle,
    badge,
    children,
    isLoading = false,
    height = 280,
    className,
    headerAction,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
                "dashboard-chart-card",
                "bg-white/95 dark:bg-gray-900/95",
                "border border-gray-100 dark:border-gray-800/80",
                "hover:border-gray-200 dark:hover:border-gray-700/80",
                "transition-all duration-300",
                className
            )}
        >
            {/* Header */}
            <div className="dashboard-chart-header">
                <div>
                    <h3 className="dashboard-chart-title">{title}</h3>
                    {subtitle && (
                        <p className="dashboard-chart-subtitle">{subtitle}</p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {badge && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className={cn(
                                "dashboard-chart-badge",
                                badgeColors[badge.color || 'blue']
                            )}
                        >
                            {badge.label}
                        </motion.div>
                    )}
                    {headerAction}
                </div>
            </div>

            {/* Chart Content */}
            {isLoading ? (
                <div
                    className="flex items-center justify-center"
                    style={{ height }}
                >
                    <div className="flex flex-col items-center gap-3">
                        <motion.div
                            className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                            Loading chart...
                        </span>
                    </div>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15, duration: 0.4 }}
                >
                    {children}
                </motion.div>
            )}
        </motion.div>
    );
};
