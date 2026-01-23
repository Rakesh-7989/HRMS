import React, { createContext, useContext } from 'react';
import { cn } from '@/utils/cn';

interface RadioGroupContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextType | undefined>(undefined);

interface RadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onValueChange,
  children,
  className,
}) => {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div className={cn('grid gap-2', className)}>{children}</div>
    </RadioGroupContext.Provider>
  );
};

interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  className?: string;
}

export const RadioGroupItem: React.FC<RadioGroupItemProps> = ({
  value,
  className,
  ...props
}) => {
  const context = useContext(RadioGroupContext);
  if (!context) {
    throw new Error('RadioGroupItem must be used within a RadioGroup');
  }

  const { value: selectedValue, onValueChange } = context;

  return (
    <input
      type="radio"
      value={value}
      checked={selectedValue === value}
      onChange={(e) => onValueChange(e.target.value)}
      className={cn(
        'h-4 w-4 rounded-full border border-gray-300 dark:border-gray-700 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
};