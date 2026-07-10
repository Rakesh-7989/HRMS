import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import './dashboard.css';

interface DashboardSectionProps {
    icon: LucideIcon;
    iconColor?: string;
    iconBgColor?: string;
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    className?: string;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
    icon: Icon,
    iconColor = 'text-primary',
    iconBgColor = 'bg-primary/10 dark:bg-primary/20',
    title,
    subtitle,
    action,
    className,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
                "flex items-center justify-between",
                className
            )}
        >
            <div className="flex items-center gap-3">
                <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                        "dashboard-section-icon",
                        iconBgColor
                    )}
                >
                    <Icon size={20} className={iconColor} />
                </motion.div>
                <div>
                    <h3 className="dashboard-section-title">{title}</h3>
                    {subtitle && (
                        <p className="dashboard-section-subtitle">{subtitle}</p>
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
