import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import './dashboard.css';

interface ListCardItem {
    label: string;
    value: string | number;
    subValue?: string;
    icon?: React.ReactNode;
}

interface ListCardProps {
    title: string;
    count?: number;
    data: ListCardItem[];
    className?: string;
    maxHeight?: string;
    emptyMessage?: string;
    isLoading?: boolean;
}

export const ListCard: React.FC<ListCardProps> = ({
    title,
    count,
    data,
    className,
    maxHeight = '400px',
    emptyMessage = 'No data available',
    isLoading = false
}) => {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -16 },
        visible: {
            opacity: 1,
            x: 0,
            transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
                "dashboard-card p-6",
                "bg-white/90 dark:bg-gray-900/90",
                "border border-gray-100 dark:border-gray-800/80",
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                        {title}
                    </h3>
                    {count !== undefined && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {count} Total
                        </p>
                    )}
                </div>

                {count !== undefined && count > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="dashboard-chart-badge--purple"
                    >
                        {count}
                    </motion.div>
                )}
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-xl">
                            <div className="w-10 h-10 rounded-xl dashboard-skeleton" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 dashboard-skeleton rounded w-32" />
                                <div className="h-3 dashboard-skeleton rounded w-20" />
                            </div>
                            <div className="h-4 dashboard-skeleton rounded w-16" />
                        </div>
                    ))}
                </div>
            ) : data.length > 0 ? (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2 dashboard-scrollable"
                    style={{ maxHeight }}
                >
                    {data.map((item, index) => (
                        <motion.div
                            key={index}
                            variants={itemVariants}
                            whileHover={{ scale: 1.01, x: 4 }}
                            className={cn(
                                "group flex items-center justify-between p-3.5 rounded-xl",
                                "bg-gray-50/80 dark:bg-gray-800/40",
                                "border border-transparent",
                                "hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent",
                                "hover:border-primary/10 dark:hover:border-primary/20",
                                "transition-all duration-200 cursor-default"
                            )}
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                {item.icon && (
                                    <motion.div
                                        className="flex-shrink-0"
                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {item.icon}
                                    </motion.div>
                                )}
                                <div className="min-w-0">
                                    <p className={cn(
                                        "text-sm font-semibold text-gray-900 dark:text-white",
                                        "group-hover:text-primary dark:group-hover:text-primary",
                                        "transition-colors duration-200 truncate"
                                    )}>
                                        {item.label}
                                    </p>
                                    {item.subValue && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                            {item.subValue}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <motion.div
                                className="text-right flex-shrink-0 ml-4"
                                initial={{ opacity: 0.8 }}
                                whileHover={{ opacity: 1, scale: 1.02 }}
                            >
                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                    {item.value}
                                </p>
                            </motion.div>
                        </motion.div>
                    ))}
                </motion.div>
            ) : (
                <div className="dashboard-empty-state py-12">
                    <div className="dashboard-empty-icon">
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-gray-300 dark:text-gray-600"
                        >
                            <path d="M3 7h18M3 12h18M3 17h18" />
                        </svg>
                    </div>
                    <p className="dashboard-empty-title">No items</p>
                    <p className="dashboard-empty-text">{emptyMessage}</p>
                </div>
            )}
        </motion.div>
    );
};
