import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import './dashboard.css';

interface DistributionItem {
    label: string;
    value: number;
    displayValue: string | number;
    color: string;
}

interface DistributionCardProps {
    title: string;
    data: DistributionItem[];
    className?: string;
    isLoading?: boolean;
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
    }
};

export const DistributionCard: React.FC<DistributionCardProps> = ({
    title,
    data,
    className,
    isLoading = false
}) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);

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
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-5">
                {title}
            </h3>

            {isLoading ? (
                <div className="space-y-5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-2">
                            <div className="flex justify-between">
                                <div className="h-4 w-24 dashboard-skeleton rounded" />
                                <div className="h-4 w-10 dashboard-skeleton rounded" />
                            </div>
                            <div className="h-2.5 dashboard-skeleton rounded-full" />
                        </div>
                    ))}
                </div>
            ) : (
                <motion.div
                    className="space-y-5"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {data.map((item, index) => {
                        const percentage = total > 0 ? (item.value / total) * 100 : 0;

                        return (
                            <motion.div
                                key={index}
                                variants={itemVariants}
                                className="space-y-2 group"
                            >
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                        {item.label}
                                    </span>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {item.displayValue}
                                    </span>
                                </div>
                                <div className="dashboard-progress-bar">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                                        className="dashboard-progress-fill"
                                        style={{
                                            background: `linear-gradient(90deg, ${item.color}, ${item.color}dd)`
                                        }}
                                    />
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}
        </motion.div>
    );
};
