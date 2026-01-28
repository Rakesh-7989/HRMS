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
    isToday,
    isWithinInterval,
    isBefore
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/utils/cn';

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    className,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(startDate ? new Date(startDate) : new Date());
    const [selectingStart, setSelectingStart] = useState(true);
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDateClick = (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd');

        if (selectingStart) {
            onStartDateChange(dateStr);
            onEndDateChange('');
            setSelectingStart(false);
        } else {
            if (start && isBefore(day, start)) {
                onStartDateChange(dateStr);
                onEndDateChange(format(start, 'yyyy-MM-dd'));
            } else {
                onEndDateChange(dateStr);
            }
            setSelectingStart(true);
            setIsOpen(false);
        }
    };

    const isInRange = (day: Date) => {
        if (!start) return false;

        const rangeEnd = end || (hoverDate && !selectingStart ? hoverDate : null);
        if (!rangeEnd) return false;

        try {
            if (isBefore(rangeEnd, start)) {
                return isWithinInterval(day, { start: rangeEnd, end: start });
            }
            return isWithinInterval(day, { start, end: rangeEnd });
        } catch {
            return false;
        }
    };

    const isRangeStart = (day: Date) => start && isSameDay(day, start);
    const isRangeEnd = (day: Date) => {
        if (end) return isSameDay(day, end);
        if (!selectingStart && hoverDate) return isSameDay(day, hoverDate);
        return false;
    };

    const renderHeader = () => (
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-gray-200 dark:border-gray-700">
            <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700 transition-colors"
            >
                <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <span className="font-bold text-lg text-gray-900 dark:text-white">
                {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700 transition-colors"
            >
                <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
        </div>
    );

    const renderDays = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return (
            <div className="grid grid-cols-7 gap-0 px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
                {days.map((day) => (
                    <div
                        key={day}
                        className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2"
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
                const inRange = isInRange(day);
                const isStart = isRangeStart(day);
                const isEnd = isRangeEnd(day);

                days.push(
                    <button
                        type="button"
                        key={day.toString()}
                        onClick={() => handleDateClick(cloneDay)}
                        onMouseEnter={() => setHoverDate(cloneDay)}
                        onMouseLeave={() => setHoverDate(null)}
                        className={cn(
                            'relative h-10 text-sm font-medium transition-all',
                            isCurrentMonth
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-400 dark:text-gray-600',
                            inRange && !isStart && !isEnd && 'bg-primary/10',
                            isStart && 'bg-primary text-white rounded-l-full',
                            isEnd && !isStart && 'bg-primary text-white rounded-r-full',
                            isStart && isEnd && 'rounded-full',
                            isTodayDate && !isStart && !isEnd && 'font-bold text-primary',
                            !inRange && !isStart && !isEnd && isCurrentMonth && 'hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full'
                        )}
                    >
                        <span className={cn(
                            'flex items-center justify-center w-full h-full',
                            (isStart || isEnd) && 'rounded-full'
                        )}>
                            {format(day, 'd')}
                        </span>
                    </button>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7 gap-0" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="px-3 py-2 space-y-0">{rows}</div>;
    };

    const displayText = () => {
        if (start && end) {
            return `${format(start, 'dd MMM')} - ${format(end, 'dd MMM yyyy')}`;
        }
        if (start) {
            return `${format(start, 'dd MMM yyyy')} - Select end`;
        }
        return 'Select date range';
    };

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all',
                    'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
                    'hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
                    'text-sm font-medium text-gray-900 dark:text-white shadow-sm',
                    isOpen && 'ring-2 ring-primary/30 border-primary'
                )}
            >
                <Calendar size={18} className="text-primary" />
                <span>{displayText()}</span>
            </button>

            {isOpen && (
                <div
                    className="absolute top-full right-0 mt-2 z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[320px] animate-fadeIn"
                >
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between text-xs">
                            <div className={cn(
                                'flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors',
                                selectingStart ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            )}>
                                <span className="font-medium">Start:</span>
                                <span>{start ? format(start, 'dd MMM') : '---'}</span>
                            </div>
                            <ChevronRight size={16} className="text-gray-400" />
                            <div className={cn(
                                'flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors',
                                !selectingStart ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            )}>
                                <span className="font-medium">End:</span>
                                <span>{end ? format(end, 'dd MMM') : '---'}</span>
                            </div>
                        </div>
                    </div>

                    {renderHeader()}
                    {renderDays()}
                    {renderCells()}

                    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const today = new Date();
                                    const weekAgo = addDays(today, -7);
                                    onStartDateChange(format(weekAgo, 'yyyy-MM-dd'));
                                    onEndDateChange(format(today, 'yyyy-MM-dd'));
                                    setIsOpen(false);
                                }}
                                className="text-xs px-3 py-1.5 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                            >
                                Last 7 days
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const today = new Date();
                                    const monthAgo = addDays(today, -30);
                                    onStartDateChange(format(monthAgo, 'yyyy-MM-dd'));
                                    onEndDateChange(format(today, 'yyyy-MM-dd'));
                                    setIsOpen(false);
                                }}
                                className="text-xs px-3 py-1.5 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                            >
                                Last 30 days
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                onStartDateChange('');
                                onEndDateChange('');
                                setSelectingStart(true);
                            }}
                            className="text-xs text-red-500 hover:text-red-600 font-medium"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
