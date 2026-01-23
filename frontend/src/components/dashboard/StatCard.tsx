import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  isLoading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'text-primary',
  isLoading,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.150 }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      <Card hover={false} className="relative overflow-hidden group">
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-white/10 rounded w-24 mb-2" />
            <div className="h-8 bg-white/10 rounded w-32" />
          </div>
        ) : (
          <>
            <motion.div
              className="absolute top-0 right-0 w-20 h-20 bg-primary-10 rounded-full blur-2xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.150 }}
                  className={cn('p-3 rounded-lg bg-primary-10 dark:bg-primary-20 transition-colors duration-300', iconColor)}
                >
                  <Icon size={24} className={iconColor} />
                </motion.div>
                {change !== undefined && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.150 }}
                    className={cn(
                      'flex items-center gap-1 text-sm font-medium',
                      change >= 0 ? 'text-accent-green' : 'text-red-400'
                    )}
                  >
                    {change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {Math.abs(change)}%
                  </motion.div>
                )}
              </div>
              <p className="text-gray-600 dark:text-muted text-sm mb-1 transition-colors duration-300">{title}</p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.150 }}
                className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300"
              >
                {value}
              </motion.p>
            </div>
          </>
        )}
      </Card>
    </motion.div>
  );
};

