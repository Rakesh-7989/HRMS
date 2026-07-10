import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    addMonths,
    subMonths,
    setMonth,
    setYear,
    isSameMonth,
    isSameDay,
    isToday,
    isWithinInterval,
    isBefore,
    getYear,
    getMonth,
    differenceInDays
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, ChevronsLeft, ChevronsRight, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn';

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    className?: string;
    placeholder?: string;
    minYear?: number;
    maxYear?: number;
    customTrigger?: React.ReactNode;
    minDate?: string; // Add minDate prop
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type ViewMode = 'calendar' | 'month' | 'year';

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    className,
    placeholder = 'Select date range',
    minYear = 2024,
    maxYear = 2100,
    customTrigger,
    minDate,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(startDate ? new Date(startDate) : new Date());
    const [selectingStart, setSelectingStart] = useState(true);
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('calendar');
    const [yearPageStart, setYearPageStart] = useState(() => {
        const currentYear = new Date().getFullYear();
        const targetYear = startDate ? getYear(new Date(startDate)) : currentYear;
        // Center the target year in the grid (put it around position 2-3 of 12)
        return Math.max(minYear, targetYear - 2);
    });
    const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const currentYear = getYear(currentMonth);
    const currentMonthIndex = getMonth(currentMonth);

    // Calculate days between
    const daysBetween = useMemo(() => {
        if (start && end) {
            return differenceInDays(end, start) + 1;
        }
        return 0;
    }, [start, end]);

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

    // Calculate position
    useEffect(() => {
        if (!isOpen || !containerRef.current) return;

        const updatePosition = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const dropdownHeight = 420;
            const dropdownWidth = 340;

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
                zIndex: 10001
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

    const handleMonthSelect = (monthIndex: number) => {
        setCurrentMonth(setMonth(currentMonth, monthIndex));
        setViewMode('calendar');
    };

    const handleYearSelect = (year: number) => {
        setCurrentMonth(setYear(currentMonth, year));
        setViewMode('month');
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

    // Generate years for current page
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

    const renderHeader = () => (
        <div className="flex items-center justify-between px-3 py-3 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-gray-100 dark:border-gray-800">
            {viewMode === 'calendar' && (
                <>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setCurrentMonth(subMonths(currentMonth, 1)); }}
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all"
                    >
                        <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
                    </button>

                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setViewMode('month'); }}
                        className="px-3 py-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all group"
                    >
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-primary">
                            {format(currentMonth, 'MMMM yyyy')}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setCurrentMonth(addMonths(currentMonth, 1)); }}
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all"
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
                        className="px-4 py-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all group"
                    >
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-primary">
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
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all disabled:opacity-30"
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
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all disabled:opacity-30"
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
                {MONTHS.map((month, index) => (
                    <button
                        key={month}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleMonthSelect(index); }}
                        className={cn(
                            "py-3 px-2 rounded-xl text-sm font-medium transition-all",
                            currentMonthIndex === index
                                ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/25"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                        )}
                    >
                        {month}
                    </button>
                ))}
            </div>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setViewMode('calendar'); }}
                className="mt-3 w-full py-2 text-xs font-medium text-gray-500 hover:text-primary"
            >
                ← Back to calendar
            </button>
        </div>
    );

    const renderYearGrid = () => (
        <div className="p-3">
            <div className="grid grid-cols-3 gap-2">
                {yearsInPage.map(year => (
                    <button
                        key={year}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleYearSelect(year); }}
                        className={cn(
                            "py-3 px-2 rounded-xl text-sm font-medium transition-all",
                            currentYear === year
                                ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/25"
                                : year === new Date().getFullYear()
                                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                                    : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                        )}
                    >
                        {year}
                    </button>
                ))}
            </div>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setViewMode('month'); }}
                className="mt-3 w-full py-2 text-xs font-medium text-gray-500 hover:text-primary"
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
                const inRange = isInRange(day);
                const isStart = isRangeStart(day);
                const isEnd = isRangeEnd(day);
                const isSunday = day.getDay() === 0;
                
                const parsedMinDate = minDate ? new Date(minDate + 'T00:00:00') : null;
                const isBeforeMinDate = parsedMinDate ? (day.getTime() < parsedMinDate.getTime()) : false;

                days.push(
                    <button
                        type="button"
                        key={day.toString()}
                        disabled={isBeforeMinDate}
                        onClick={(e) => { e.stopPropagation(); handleDateClick(cloneDay); }}
                        onMouseEnter={() => setHoverDate(cloneDay)}
                        onMouseLeave={() => setHoverDate(null)}
                        className={cn(
                            'relative h-10 text-sm font-medium transition-all',
                            isBeforeMinDate 
                                ? 'opacity-30 cursor-not-allowed text-gray-400 dark:text-gray-600'
                                : isCurrentMonth
                                    ? isSunday
                                        ? 'text-red-500 dark:text-red-400'
                                        : 'text-gray-800 dark:text-gray-200'
                                    : 'text-gray-300 dark:text-gray-700',
                            !isBeforeMinDate && inRange && !isStart && !isEnd && 'bg-primary/10 dark:bg-primary/20',
                            !isBeforeMinDate && isStart && 'bg-gradient-to-r from-primary to-primary/90 text-white rounded-l-xl',
                            !isBeforeMinDate && isEnd && !isStart && 'bg-gradient-to-l from-primary to-primary/90 text-white rounded-r-xl',
                            !isBeforeMinDate && isStart && isEnd && 'rounded-xl',
                            !isBeforeMinDate && isTodayDate && !isStart && !isEnd && 'font-bold text-primary ring-2 ring-primary/30 rounded-full',
                            !isBeforeMinDate && !inRange && !isStart && !isEnd && isCurrentMonth && 'hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl'
                        )}
                    >
                        <span className={cn(
                            'flex items-center justify-center w-full h-full',
                            (isStart || isEnd) && 'font-semibold'
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
        return <div className="px-3 py-2">{rows}</div>;
    };

    const displayText = () => {
        if (start && end) {
            return `${format(start, 'dd MMM')} - ${format(end, 'dd MMM yyyy')}`;
        }
        if (start) {
            return `${format(start, 'dd MMM yyyy')} → Select end`;
        }
        return placeholder;
    };

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            {customTrigger ? (
                <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                    {customTrigger}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        'flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border transition-all w-full group',
                        'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
                        'hover:border-primary/50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30',
                        'text-xs sm:text-sm font-medium text-gray-900 dark:text-white',
                        isOpen && 'ring-2 ring-primary/30 border-primary shadow-sm'
                    )}
                >
                    <Calendar size={16} className={cn(
                        "text-gray-400 flex-shrink-0 transition-colors sm:w-[18px] sm:h-[18px]",
                        isOpen && "text-primary"
                    )} />
                    <span className={cn(
                        !start && 'text-gray-400 dark:text-gray-500',
                        "truncate"
                    )}>
                        {displayText()}
                    </span>
                    {daysBetween > 0 && (
                        <span className="ml-auto px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] sm:text-xs font-semibold whitespace-nowrap hidden xs:inline-flex">
                            {daysBetween} day{daysBetween !== 1 ? 's' : ''}
                        </span>
                    )}
                </button>
            )}

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
                    {/* Selection Status Bar */}
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-center gap-3 text-sm">
                            <div className={cn(
                                'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all',
                                selectingStart
                                    ? 'bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            )}>
                                <span className="text-xs font-medium opacity-70">Start</span>
                                <span className="font-semibold">{start ? format(start, 'dd MMM') : '---'}</span>
                            </div>
                            <ArrowRight size={16} className="text-gray-400" />
                            <div className={cn(
                                'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all',
                                !selectingStart
                                    ? 'bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            )}>
                                <span className="text-xs font-medium opacity-70">End</span>
                                <span className="font-semibold">{end ? format(end, 'dd MMM') : '---'}</span>
                            </div>
                        </div>
                    </div>

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
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const today = new Date();
                                        onStartDateChange(format(today, 'yyyy-MM-dd'));
                                        onEndDateChange(format(today, 'yyyy-MM-dd'));
                                        setIsOpen(false);
                                    }}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-medium transition-colors"
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const today = new Date();
                                        const tomorrow = addDays(today, 1);
                                        onStartDateChange(format(today, 'yyyy-MM-dd'));
                                        onEndDateChange(format(tomorrow, 'yyyy-MM-dd'));
                                        setIsOpen(false);
                                    }}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-medium transition-colors"
                                >
                                    2 Days
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const today = new Date();
                                        const weekLater = addDays(today, 6);
                                        onStartDateChange(format(today, 'yyyy-MM-dd'));
                                        onEndDateChange(format(weekLater, 'yyyy-MM-dd'));
                                        setIsOpen(false);
                                    }}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-medium transition-colors"
                                >
                                    1 Week
                                </button>
                            </div>
                            {(start || end) && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onStartDateChange('');
                                        onEndDateChange('');
                                        setSelectingStart(true);
                                    }}
                                    className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
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
