import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useNavigate } from 'react-router-dom';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  category?: string;
  onSelect: () => void;
  shortcut?: string;
}

interface CommandGroup {
  label: string;
  items: CommandItem[];
}

interface CommandPaletteProps {
  groups: CommandGroup[];
  recentItems?: CommandItem[];
  placeholder?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  groups,
  recentItems,
  placeholder = 'Search commands...',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allItems = groups.flatMap(g => g.items);
  const filtered = allItems.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.description?.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].onSelect();
      setOpen(false);
    }
  }, [filtered, selectedIndex]);

  const recent = recentItems?.slice(0, 5);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-0 flex items-start justify-center z-50 pt-[15vh]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-xl shadow-elev-6 border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-800">
                <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className="flex-1 py-3.5 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border-0 outline-none focus:ring-0"
                />
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-mono">
                  ESC
                </kbd>
              </div>

              <div className="max-h-80 overflow-y-auto p-2">
                {!query && recent && recent.length > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Recent
                    </div>
                    {recent.map(item => (
                      <CommandItemRow
                        key={item.id}
                        item={item}
                        selected={false}
                        onSelect={() => { item.onSelect(); setOpen(false); }}
                      />
                    ))}
                  </div>
                )}

                {query ? (
                  filtered.length > 0 ? (
                    filtered.map((item, idx) => (
                      <CommandItemRow
                        key={item.id}
                        item={item}
                        selected={idx === selectedIndex}
                        onSelect={() => { item.onSelect(); setOpen(false); }}
                      />
                    ))
                  ) : (
                    <div className="px-2 py-8 text-center text-sm text-gray-400">
                      No results for &ldquo;{query}&rdquo;
                    </div>
                  )
                ) : (
                  groups.map(group => (
                    <div key={group.label} className="mb-2">
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {group.label}
                      </div>
                      {group.items.map(item => (
                        <CommandItemRow
                          key={item.id}
                          item={item}
                          selected={false}
                          onSelect={() => { item.onSelect(); setOpen(false); }}
                        />
                      ))}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

const CommandItemRow: React.FC<{
  item: CommandItem;
  selected: boolean;
  onSelect: () => void;
}> = ({ item, selected, onSelect }) => (
   <Button variant="ghost" 
    onClick={onSelect}
    className={cn(
      'w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm text-left transition-colors',
      selected
        ? 'bg-brand-50/800 dark:bg-brand-500-900/30 text-brand-500-600 dark:text-brand-500-300'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
    )}
  >
    {item.icon && (
      <span className="w-5 h-5 flex items-center justify-center text-gray-400">
        {item.icon}
      </span>
    )}
    <div className="flex-1 min-w-0">
      <div className="font-medium truncate">{item.label}</div>
      {item.description && (
        <div className="text-xs text-gray-400 truncate">{item.description}</div>
      )}
    </div>
    {item.shortcut && (
      <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-mono">
        {item.shortcut}
      </kbd>
    )}
  </Button>
);

export const createCommandItems = (
  navigate: ReturnType<typeof useNavigate>,
  routes: Record<string, string>,
  extra?: CommandItem[]
): CommandGroup[] => [
  {
    label: 'Navigation',
    items: [
      { id: 'nav-home', label: 'Home', description: 'Go to home page', icon: null, onSelect: () => navigate('/') },
      { id: 'nav-dashboard', label: 'Dashboard', description: 'View your dashboard', icon: null, onSelect: () => navigate(routes.DASHBOARD) },
      ...extra ?? [],
    ].map((item, i) => ({ ...item, id: item.id || `cmd-${i}` })),
  },
];
