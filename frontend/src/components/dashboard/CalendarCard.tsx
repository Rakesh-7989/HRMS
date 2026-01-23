import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Megaphone } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, subMonths, addMonths } from 'date-fns';
import { PeopleEventsResponse, PersonEvent, eventsService } from '@/services/events.service';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

type Announcement = { id: string | number; title: string; date?: string };
type PastDay = { day: string; date: string; status?: string };

type Props = {
  events?: PeopleEventsResponse;
  className?: string;
  announcements?: Announcement[];
  past7Days?: PastDay[];
  compact?: boolean;
};

const CalendarCard: React.FC<Props> = ({ events = {}, className = '', announcements = [], past7Days = [], compact = true }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

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

  // Map of 'MMM dd' -> number of events (used for badges)
  const eventMap = useMemo(() => {
    const map = new Map<string, number>();
    const all = [...(events.birthdays || []), ...(events.anniversaries || []), ...(events.joiners || [])];
    all.forEach((e) => {
      // event.date can be 'Jan 02' or ISO - we'll try to normalize by formatting
      let key = e.date;
      // if it's ISO-like, try to parse it
      try {
        const d = new Date(e.date);
        if (!isNaN(d.getTime())) {
          key = format(d, 'MMM dd');
        }
      } catch (err) {
        // ignore
      }
      const count = map.get(key) || 0;
      map.set(key, count + 1);
    });
    return map;
  }, [events]);

  // Build a detailed map for the currently visible month: 'yyyy-MM-dd' -> PersonEvent[]
  const [monthEventMap, setMonthEventMap] = React.useState<Map<string, PersonEvent[]>>(new Map());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedDateEvents, setSelectedDateEvents] = React.useState<PersonEvent[]>([]);
  const [selectedDateLabel, setSelectedDateLabel] = React.useState<string>('');

  const buildMonthMap = async (monthDate: Date) => {
    // Use provided events if available; else fetch
    let all: PersonEvent[] = [...(events.birthdays || []), ...(events.anniversaries || []), ...(events.joiners || [])];
    if (all.length === 0) {
      try {
        const res = await eventsService.getPeopleEvents();
        all = [...(res.birthdays || []), ...(res.anniversaries || []), ...(res.joiners || [])];
      } catch (err) {
        // ignore fetch errors; leave all empty
      }
    }

    const year = monthDate.getFullYear();
    const first = startOfMonth(monthDate).getTime();
    const last = endOfMonth(monthDate).getTime();

    const map = new Map<string, PersonEvent[]>();

    all.forEach((e) => {
      // Try ISO parse
      let parsed: Date | null = null;
      const tryIso = new Date(e.date);
      if (!isNaN(tryIso.getTime()) && tryIso.getFullYear() >= 1970) {
        parsed = tryIso;
      } else {
        // Try 'MMM dd' (no year) by attaching current year
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

    setMonthEventMap(map);
  };

  React.useEffect(() => {
    buildMonthMap(currentMonth);
  }, [currentMonth, events]);

  const prevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const nextMonth = () => setCurrentMonth((m) => addMonths(m, 1));

  if (compact) {
    return (
      <Card className={className + ' h-full'}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <CalendarIcon size={22} className="text-primary" />
            <div>
              <p className="font-semibold">{format(new Date(), 'EEEE')}</p>
              <p className="text-sm text-muted">{format(new Date(), 'MMMM dd, yyyy')}</p>
            </div>
          </div>
          <div className="text-xs text-muted">Today</div>
        </div>

        <div className="h-px bg-white/5 mb-3" />

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="w-6 h-6 text-primary" />
            <p className="text-sm font-bold">Announcements</p>
          </div>

          {announcements.length === 0 ? (
            <p className="text-xs text-muted">No announcements</p>
          ) : (
            <div className="space-y-2">
              {announcements.map((a) => (
                <div key={a.id} className="p-2 rounded bg-white/5 text-sm">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted">{(() => {
                    try {
                      const d = new Date(a.date || '');
                      if (!isNaN(d.getTime())) return format(d, 'MMM dd, yyyy');
                    } catch (err) {}
                    return a.date || '';
                  })()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {past7Days && past7Days.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">Past 7 Days</p>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 text-center text-xs">
              {past7Days.map((day, index) => (
                <div
                  key={index}
                  className={
                    'p-2 rounded ' +
                    (day.status === 'Present'
                      ? 'bg-green-500/20 text-green-600'
                      : day.status === 'Late'
                      ? 'bg-yellow-500/20 text-yellow-600'
                      : day.status === 'Absent'
                      ? 'bg-red-500/20 text-red-600'
                      : 'bg-white/10 text-muted')
                  }
                >
                  <p className="font-medium">{day.day}</p>
                  <p className="text-[11px] opacity-80">{day.date}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className={className + ' h-full flex flex-col'}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <CalendarIcon size={18} className="text-primary" />
          <div>
            <p className="font-semibold">{format(currentMonth, 'MMMM yyyy')}</p>
            <p className="text-xs text-muted">{format(new Date(), 'EEEE, MMM dd')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-white/5">
            <ChevronLeft size={16} />
          </button>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-white/5">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs text-center mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="font-medium text-muted">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 flex-1">
        {monthDays.map((day) => {
          const label = format(day, 'd');
          const isoKey = format(day, 'yyyy-MM-dd');
          const eventKey = format(day, 'MMM dd');
          const count = eventMap.get(eventKey) || 0;
          const outOfMonth = !isSameMonth(day, currentMonth);
          const today = isSameDay(day, new Date());
          const dayEvents = monthEventMap.get(isoKey) || [];
          const title = dayEvents.length > 0 ? dayEvents.map((ev) => ev.name).join(', ') : undefined;

          return (
            <div
              key={day.toISOString()}
              title={title}
              onClick={() => {
                if (dayEvents.length > 0) {
                  setSelectedDateEvents(dayEvents);
                  setSelectedDateLabel(format(day, 'MMMM dd, yyyy'));
                  setDialogOpen(true);
                }
              }}
              className={`p-2 rounded text-sm text-left cursor-pointer ${outOfMonth ? 'text-muted opacity-50' : ''}`}
            >
              <div className={`flex items-start justify-between`}> 
                <div className={`w-6 h-6 grid place-items-center rounded-full ${today ? 'bg-primary text-white' : ''}`}>{label}</div>
                {count > 0 && <div className="text-[11px] bg-primary/10 rounded px-2 py-0.5 font-medium">{count}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDateLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {selectedDateEvents.map((ev) => (
              <div key={ev.id} className="p-2 rounded bg-white/5">
                <p className="font-medium">{ev.name}</p>
                <p className="text-xs text-muted">{ev.date}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CalendarCard;
