import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    type?: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    buttonText?: string;
    onButtonClick?: () => void;
}

const iconConfig = {
    success: {
        icon: CheckCircle,
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        iconColor: 'text-emerald-500',
        ringColor: 'ring-emerald-500/20',
    },
    error: {
        icon: XCircle,
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        iconColor: 'text-red-500',
        ringColor: 'ring-red-500/20',
    },
    warning: {
        icon: AlertCircle,
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        iconColor: 'text-amber-500',
        ringColor: 'ring-amber-500/20',
    },
    info: {
        icon: Info,
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-500',
        ringColor: 'ring-blue-500/20',
    },
};

const buttonConfig = {
    success: 'bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-500/50',
    error: 'bg-red-500 hover:bg-red-600 focus:ring-red-500/50',
    warning: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500/50',
    info: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500/50',
};

export const SuccessModal: React.FC<SuccessModalProps> = ({
    isOpen,
    onClose,
    type = 'success',
    title,
    message,
    buttonText = 'OK',
    onButtonClick,
}) => {
    const config = iconConfig[type];
    const IconComponent = config.icon;

    const handleButtonClick = () => {
        if (onButtonClick) {
            onButtonClick();
        }
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
                    >
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-8 pointer-events-auto relative overflow-hidden">
                            {/* Decorative background circles */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full" />
                            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-full" />

                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X size={18} className="text-gray-400" />
                            </button>

                            {/* Content */}
                            <div className="flex flex-col items-center text-center relative z-10">
                                {/* Icon with animated ring */}
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.1 }}
                                    className={cn(
                                        'w-20 h-20 rounded-full flex items-center justify-center mb-6',
                                        config.bgColor,
                                        'ring-8',
                                        config.ringColor
                                    )}
                                >
                                    <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                                    >
                                        <IconComponent size={40} className={config.iconColor} strokeWidth={2} />
                                    </motion.div>
                                </motion.div>

                                {/* Title */}
                                <motion.h3
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25 }}
                                    className="text-xl font-semibold text-gray-900 dark:text-white mb-2"
                                >
                                    {title}
                                </motion.h3>

                                {/* Message */}
                                {message && (
                                    <motion.p
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6"
                                    >
                                        {message}
                                    </motion.p>
                                )}

                                {/* Button */}
                                <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.35 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleButtonClick}
                                    className={cn(
                                        'w-full py-3 px-6 rounded-xl text-white font-medium transition-all',
                                        'focus:outline-none focus:ring-4',
                                        buttonConfig[type]
                                    )}
                                >
                                    {buttonText}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default SuccessModal;
