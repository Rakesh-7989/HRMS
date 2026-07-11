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
        warning: <AlertTriangle className="w-5 h-5 text-coral-500" />,
        success: <CheckCircle className="w-5 h-5 text-brand-500" />,
        info: <Info className="w-5 h-5 text-brand-500" />,
    };

    const styles = {
        error: "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
        warning: "bg-coral-500/10 border-coral-500/20 text-coral-600 dark:text-coral-400",
        success: "bg-brand-500/10 border-brand-500/20 text-brand-600 dark:text-brand-400",
        info: "bg-brand-500/10 border-brand-500/20 text-brand-600 dark:text-brand-400",
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
