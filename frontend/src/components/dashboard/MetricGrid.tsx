import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import './dashboard.css';

interface MetricItem {
    label: string;
    value: string | number;
    color: 'blue' | 'purple' | 'amber' | 'red' | 'pink';
}

interface MetricGridProps {
    metrics: MetricItem[];
    columns?: 2 | 3 | 4;
    isLoading?: boolean;
    className?: string;
}

const colorClasses = {
    blue: {
        card: 'dashboard-metric-card--blue',
        value: 'dashboard-metric-value--blue',
    },
    purple: {
        card: 'dashboard-metric-card--purple',
        value: 'dashboard-metric-value--purple',
    },
    amber: {
        card: 'dashboard-metric-card--amber',
        value: 'dashboard-metric-value--amber',
    },
    red: {
        card: 'bg-red-50/80 dark:bg-red-500/10 border-red-100 dark:border-red-500/20',
        value: 'text-red-600 dark:text-red-400',
    },
    pink: {
        card: 'bg-pink-50/80 dark:bg-pink-500/10 border-pink-100 dark:border-pink-500/20',
        value: 'text-pink-600 dark:text-pink-400',
    },
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
    }
};

export const MetricGrid: React.FC<MetricGridProps> = ({
    metrics,
    columns = 2,
    isLoading = false,
    className,
}) => {
    const gridCols = {
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-2 md:grid-cols-4',
    };

    if (isLoading) {
        return (
            <div className={cn("grid gap-4", gridCols[columns], className)}>
                {Array.from({ length: columns }).map((_, i) => (
                    <div key={i} className="p-4 rounded-xl">
                        <div className="h-3 w-16 dashboard-skeleton rounded mb-2" />
                        <div className="h-7 w-12 dashboard-skeleton rounded" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={cn("grid gap-4", gridCols[columns], className)}
        >
            {metrics.map((metric, index) => {
                const colors = colorClasses[metric.color];

                return (
                    <motion.div
                        key={index}
                        variants={itemVariants}
                        whileHover={{ scale: 1.03, y: -2 }}
                        className={cn(
                            "dashboard-metric-card",
                            colors.card
                        )}
                    >
                        <p className="dashboard-metric-label">{metric.label}</p>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 + index * 0.05 }}
                            className={cn("dashboard-metric-value", colors.value)}
                        >
                            {typeof metric.value === 'number'
                                ? metric.value.toLocaleString()
                                : metric.value
                            }
                        </motion.p>
                    </motion.div>
                );
            })}
        </motion.div>
    );
};
