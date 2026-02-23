import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, XCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ValidationAlertProps {
    message: React.ReactNode | null;
    type?: 'error' | 'warning' | 'success' | 'info';
    className?: string;
    onClose?: () => void;
}

export const ValidationAlert: React.FC<ValidationAlertProps> = ({
    message,
    type = 'error',
    className,
    onClose
}) => {
    const icons = {
        error: <XCircle className="w-5 h-5 text-red-500" />,
        warning: <AlertTriangle className="w-5 h-5 text-fuchsia-500" />,
        success: <CheckCircle className="w-5 h-5 text-purple-500" />,
        info: <Info className="w-5 h-5 text-purple-500" />,
    };

    const styles = {
        error: "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
        warning: "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400",
        success: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
        info: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
    };

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                        "flex items-center gap-3 p-4 rounded-2xl border mb-6",
                        styles[type],
                        className
                    )}
                >
                    <div className="shrink-0">{icons[type]}</div>
                    <div className="text-sm font-bold flex-1">{message}</div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                        >
                            <XCircle className="w-4 h-4 opacity-50" />
                        </button>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};
