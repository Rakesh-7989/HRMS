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
  color: string;
}

const QUICK_ACTIONS: QuickActionItem[] = [
  { label: 'New Employee', description: 'Onboard a new team member', icon: UserPlus, path: '/employees/new', color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' },
  { label: 'Mark Attendance', description: 'Record today\'s attendance', icon: Clock, path: '/attendance', color: 'text-green-500 bg-green-50 dark:bg-green-500/10' },
  { label: 'Create Event', description: 'Schedule a company event', icon: CalendarPlus, path: '/calendar/new', color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10' },
  { label: 'Generate Report', description: 'Export HR analytics report', icon: FileText, path: '/reports', color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' },
];

interface QuickActionsProps {
  className?: string;
  actions?: QuickActionItem[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({ className, actions = QUICK_ACTIONS }) => {
  const navigate = useNavigate();

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-start gap-2 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-primary/30 hover:shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all text-left group"
            >
              <div className={cn('p-2 rounded-lg', action.color)}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                  {action.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {action.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => navigate('/activity')}
        className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-primary py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <span>View all actions</span>
        <ArrowRight size={12} />
      </button>
    </Card>
  );
};
