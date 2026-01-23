import React from 'react';
import { cn } from '@/utils/cn';

interface AnimatedLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ className, size = 'md' }) => {

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-16 h-16 text-2xl',
  };

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'rounded-lg bg-primary flex items-center justify-center font-semibold text-white',
          sizeClasses[size]
        )}
      >
        <span>HR</span>
      </div>
    </div>
  );
};
