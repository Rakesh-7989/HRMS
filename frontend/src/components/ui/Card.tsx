import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hover = false }) => {
  const cardContent = (
    <div
      className={cn(
        'bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-800 rounded-xl p-6 transition-elegant',
        hover && 'cursor-pointer hover:border-primary-border hover:shadow-premium hover:bg-[rgba(17,24,39,0.02)] dark:hover:bg-gray-800',
        className
      )}
    >
      {children}
    </div>
  );

  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -6, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{
          duration: 0.3,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {cardContent}
      </motion.div>
    );
  }

  return cardContent;
};

