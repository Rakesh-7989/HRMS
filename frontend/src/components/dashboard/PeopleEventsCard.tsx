import React, { useState } from 'react';
import { Cake, Gift, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/Card';

type Person = { id: string | number; name: string; date: string; note?: string };

type Props = {
  birthdays?: Person[];
  anniversaries?: Person[];
  newJoiners?: Person[];
  isLoading?: boolean;
  className?: string;
};

const PeopleEventsCard: React.FC<Props> = ({
  birthdays = [],
  anniversaries = [],
  newJoiners = [],
  isLoading = false,
  className = '',
}) => {
  const tabs = [
    { key: 'birthdays', label: 'Birthdays', count: birthdays.length, icon: <Cake size={16} className="text-pink-500" /> },
    { key: 'anniversaries', label: 'Work Anniversaries', count: anniversaries.length, icon: <Gift size={16} className="text-amber-500" /> },
    { key: 'joinees', label: 'New joiners', count: newJoiners.length, icon: <UserPlus size={16} className="text-accent-blue" /> },
  ];

  const [active, setActive] = useState<string>('birthdays');

  const renderList = (items: Person[], section: 'birthdays' | 'anniversaries' | 'joinees' = 'anniversaries', emptyMessage?: string) => {
    if (!items || items.length === 0) {
      const getIcon = () => {
        if (section === 'birthdays') {
          return <Cake size={40} className="opacity-70 text-pink-500" />;
        } else if (section === 'anniversaries') {
          return <Gift size={40} className="opacity-70 text-amber-500" />;
        } else {
          return <UserPlus size={40} className="opacity-70 text-accent-blue" />;
        }
      };

      return (
        <div className="py-6 text-center text-muted">
          <div className="min-h w-35 h-0 rounded-lg bg-white/5 flex items-center justify-center mb-3">
            {getIcon()}
          </div>
          <p className="font-medium">{emptyMessage || `No ${active === 'birthdays' ? 'birthdays' : active === 'anniversaries' ? 'work anniversaries' : 'new joiners'} today.`}</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between p-2 rounded bg-white/5 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                {it.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 1)
                  .join('')}
              </div>
              <div>
                <p className="font-medium">{it.name}</p>
                <p className="text-xs text-muted">{it.date}</p>
              </div>
            </div>
            {it.note && <span className="text-xs text-muted">{it.note}</span>}
          </div>
        ))}
      </div>
    );
  };

  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const parseMonthDay = (dateStr: string): { month: number; day: number } | null => {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return { month: d.getMonth(), day: d.getDate() };
    const m = dateStr.match(/([A-Za-z]+)\s+(\d{1,2})/);
    if (m) {
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const mi = months.indexOf(m[1].toLowerCase().slice(0, 3));
      if (mi >= 0) return { month: mi, day: parseInt(m[2], 10) };
    }
    const iso = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return { month: parseInt(iso[2], 10) - 1, day: parseInt(iso[3], 10) };
    return null;
  };

  const birthdaysToday = birthdays.filter((b) => {
    const md = parseMonthDay(b.date);
    return md && md.month === today.getMonth() && md.day === today.getDate();
  });

  type BirthdayEntry = { b: Person; date: Date };
  const isEntry = (x: BirthdayEntry | null): x is BirthdayEntry => x !== null;

  const upcomingBirthdays = birthdays
    .filter((b) => {
      const md = parseMonthDay(b.date);
      return !(md && md.month === today.getMonth() && md.day === today.getDate());
    })
    .map((b): BirthdayEntry | null => {
      const md = parseMonthDay(b.date);
      if (!md) return null;
      const year =
        md.month > today.getMonth() || (md.month === today.getMonth() && md.day > today.getDate())
          ? today.getFullYear()
          : today.getFullYear() + 1;
      return { b, date: new Date(year, md.month, md.day) };
    })
    .filter(isEntry)
    .sort((a, c) => a.date.getTime() - c.date.getTime())
    .map((x) => x.b);

  // ----- New joiners: robust date comparisons -----
  const parseJoinDate = (dateStr: string): Date | null => {
    // Try ISO / timestamp first
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());

    // Fallback to month/day formats like 'Jan 13'
    const md = parseMonthDay(dateStr);
    if (md) return new Date(today.getFullYear(), md.month, md.day);

    return null;
  };

  // Joiners who joined exactly today
  const joinersToday = newJoiners.filter((n) => {
    const d = parseJoinDate(n.date);
    return d !== null && d.getTime() === todayMid.getTime();
  });

  // Joiners within the last 7 days (excluding today), sorted by most recent first
  const recentJoiners = newJoiners
    .map((n) => {
      const d = parseJoinDate(n.date);
      return { n, d } as { n: Person; d: Date | null };
    })
    .filter((x) => x.d !== null)
    .filter((x) => {
      const diffDays = Math.floor((todayMid.getTime() - (x.d as Date).getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays < 7;
    })
    .sort((a, b) => (b.d as Date).getTime() - (a.d as Date).getTime())
    .map((x) => x.n);

  return (
    <Card className={className}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-t-md text-sm border-b-2 ${active === t.key ? 'border-primary text-primary' : 'border-transparent text-muted'
                  }`}
              >
                {t.icon}
                <span className="font-semibold">{t.count} {t.label}</span>
              </button>
            ))}
          </div>
          <div className="text-xs text-muted">Today</div>
        </div>

        <div className="h-px bg-white/5 mb-3" />

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="py-6 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {active === 'birthdays' && (
                <>
                  <p className="text-sm font-semibold mb-2">Birthdays today</p>
                  {renderList(birthdaysToday, 'birthdays')}

                  <p className="text-sm font-semibold mt-4 mb-2">Upcoming Birthdays</p>
                  {renderList(upcomingBirthdays, 'birthdays', 'No upcoming birthdays.')}
                </>
              )}

              {active === 'anniversaries' && (
                <>
                  <p className="text-sm font-semibold mb-2">Anniversaries today</p>
                  {renderList(anniversaries.filter((a) => a.date === new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' })), 'anniversaries')}

                  <p className="text-sm font-semibold mt-4 mb-2">Upcoming Anniversaries</p>
                  {renderList(anniversaries, 'anniversaries', 'No upcoming anniversaries.')}
                </>
              )}

              {active === 'joinees' && (
                <>
                  <p className="text-sm font-semibold mb-2">New Joiners today</p>
                  {renderList(joinersToday, 'joinees')}

                  <p className="text-sm font-semibold mt-4 mb-2">Recent Joiners</p>
                  {renderList(recentJoiners, 'joinees', 'No recent joiners.')}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default PeopleEventsCard;
