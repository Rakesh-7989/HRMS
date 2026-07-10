import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FormErrorProps {
    message?: string;
    className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({ message, className }) => {
    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn("flex items-center gap-1.5 mt-1.5 text-red-500", className)}
                >
                    <AlertCircle size={14} className="shrink-0" />
                    <span className="text-[12px] font-bold leading-none">{message}</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
