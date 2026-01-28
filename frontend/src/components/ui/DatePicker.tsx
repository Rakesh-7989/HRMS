import React, { useState, useRef, useEffect } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/utils/cn';

interface DatePickerProps {
    value: string;
    onChange: (date: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
    value,
    onChange,
    placeholder = 'Select date',
    className,
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
    const [position, setPosition] = useState<{ top: boolean; alignRight: boolean }>({ top: false, alignRight: false });
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedDate = value ? new Date(value) : null;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (value) {
            setCurrentMonth(new Date(value));
        }
    }, [value]);

    // Calculate optimal position when opening
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const dropdownHeight = 300;
            const dropdownWidth = 230;

            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const spaceOnRight = window.innerWidth - rect.right;

            setPosition({
                top: spaceBelow < dropdownHeight && spaceAbove > spaceBelow,
                alignRight: spaceOnRight < dropdownWidth - rect.width
            });
        }
    }, [isOpen]);

    const handleDateClick = (day: Date) => {
        onChange(format(day, 'yyyy-MM-dd'));
        setIsOpen(false);
    };

    const renderHeader = () => (
        <div className="flex items-center justify-between px-2 py-1.5 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-200 dark:border-gray-700">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setCurrentMonth(subMonths(currentMonth, 1));
                }}
                className="p-1 rounded-md hover:bg-white/50 dark:hover:bg-gray-700 transition-colors"
            >
                <ChevronLeft size={14} className="text-gray-600 dark:text-gray-400" />
            </button>
            <span className="font-semibold text-xs text-gray-900 dark:text-white">
                {format(currentMonth, 'MMM yyyy')}
            </span>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setCurrentMonth(addMonths(currentMonth, 1));
                }}
                className="p-1 rounded-md hover:bg-white/50 dark:hover:bg-gray-700 transition-colors"
            >
                <ChevronRight size={14} className="text-gray-600 dark:text-gray-400" />
            </button>
        </div>
    );

    const renderDays = () => {
        const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        return (
            <div className="grid grid-cols-7 gap-0 px-1 py-0.5 bg-gray-50 dark:bg-gray-800/50">
                {days.map((day) => (
                    <div
                        key={day}
                        className="text-center text-[9px] font-semibold text-gray-500 dark:text-gray-400 py-0.5"
                    >
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const dateStart = startOfWeek(monthStart);
        const dateEnd = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = dateStart;

        while (day <= dateEnd) {
            for (let i = 0; i < 7; i++) {
                const cloneDay = day;
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isTodayDate = isToday(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                days.push(
                    <button
                        type="button"
                        key={day.toString()}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDateClick(cloneDay);
                        }}
                        className={cn(
                            'h-6 w-6 mx-auto rounded-full text-[11px] font-medium transition-all flex items-center justify-center',
                            isCurrentMonth
                                ? 'text-gray-900 dark:text-white hover:bg-primary/10'
                                : 'text-gray-400 dark:text-gray-600',
                            isSelected && 'bg-primary text-white hover:bg-primary',
                            isTodayDate && !isSelected && 'ring-1 ring-primary/40 font-bold text-primary'
                        )}
                    >
                        {format(day, 'd')}
                    </button>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7 gap-0 py-px" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="px-1 py-0.5">{rows}</div>;
    };

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all w-full',
                    'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700',
                    'hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
                    'text-sm text-gray-900 dark:text-white',
                    isOpen && 'ring-2 ring-primary/30 border-primary',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            >
                <Calendar size={14} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span className={cn('flex-1 text-left text-xs', !value && 'text-gray-500 dark:text-gray-400')}>
                    {value ? format(new Date(value), 'dd MMM yyyy') : placeholder}
                </span>
            </button>

            {isOpen && (
                <div
                    className={cn(
                        'absolute z-[9999] bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden',
                        'w-[220px] animate-fadeIn',
                        position.top ? 'bottom-full mb-1' : 'top-full mt-1',
                        position.alignRight ? 'right-0' : 'left-0'
                    )}
                    style={{
                        maxWidth: 'calc(100vw - 20px)',
                    }}
                >
                    {renderHeader()}
                    {renderDays()}
                    {renderCells()}

                    <div className="px-2 py-1 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(format(new Date(), 'yyyy-MM-dd'));
                                setIsOpen(false);
                            }}
                            className="text-[10px] font-medium text-primary hover:underline"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange('');
                                setIsOpen(false);
                            }}
                            className="text-[10px] text-gray-500 hover:text-red-500 font-medium"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
