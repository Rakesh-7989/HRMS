import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Megaphone, Building } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, subMonths, addMonths } from 'date-fns';
import { PeopleEventsResponse, PersonEvent } from '@/services/events.service';
import { calendarService } from '@/services/calendar.service';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import './dashboard.css';

type Props = {
    events?: PeopleEventsResponse;
    className?: string;
    compact?: boolean;
    announcements?: Array<{ id: number; title: string; date: string; message?: string; created_at?: string }>;
};

const CalendarCard: React.FC<Props> = ({ events = {}, className = '', compact = true, announcements: propAnnouncements }) => {
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

    // Fetch dynamic calendar data for the current month
    const month = currentMonth.getMonth() + 1;
    const year = currentMonth.getFullYear();

    const { data: calendarData = [] } = useQuery({
        queryKey: ['calendar', month, year],
        queryFn: () => calendarService.getCalendar(month, year),
    });

    const { data: fetchedAnnouncements = [] } = useQuery({
        queryKey: ['corporate-announcements'],
        queryFn: () => calendarService.getAnnouncements(),
        enabled: !propAnnouncements,
    });

    const announcements = propAnnouncements || fetchedAnnouncements;

    const monthDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth));
        const end = endOfWeek(endOfMonth(currentMonth));
        const days: Date[] = [];
        let day = start;
        while (day <= end) {
            days.push(day);
            day = addDays(day, 1);
        }
        return days;
    }, [currentMonth]);

    // Today's holiday if any
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayHoliday = useMemo(() => {
        return calendarData.find(d => d.date === todayStr);
    }, [calendarData, todayStr]);

    // Map of 'MMM dd' -> number of events (used for badges)
    const eventMap = useMemo(() => {
        const map = new Map<string, number>();
        const all = [...(events.birthdays || []), ...(events.anniversaries || []), ...(events.joiners || [])];
        all.forEach((e) => {
            let key = e.date;
            try {
                const d = new Date(e.date);
                if (!isNaN(d.getTime())) {
                    key = format(d, 'MMM dd');
                }
            } catch (err) { }
            const count = map.get(key) || 0;
            map.set(key, count + 1);
        });
        return map;
    }, [events]);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedDateEvents, setSelectedDateEvents] = useState<PersonEvent[]>([]);
    const [selectedDateLabel, setSelectedDateLabel] = useState<string>('');

    const monthEventMap = useMemo(() => {
        const all: PersonEvent[] = [
            ...(events?.birthdays || []),
            ...(events?.anniversaries || []),
            ...(events?.joiners || [])
        ];
        const year = currentMonth.getFullYear();
        const first = startOfMonth(currentMonth).getTime();
        const last = endOfMonth(currentMonth).getTime();

        const map = new Map<string, PersonEvent[]>();

        all.forEach((e) => {
            let parsed: Date | null = null;
            const tryIso = new Date(e.date);
            if (!isNaN(tryIso.getTime()) && tryIso.getFullYear() >= 1970) {
                parsed = tryIso;
            } else {
                const tryStr = `${e.date} ${year}`;
                const tryDate = new Date(tryStr);
                if (!isNaN(tryDate.getTime())) parsed = tryDate;
            }

            if (parsed) {
                const t = parsed.getTime();
                if (t >= first && t <= last) {
                    const key = format(parsed, 'yyyy-MM-dd');
                    const arr = map.get(key) || [];
                    arr.push(e);
                    map.set(key, arr);
                }
            }
        });

        return map;
    }, [currentMonth, events]);

    const prevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
    const nextMonth = () => setCurrentMonth((m) => addMonths(m, 1));

    // Current Week Days for Activity section
    const currentWeekDays = useMemo(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();

        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dateStr = format(d, 'yyyy-MM-dd');

            const holidayInfo = calendarData.find(cd => cd.date === dateStr);
            const isHoliday = holidayInfo?.holiday_name ? true : false;
            const isSunday = d.getDay() === 0;
            const isSaturday = d.getDay() === 6;
            const isToday = isSameDay(d, new Date());
            const isPast = d < new Date() && !isToday;
            const isFuture = d > new Date();

            let status: 'weekday' | 'weekend' | 'holiday' | 'today' = 'weekday';
            if (isSunday || isHoliday) {
                status = 'holiday';
            }

            days.push({
                day: format(d, 'EEE'),
                dayLetter: format(d, 'EEEEE'),
                date: format(d, 'd'),
                fullDate: format(d, 'MMM dd'),
                dateStr,
                status,
                isToday,
                isPast,
                isFuture,
                isSunday,
                isSaturday,
                isHoliday,
                holidayName: holidayInfo?.holiday_name || null
            });
        }
        return days;
    }, [calendarData]);

    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                    "h-full overflow-hidden flex flex-col",
                    "dashboard-card p-0",
                    "bg-white/95 dark:bg-gray-900/95",
                    "border border-gray-100 dark:border-gray-800/80",
                    className
                )}
            >
                {/* Date Header */}
                <div className="p-5 bg-gradient-to-r from-gray-50/80 to-transparent dark:from-gray-800/30 border-b border-gray-100 dark:border-gray-800/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="p-3 bg-primary/10 dark:bg-primary/20 rounded-xl"
                            >
                                <CalendarIcon size={22} className="text-primary" />
                            </motion.div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">Live Schedule</span>
                                <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{format(new Date(), 'EEEE')}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1 uppercase tracking-tight">{format(new Date(), 'MMMM dd, yyyy')}</p>
                            </div>
                        </div>
                    </div>

                    <AnimatePresence>
                        {todayHoliday && todayHoliday.holiday_name && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-4 p-3 rounded-xl bg-fuchsia-50 dark:bg-fuchsia-500/10 border border-fuchsia-200/50 dark:border-fuchsia-500/20 flex items-center gap-3"
                            >
                                <div className="p-2 bg-fuchsia-500 rounded-lg text-white shadow-lg shadow-violet-500/30">
                                    <Building size={14} />
                                </div>
                                <span className="text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400 uppercase tracking-tight">
                                    {todayHoliday.holiday_name}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="p-5 space-y-6 flex-1 dashboard-scrollable">
                    {/* Announcements Section */}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Announcements</p>
                        </div>

                        {announcements.length === 0 ? (
                            <div className="py-6 text-center bg-gray-50/80 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700/50">
                                <Megaphone size={20} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-400 font-medium">No Broadcasts</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {announcements.slice(0, 2).map((a, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.08 }}
                                        key={a.id}
                                        whileHover={{ scale: 1.01, x: 4 }}
                                        className={cn(
                                            "p-3.5 rounded-xl",
                                            "bg-gray-50/80 dark:bg-gray-800/40",
                                            "border border-transparent hover:border-primary/20",
                                            "transition-all cursor-default group"
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-3 mb-1">
                                            <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tight line-clamp-1 group-hover:text-primary transition-colors">{a.title}</p>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded-full flex-shrink-0">{format(new Date(a.created_at || new Date()), 'MMM dd')}</p>
                                        </div>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed line-clamp-1">
                                            {a.message}
                                        </p>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Current Week Activity */}
                    <div className="mt-auto">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="h-1.5 w-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">This Week</p>
                        </div>
                        <div className="grid grid-cols-7 gap-1.5">
                            {currentWeekDays.map((day, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    title={day.isHoliday ? day.holidayName || 'Holiday' : day.isSunday ? 'Sunday' : day.day}
                                    className={cn(
                                        'p-2 rounded-lg flex flex-col items-center justify-center transition-all border relative',
                                        day.isToday && 'ring-2 ring-primary ring-offset-1 bg-primary/10 border-primary/30',
                                        (day.isSunday || day.isHoliday) && !day.isToday && 'bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 border-red-200/50 dark:border-red-500/20',
                                        !day.isSunday && !day.isHoliday && !day.isToday && 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-500/20',
                                        day.isFuture && 'opacity-60'
                                    )}
                                >
                                    <p className={cn(
                                        'text-[8px] font-bold uppercase tracking-tighter mb-0.5',
                                        (day.isSunday || day.isHoliday) ? 'text-red-400' : day.isToday ? 'text-primary' : 'text-purple-500'
                                    )}>
                                        {day.dayLetter}
                                    </p>
                                    <p className={cn(
                                        'text-[11px] font-bold tracking-tighter',
                                        day.isToday && 'text-primary'
                                    )}>
                                        {day.date}
                                    </p>
                                    {day.isHoliday && (
                                        <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                                    )}
                                </motion.div>
                            ))}
                        </div>
                        {/* Legend */}
                        <div className="flex items-center justify-center gap-4 mt-3 text-[9px] text-gray-400">
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                <span>Weekday</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                <span>Holiday/Sunday</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
                "h-full flex flex-col",
                "dashboard-card p-0 overflow-hidden",
                "bg-white/95 dark:bg-gray-900/95",
                "border border-gray-100 dark:border-gray-800/80",
                className
            )}
        >
            <div className="p-5 bg-gradient-to-r from-gray-50/80 to-transparent dark:from-gray-800/30 border-b border-gray-100 dark:border-gray-800/50">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{format(currentMonth, 'MMMM')}</h3>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider mt-1">{format(currentMonth, 'yyyy')}</p>
                    </div>
                    <div className="flex items-center bg-gray-100 dark:bg-gray-800/50 p-1 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={prevMonth}
                            className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700/50 transition-all"
                        >
                            <ChevronLeft size={14} className="text-gray-600 dark:text-gray-400" />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={nextMonth}
                            className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700/50 transition-all"
                        >
                            <ChevronRight size={14} className="text-gray-600 dark:text-gray-400" />
                        </motion.button>
                    </div>
                </div>
            </div>

            <div className="p-5 flex-1">
                <div className="grid grid-cols-7 gap-2 text-[10px] text-center mb-4 font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                        <div key={d}>{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                    {monthDays.map((day, index) => {
                        const label = format(day, 'd');
                        const isoKey = format(day, 'yyyy-MM-dd');
                        const eventKey = format(day, 'MMM dd');
                        const count = eventMap.get(eventKey) || 0;
                        const outOfMonth = !isSameMonth(day, currentMonth);
                        const today = isSameDay(day, new Date());
                        const dayEvents = monthEventMap.get(isoKey) || [];

                        return (
                            <motion.div
                                key={day.toISOString()}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.005 }}
                                whileHover={{ scale: 1.1 }}
                                onClick={() => {
                                    if (dayEvents.length > 0) {
                                        setSelectedDateEvents(dayEvents);
                                        setSelectedDateLabel(format(day, 'MMMM dd, yyyy'));
                                        setDialogOpen(true);
                                    }
                                }}
                                className={cn(
                                    "aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all relative group",
                                    today ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110 z-10" :
                                        outOfMonth ? "opacity-20 pointer-events-none" :
                                            "bg-gray-50/80 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/30 hover:bg-white dark:hover:bg-gray-800/50 hover:border-primary/30"
                                )}
                            >
                                <span className="text-xs font-bold">{label}</span>
                                {count > 0 && (
                                    <div className={cn(
                                        "absolute top-1 right-1 w-1.5 h-1.5 rounded-full",
                                        today ? "bg-white" : "bg-primary"
                                    )} />
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6 bg-white dark:bg-gray-900">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold tracking-tight text-center mb-4">{selectedDateLabel}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-4">
                        {selectedDateEvents.map((ev: any, idx) => (
                            <motion.div
                                key={ev.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={cn(
                                    "p-4 rounded-xl flex items-center justify-between group",
                                    "bg-gray-50 dark:bg-gray-800/50",
                                    "border border-gray-100 dark:border-gray-700/50",
                                    "hover:border-primary/30 transition-all"
                                )}
                            >
                                <div className="flex flex-col">
                                    <p className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-tight">{ev.name}</p>
                                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-1">{ev.date}</p>
                                </div>
                                <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-xl text-primary transition-transform group-hover:rotate-12">
                                    <Megaphone size={16} />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
};

export default CalendarCard;
