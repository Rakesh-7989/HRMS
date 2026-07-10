import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    setMonth,
    setYear,
    isSameMonth,
    isSameDay,
    isToday,
    getYear,
    getMonth,
    startOfDay,
    isBefore,
    isAfter
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/utils/cn';

interface DatePickerProps {
    value: string;
    onChange: (date: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    minYear?: number;
    maxYear?: number;
    minDate?: Date;
    maxDate?: Date;
}

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

type ViewMode = 'calendar' | 'month' | 'year';

export const DatePicker: React.FC<DatePickerProps> = ({
    value,
    onChange,
    placeholder = 'Select date',
    className,
    disabled = false,
    minYear = 1950,
    maxYear = 2100,
    minDate,
    maxDate,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
    const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
    const [viewMode, setViewMode] = useState<ViewMode>('calendar');
    const [yearPageStart, setYearPageStart] = useState(() => {
        const targetYear = value ? getYear(new Date(value)) : new Date().getFullYear();
        // Center the target year in the grid (put it around position 2-3 of 12)
        return Math.max(minYear, targetYear - 2);
    });
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedDate = value ? new Date(value) : null;
    const currentYear = getYear(currentMonth);
    const currentMonthIndex = getMonth(currentMonth);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const isOutsideButton = containerRef.current && !containerRef.current.contains(event.target as Node);
            const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target as Node);

            if (isOutsideButton && isOutsideDropdown) {
                setIsOpen(false);
                setViewMode('calendar');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !containerRef.current) return;

        const updatePosition = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const dropdownHeight = 340;
            const dropdownWidth = 300;

            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const spaceOnRight = window.innerWidth - rect.right;

            const shouldShowTop = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
            const shouldAlignRight = spaceOnRight < dropdownWidth - rect.width;

            setPortalStyle({
                position: 'fixed',
                top: shouldShowTop ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
                left: shouldAlignRight ? rect.right - dropdownWidth : rect.left,
                width: dropdownWidth,
                zIndex: 10001,
                opacity: 1,
                pointerEvents: 'auto'
            });
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    const handleDateClick = (day: Date) => {
        onChange(format(day, 'yyyy-MM-dd'));
        setIsOpen(false);
        setViewMode('calendar');
    };

    const handleMonthSelect = (monthIndex: number) => {
        setCurrentMonth(setMonth(currentMonth, monthIndex));
        setViewMode('calendar');
    };

    const handleYearSelect = (year: number) => {
        setCurrentMonth(setYear(currentMonth, year));
        setViewMode('month'); // Go to month selection after year
    };

    const prevMonth = () => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() - 1);
            return newDate;
        });
    };

    const nextMonth = () => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + 1);
            return newDate;
        });
    };

    // Generate years for current page (12 years per page)
    const yearsInPage = useMemo(() => {
        const years = [];
        for (let i = 0; i < 12; i++) {
            const year = yearPageStart + i;
            if (year >= minYear && year <= maxYear) {
                years.push(year);
            }
        }
        return years;
    }, [yearPageStart, minYear, maxYear]);

    const handleOpenChange = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
            setViewMode('calendar');
        }
    };

    const renderHeader = () => (
        <div className="flex items-center justify-between px-3 py-3 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-gray-100 dark:border-gray-800">
            {viewMode === 'calendar' && (
                <>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); prevMonth(); }}
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all hover:shadow-sm"
                    >
                        <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
                    </button>

                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setViewMode('month'); }}
                        className="px-3 py-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all hover:shadow-sm group"
                    >
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-primary transition-colors">
                            {format(currentMonth, 'MMMM yyyy')}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); nextMonth(); }}
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all hover:shadow-sm"
                    >
                        <ChevronRight size={18} className="text-gray-600 dark:text-gray-400" />
                    </button>
                </>
            )}

            {viewMode === 'month' && (
                <>
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setViewMode('year'); }}
                        className="px-4 py-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all hover:shadow-sm group"
                    >
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-primary transition-colors">
                            {currentYear}
                        </span>
                    </button>
                    <div className="flex-1" />
                </>
            )}

            {viewMode === 'year' && (
                <>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (yearPageStart - 12 >= minYear) setYearPageStart(prev => prev - 12);
                        }}
                        disabled={yearPageStart <= minYear}
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronsLeft size={18} className="text-gray-600 dark:text-gray-400" />
                    </button>

                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        {yearPageStart} - {Math.min(yearPageStart + 11, maxYear)}
                    </span>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (yearPageStart + 12 <= maxYear) setYearPageStart(prev => prev + 12);
                        }}
                        disabled={yearPageStart + 12 > maxYear}
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronsRight size={18} className="text-gray-600 dark:text-gray-400" />
                    </button>
                </>
            )}
        </div>
    );

    const renderMonthGrid = () => (
        <div className="p-3">
            <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((month, index) => {
                    const isSelected = currentMonthIndex === index;
                    const isCurrentMonth = new Date().getMonth() === index && currentYear === new Date().getFullYear();

                    return (
                        <button
                            key={month}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleMonthSelect(index); }}
                            className={cn(
                                "py-3 px-2 rounded-xl text-sm font-medium transition-all relative overflow-hidden",
                                isSelected
                                    ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/25"
                                    : isCurrentMonth
                                        ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20"
                                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            )}
                        >
                            {month}
                            {isSelected && (
                                <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />
                            )}
                        </button>
                    );
                })}
            </div>

            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setViewMode('calendar'); }}
                className="mt-3 w-full py-2 text-xs font-medium text-gray-500 hover:text-primary transition-colors"
            >
                ← Back to calendar
            </button>
        </div>
    );

    const renderYearGrid = () => (
        <div className="p-3">
            <div className="grid grid-cols-3 gap-2">
                {yearsInPage.map(year => {
                    const isSelected = currentYear === year;
                    const isCurrentYear = new Date().getFullYear() === year;

                    return (
                        <button
                            key={year}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleYearSelect(year); }}
                            className={cn(
                                "py-3 px-2 rounded-xl text-sm font-medium transition-all relative overflow-hidden",
                                isSelected
                                    ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/25"
                                    : isCurrentYear
                                        ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20"
                                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            )}
                        >
                            {year}
                            {isSelected && (
                                <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />
                            )}
                        </button>
                    );
                })}
            </div>

            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setViewMode('month'); }}
                className="mt-3 w-full py-2 text-xs font-medium text-gray-500 hover:text-primary transition-colors"
            >
                ← Back to months
            </button>
        </div>
    );

    const renderDays = () => {
        const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        return (
            <div className="grid grid-cols-7 gap-0 px-3 py-2">
                {days.map((day) => (
                    <div
                        key={day}
                        className="text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider"
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
                const isSunday = day.getDay() === 0;

                // Disable if outside min/max range
                const isDisabled = (minDate && isBefore(startOfDay(day), startOfDay(minDate))) ||
                    (maxDate && isAfter(startOfDay(day), startOfDay(maxDate)));

                days.push(
                    <button
                        type="button"
                        key={day.toString()}
                        onClick={(e) => { e.stopPropagation(); if (!isDisabled) handleDateClick(cloneDay); }}
                        disabled={isDisabled}
                        className={cn(
                            'h-9 w-9 mx-auto rounded-xl text-sm font-medium transition-all flex items-center justify-center relative',
                            isCurrentMonth
                                ? isSunday
                                    ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                                    : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                                : 'text-gray-300 dark:text-gray-700',
                            isSelected && 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/25 hover:from-primary hover:to-primary/80',
                            isTodayDate && !isSelected && 'ring-2 ring-primary/40 font-bold text-primary bg-primary/5',
                            isDisabled && 'opacity-20 cursor-not-allowed hover:bg-transparent grayscale'
                        )}
                    >
                        {format(day, 'd')}
                    </button>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7 gap-0.5 py-0.5" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="px-2 py-1">{rows}</div>;
    };

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <button
                type="button"
                onClick={handleOpenChange}
                disabled={disabled}
                className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all w-full group',
                    'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
                    'hover:border-primary/50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30',
                    'text-sm text-gray-900 dark:text-white',
                    isOpen && 'ring-2 ring-primary/30 border-primary shadow-sm',
                    disabled && 'opacity-50 cursor-not-allowed'
                )}
            >
                <Calendar size={16} className={cn(
                    "text-gray-400 dark:text-gray-500 flex-shrink-0 transition-colors",
                    isOpen && "text-primary"
                )} />
                <span className={cn('flex-1 text-left', !value && 'text-gray-400 dark:text-gray-500')}>
                    {value ? format(new Date(value), 'dd MMM yyyy') : placeholder}
                </span>
                <ChevronRight size={14} className={cn(
                    "text-gray-300 dark:text-gray-600 transition-transform",
                    isOpen && "rotate-90 text-primary"
                )} />
            </button>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className={cn(
                        'bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden',
                        'animate-fadeIn'
                    )}
                    style={{
                        ...portalStyle,
                        boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.02)'
                    }}
                >
                    {renderHeader()}

                    {viewMode === 'calendar' && (
                        <>
                            {renderDays()}
                            {renderCells()}
                        </>
                    )}

                    {viewMode === 'month' && renderMonthGrid()}
                    {viewMode === 'year' && renderYearGrid()}

                    {viewMode === 'calendar' && (
                        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const today = new Date();
                                    onChange(format(today, 'yyyy-MM-dd'));
                                    setCurrentMonth(today);
                                    setIsOpen(false);
                                }}
                                className="text-xs font-semibold text-primary hover:underline"
                            >
                                Today
                            </button>
                            {value && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange('');
                                        setIsOpen(false);
                                    }}
                                    className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};
