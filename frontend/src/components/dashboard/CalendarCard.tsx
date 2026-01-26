import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Megaphone, Building } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, subMonths, addMonths, subDays } from 'date-fns';
import { PeopleEventsResponse, PersonEvent } from '@/services/events.service';
import { calendarService } from '@/services/calendar.service';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  events?: PeopleEventsResponse;
  className?: string;
  compact?: boolean;
};

const CalendarCard: React.FC<Props> = ({ events = {}, className = '', compact = true }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Fetch dynamic calendar data for the current month
  const month = currentMonth.getMonth() + 1;
  const year = currentMonth.getFullYear();

  const { data: calendarData = [] } = useQuery({
    queryKey: ['calendar', month, year],
    queryFn: () => calendarService.getCalendar(month, year),
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['corporate-announcements'],
    queryFn: () => calendarService.getAnnouncements(),
  });

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

  // Past 7 Days Attendance (Mock for UI)
  const past7Days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), 6 - i);
      return {
        day: format(d, 'EEE'),
        date: format(d, 'MMM dd'),
        status: d.getDay() === 0 ? 'Weekend' : ['Present', 'Late', 'Present', 'Present', 'Late'][i % 5]
      };
    });
  }, []);

  if (compact) {
    return (
      <Card className={cn("h-full border-none shadow-2xl bg-white dark:bg-[#111] overflow-hidden rounded-[2.5rem] p-0 flex flex-col", className)}>
        {/* Date Header */}
        <div className="p-6 bg-gray-50 dark:bg-white/[0.02] border-b border-light-border dark:border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <CalendarIcon size={24} className="text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">Live Schedule</span>
                <p className="text-xl font-bold text-gray-900 dark:text-white leading-none">{format(new Date(), 'EEEE')}</p>
                <p className="text-xs text-muted font-bold mt-1 text-gray-500 uppercase tracking-tight">{format(new Date(), 'MMMM dd, yyyy')}</p>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {todayHoliday && todayHoliday.holiday_name && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-500/30">
                    <Building size={14} />
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tight">
                    {todayHoliday.holiday_name}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 space-y-8 flex-1">
          {/* Announcements Section */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-4 bg-primary rounded-full" />
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Announcements</p>
              </div>
            </div>

            {announcements.length === 0 ? (
              <div className="py-8 text-center bg-gray-50 dark:bg-white/[0.01] rounded-[2rem] border border-dashed border-light-border dark:border-white/5">
                <p className="text-xs text-muted font-bold uppercase tracking-wider opacity-40">No Broadcasts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.slice(0, 2).map((a, i) => (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={a.id}
                    className="p-4 rounded-[1.5rem] bg-white dark:bg-white/[0.03] border border-light-border dark:border-white/5 hover:border-primary/20 hover:shadow-lg transition-all cursor-default group"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tight line-clamp-1 group-hover:text-primary transition-colors">{a.title}</p>
                      <p className="text-[9px] text-muted font-bold uppercase tracking-wider bg-gray-100 dark:bg-black/20 px-2 py-0.5 rounded-full">{format(new Date(a.created_at), 'MMM dd')}</p>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed italic line-clamp-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {a.message}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Past 7 Days Attendance */}
          <div className="mt-auto">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-4 bg-gray-200 dark:bg-gray-800 rounded-full" />
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Activity</p>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {past7Days.map((day, index) => (
                <div
                  key={index}
                  className={cn(
                    'p-2 rounded-xl flex flex-col items-center justify-center transition-all border outline outline-4 outline-transparent',
                    day.status === 'Present' ? 'bg-green-500/5 text-green-600 dark:text-green-400 border-green-500/10' :
                      day.status === 'Late' ? 'bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/10' :
                        'bg-gray-50 dark:bg-white/[0.02] text-gray-300 dark:text-gray-700 border-transparent'
                  )}
                >
                  <p className="text-[8px] font-bold uppercase tracking-tighter mb-1 opacity-50">{day.day[0]}</p>
                  <p className="text-[12px] font-bold tracking-tighter">{day.date.split(' ')[1]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn(className, "h-full flex flex-col border-none shadow-2xl bg-white dark:bg-[#111] overflow-hidden rounded-[2.5rem] p-0")}>
      <div className="p-6 bg-gray-50 dark:bg-white/[0.02] border-b border-light-border dark:border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{format(currentMonth, 'MMMM')}</h3>
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mt-1">{format(currentMonth, 'yyyy')}</p>
          </div>
          <div className="flex items-center bg-white dark:bg-black/20 p-1 rounded-2xl border border-light-border dark:border-white/5 shadow-sm">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all active:scale-95">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all active:scale-95">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 flex-1">
        <div className="grid grid-cols-7 gap-2 text-[10px] text-center mb-6 font-bold text-gray-300 dark:text-gray-700 uppercase tracking-widest">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3">
          {monthDays.map((day) => {
            const label = format(day, 'd');
            const isoKey = format(day, 'yyyy-MM-dd');
            const eventKey = format(day, 'MMM dd');
            const count = eventMap.get(eventKey) || 0;
            const outOfMonth = !isSameMonth(day, currentMonth);
            const today = isSameDay(day, new Date());
            const dayEvents = monthEventMap.get(isoKey) || [];

            return (
              <div
                key={day.toISOString()}
                onClick={() => {
                  if (dayEvents.length > 0) {
                    setSelectedDateEvents(dayEvents);
                    setSelectedDateLabel(format(day, 'MMMM dd, yyyy'));
                    setDialogOpen(true);
                  }
                }}
                className={cn(
                  "aspect-square rounded-[1.2rem] flex flex-col items-center justify-center cursor-pointer transition-all relative group shadow-sm",
                  today ? "bg-primary text-white shadow-xl shadow-primary/30 scale-110 z-10" :
                    outOfMonth ? "opacity-10 pointer-events-none" : "bg-gray-50 dark:bg-white/[0.02] border border-light-border dark:border-white/5 hover:bg-white dark:hover:bg-white/5 hover:scale-105"
                )}
              >
                <span className="text-xs font-bold">{label}</span>
                {count > 0 && (
                  <div className={cn(
                    "absolute top-2 right-2 w-1.5 h-1.5 rounded-full",
                    today ? "bg-white" : "bg-primary"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 bg-white dark:bg-[#0f0f0f]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-center mb-4">{selectedDateLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {selectedDateEvents.map((ev: any) => (
              <div key={ev.id} className="p-5 rounded-[1.5rem] bg-gray-50 dark:bg-white/[0.03] border border-light-border dark:border-white/5 flex items-center justify-between group hover:bg-white dark:hover:bg-white/[0.05] transition-all">
                <div className="flex flex-col">
                  <p className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-tight">{ev.name}</p>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider mt-1 opacity-60 leading-none">{ev.date}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-2xl text-primary transition-transform group-hover:rotate-12">
                  <Megaphone size={16} />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CalendarCard;
