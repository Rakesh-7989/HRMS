import React from 'react';
import { cn } from '@/utils/cn';
import darkLogo from '../../Assests/login_logo.svg';
import lightLogo from '../../Assests/light-logo.svg';
import { useTheme } from '@/contexts/ThemeContext';

interface AnimatedLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ className, size = 'md' }) => {
  const { theme } = useTheme();

  const sizeClasses = {
    sm: 'h-8 min-w-[32px]',
    md: 'h-10 min-w-[40px]',
    lg: 'h-16 min-w-[64px]',
  };

  const logo = theme === 'light' ? lightLogo : darkLogo;

  return (
    <div className={cn('relative h-fit', className)}>
      <div
        className={cn(
          'rounded-lg flex items-center justify-center',
          sizeClasses[size]
        )}
      >
        <img
          src={logo}
          alt="WellZo HRMS"
          className="h-full w-auto object-contain block"
          loading="eager"
        />
      </div>
    </div>
  );
};
