import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, HelpCircle, Info } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { cn } from '@/utils/cn';

export interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value?: string) => void;
    title: string;
    message: string;
    type?: 'info' | 'confirm' | 'destructive' | 'prompt';
    confirmText?: string;
    cancelText?: string;
    defaultValue?: string;
    placeholder?: string;
    onBack?: () => void;
}

import { X, ArrowLeft } from 'lucide-react';

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'confirm',
    confirmText,
    cancelText = 'Cancel',
    defaultValue = '',
    placeholder = '',
    onBack,
}) => {
    const [inputValue, setInputValue] = useState(defaultValue);

    useEffect(() => {
        if (isOpen) {
            setInputValue(defaultValue);
        }
    }, [isOpen, defaultValue]);

    const handleConfirm = () => {
        onConfirm(type === 'prompt' ? inputValue : undefined);
        onClose();
    };

    const getIcon = () => {
        switch (type) {
            case 'destructive':
                return <AlertCircle className="text-red-500" size={24} />;
            case 'info':
                return <Info className="text-brand-500" size={24} />;
            case 'prompt':
                return <HelpCircle className="text-brand-500" size={24} />;
            default:
                return <HelpCircle className="text-brand-500" size={24} />;
        }
    };

    const getConfirmButtonVariant = () => {
        if (type === 'destructive') return 'destructive';
        return 'primary';
    };

    const defaultConfirmText = () => {
        if (confirmText) return confirmText;
        if (type === 'info') return 'OK';
        return 'Confirm';
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
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999]"
                    />
                    {/* Dialog */}
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2 }}
                            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-elev-6 max-w-md w-full overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header with Close and optional Back */}
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {onBack && (
                                         <Button variant="ghost" 
                                            onClick={onBack}
                                            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 group transition-all"
                                        >
                                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                                        </Button>
                                    )}
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">Confirmation</span>
                                </div>
                                 <Button variant="ghost" 
                                    onClick={onClose}
                                    className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all"
                                >
                                    <X size={20} />
                                </Button>
                            </div>

                            <div className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "p-3 rounded-xl shrink-0",
                                        type === 'destructive' ? "bg-red-50 dark:bg-red-900/20" :
                                            type === 'info' ? "bg-brand-50 dark:bg-brand-500/10" :
                                                "bg-brand-500/10 dark:bg-brand-500/20"
                                    )}>
                                        {getIcon()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-6">
                                            {title}
                                        </h3>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                            {message}
                                        </p>
                                    </div>
                                </div>

                                {type === 'prompt' && (
                                    <div className="mt-4">
                                        <Input
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder={placeholder}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleConfirm();
                                                if (e.key === 'Escape') onClose();
                                            }}
                                        />
                                    </div>
                                )}

                                <div className="mt-8 flex items-center justify-end gap-3">
                                    {type !== 'info' && (
                                        <Button
                                            variant="ghost"
                                            onClick={onClose}
                                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                        >
                                            {cancelText}
                                        </Button>
                                    )}
                                    <Button
                                        variant={getConfirmButtonVariant()}
                                        onClick={handleConfirm}
                                        className="px-6"
                                    >
                                        {defaultConfirmText()}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
