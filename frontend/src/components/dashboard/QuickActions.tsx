import React from 'react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Clock,
  CalendarPlus,
  FileText,
  ArrowRight,
  LucideIcon,
} from 'lucide-react';

interface QuickActionItem {
  label: string;
  description: string;
  icon: LucideIcon;
  path: string;
  color: 'brand' | 'success' | 'teal' | 'coral' | 'warning';
}

const QUICK_ACTIONS: QuickActionItem[] = [
  { label: 'New Employee', description: 'Onboard a new team member', icon: UserPlus, path: '/employees/new', color: 'brand' },
  { label: 'Mark Attendance', description: 'Record today\'s attendance', icon: Clock, path: '/attendance', color: 'success' },
  { label: 'Create Event', description: 'Schedule a company event', icon: CalendarPlus, path: '/calendar/new', color: 'teal' },
  { label: 'Generate Report', description: 'Export HR analytics report', icon: FileText, path: '/reports', color: 'coral' },
];

const colorStyles: Record<string, { bg: string; text: string }> = {
  brand: { bg: 'bg-brand-100 dark:bg-brand-500/15', text: 'text-brand-600 dark:text-brand-400' },
  success: { bg: 'bg-success-100 dark:bg-success-500/15', text: 'text-success-600 dark:text-success-400' },
  teal: { bg: 'bg-teal-100 dark:bg-teal-500/15', text: 'text-teal-600 dark:text-teal-400' },
  coral: { bg: 'bg-coral-100 dark:bg-coral-500/15', text: 'text-coral-600 dark:text-coral-400' },
  warning: { bg: 'bg-warning-100 dark:bg-warning-500/15', text: 'text-warning-600 dark:text-warning-400' },
};

interface QuickActionsProps {
  className?: string;
  actions?: QuickActionItem[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({ className, actions = QUICK_ACTIONS }) => {
  const navigate = useNavigate();

  return (
    <Card variant="elevated" className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Quick Actions</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const colors = colorStyles[action.color];
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-start gap-2 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-elev-1 hover:bg-brand-50/50 dark:hover:bg-brand-500/5 transition-all text-left group"
            >
              <div className={cn('p-2 rounded-lg', colors.bg, colors.text)}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {action.label}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {action.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => navigate('/activity')}
        className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 py-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
      >
        <span>View all actions</span>
        <ArrowRight size={12} />
      </button>
    </Card>
  );
};
