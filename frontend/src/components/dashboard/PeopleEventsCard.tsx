import React from 'react';
import { motion } from 'framer-motion';
import { Cake, Gift, UserPlus } from 'lucide-react';
import { cn } from '@/utils/cn';
import './dashboard.css';

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
  const parseDate = (dateStr: string): Date | null => {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return null;
  };

  const processList = (list: Person[], count: number) => {
    return list.map(n => ({ ...n, parsedDate: parseDate(n.date) }))
      .sort((a, b) => {
        if (!a.parsedDate || !b.parsedDate) return 0;
        return b.parsedDate.getTime() - a.parsedDate.getTime();
      })
      .slice(0, count);
  };

  const processedBirthdays = processList(birthdays, 4);
  const processedAnniversaries = processList(anniversaries, 4);
  const processedJoiners = processList(newJoiners, 4);

  const Section = ({ title, icon: Icon, accentColor, items, emptyText }: { title: string; icon: React.ComponentType<{ size?: number | string; className?: string }>; accentColor: { headerBg: string; text: string; iconBg: string; avatarBg: string; badgeBorder: string; emptyBg: string }; items: Person[]; emptyText: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "dashboard-card flex-1 p-0 overflow-hidden flex flex-col h-full",
        "bg-white/90 dark:bg-gray-900/90",
        "border border-gray-100 dark:border-gray-800/80"
      )}
    >
      {/* Header */}
      <div className={cn(
        "px-4 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50",
        accentColor.headerBg
      )}>
        <div className="flex items-center gap-2.5">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              accentColor.iconBg
            )}
          >
            <Icon size={16} className={accentColor.text} />
          </motion.div>
          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
            {title}
          </span>
        </div>
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            "bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm",
            "border",
            accentColor.badgeBorder,
            accentColor.text
          )}
        >
          {items.length}
        </motion.span>
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col min-h-[160px] dashboard-scrollable">
        {items.length > 0 ? (
          <motion.div
            className="space-y-1.5"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
            }}
          >
            {items.map((person: Person) => (
              <motion.div
                key={person.id}
                variants={{
                  hidden: { opacity: 0, x: -10 },
                  visible: { opacity: 1, x: 0 }
                }}
                whileHover={{ x: 4, scale: 1.01 }}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl",
                  "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                  "border border-transparent hover:border-gray-100 dark:hover:border-gray-700/50",
                  "transition-all duration-200 group cursor-default"
                )}
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center",
                    "text-xs font-bold shadow-elev-1",
                    accentColor.avatarBg,
                    accentColor.text
                  )}
                >
                  {person.name?.charAt(0)?.toUpperCase()}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-brand-500 transition-colors">
                    {person.name}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                    {person.date}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center mb-3",
                "opacity-60",
                accentColor.emptyBg
              )}
            >
              <Icon size={24} className={cn(accentColor.text, "opacity-60")} />
            </motion.div>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              {emptyText}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className={cn(className, "grid grid-cols-1 md:grid-cols-3 gap-4 h-full")}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="dashboard-card p-4 flex flex-col h-full min-h-[200px]"
          >
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="w-8 h-8 rounded-lg dashboard-skeleton" />
              <div className="h-4 w-20 dashboard-skeleton rounded" />
            </div>
            <div className="flex-1 space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl dashboard-skeleton" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 dashboard-skeleton rounded w-3/4" />
                    <div className="h-2.5 dashboard-skeleton rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn(className, "grid grid-cols-1 md:grid-cols-3 gap-4 h-full")}>
      <Section
        title="Birthdays"
        icon={Cake}
        accentColor={{
          headerBg: 'bg-gradient-to-r from-pink-50/80 to-transparent dark:from-pink-500/5',
          text: 'text-pink-500 dark:text-pink-400',
          iconBg: 'bg-pink-100 dark:bg-pink-500/20',
          avatarBg: 'bg-gradient-to-br from-pink-100 to-pink-50 dark:from-pink-500/20 dark:to-pink-500/10',
          badgeBorder: 'border-pink-200 dark:border-pink-500/30',
          emptyBg: 'bg-pink-50 dark:bg-pink-500/10',
        }}
        items={processedBirthdays}
        emptyText="No Birthdays"
      />
      <Section
        title="Anniversaries"
        icon={Gift}
        accentColor={{
          headerBg: 'bg-gradient-to-r from-amber-50/80 to-transparent dark:from-amber-500/5',
          text: 'text-coral-500 dark:text-coral-400',
          iconBg: 'bg-coral-100 dark:bg-coral-500/20',
          avatarBg: 'bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-500/20 dark:to-violet-500/10',
          badgeBorder: 'border-coral-200 dark:border-coral-500/30',
          emptyBg: 'bg-coral-50 dark:bg-coral-500/10',
        }}
        items={processedAnniversaries}
        emptyText="No Anniversaries"
      />
      <Section
        title="New Joiners"
        icon={UserPlus}
        accentColor={{
          headerBg: 'bg-gradient-to-r from-blue-50/80 to-transparent dark:from-blue-500/5',
          text: 'text-brand-500 dark:text-brand-400',
          iconBg: 'bg-brand-100 dark:bg-brand-500/20',
          avatarBg: 'bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-500/20 dark:to-blue-500/10',
          badgeBorder: 'border-brand-200 dark:border-brand-500/30',
          emptyBg: 'bg-brand-50 dark:bg-brand-500/10',
        }}
        items={processedJoiners}
        emptyText="No New Joiners"
      />
    </div>
  );
};

export default PeopleEventsCard;
