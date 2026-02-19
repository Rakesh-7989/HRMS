import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    error?: boolean;
    disabled?: boolean;
    name?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select an option...',
    className,
    error,
    disabled,
    name
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useLayoutEffect(() => {
        if (isOpen && containerRef.current) {
            const updatePosition = () => {
                const rect = containerRef.current!.getBoundingClientRect();
                setCoords({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX,
                    width: rect.width
                });
            };

            updatePosition();
            window.addEventListener('resize', updatePosition);

            // Close on scroll to avoid complex positioning updates
            const handleScroll = () => setIsOpen(false);
            window.addEventListener('scroll', handleScroll, { capture: true });

            return () => {
                window.removeEventListener('resize', updatePosition);
                window.removeEventListener('scroll', handleScroll, { capture: true });
            };
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            // Small delay to allow portal render
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearchTerm('');
    };

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
    };

    return (
        <div className={cn('relative w-full', className)} ref={containerRef}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    'flex items-center justify-between w-full px-4 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer text-sm shadow-sm',
                    disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' : 'bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600',
                    error ? 'border-red-500 ring-1 ring-red-500' : isOpen ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 dark:border-gray-700',
                    !value && 'text-gray-500 dark:text-gray-400'
                )}
            >
                <span className="truncate">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <div className="flex items-center gap-2">
                    {value && !disabled && (
                        <X
                            size={14}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            onClick={clearSelection}
                        />
                    )}
                    <ChevronDown
                        size={16}
                        className={cn('text-gray-400 transition-transform duration-200', isOpen && 'rotate-180')}
                    />
                </div>
            </div>

            {/* Portal for Dropdown */}
            {createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            ref={dropdownRef}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            style={{
                                position: 'absolute',
                                top: coords.top,
                                left: coords.left,
                                width: coords.width,
                                zIndex: 9999
                            }}
                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="Search..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border-none rounded-lg focus:ring-0 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                {filteredOptions.length > 0 ? (
                                    filteredOptions.map((opt) => (
                                        <div
                                            key={opt.value}
                                            onClick={() => handleSelect(opt.value)}
                                            className={cn(
                                                'flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors',
                                                opt.value === value
                                                    ? 'bg-primary/10 text-primary font-medium'
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            )}
                                        >
                                            <span>{opt.label}</span>
                                            {opt.value === value && <Check size={14} />}
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-xs text-center text-gray-500">
                                        No results found
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <input type="hidden" name={name} value={value} />
        </div>
    );
};
