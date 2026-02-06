import React from 'react';
import { cn } from '@/utils/cn';

interface TypingIndicatorProps {
    users: string[];
    className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users, className }) => {
    if (users.length === 0) return null;

    const formatNames = () => {
        if (users.length === 1) return `${users[0]} is typing`;
        if (users.length === 2) return `${users[0]} and ${users[1]} are typing`;
        return `${users[0]} and ${users.length - 1} others are typing`;
    };

    return (
        <div className={cn("flex items-center gap-2 px-4 py-2", className)}>
            <div className="flex items-center gap-1">
                <div className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 italic animate-pulse">
                {formatNames()}...
            </span>
        </div>
    );
};

export default TypingIndicator;
