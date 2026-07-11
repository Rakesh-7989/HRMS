import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceService, Goal } from '@/services/performance.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/common/PageTransition';
import { Target, Plus, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

const goalStatusConfig: Record<string, { label: string; color: string }> = {
  NOT_STARTED: { label: 'Not Started', color: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  ACHIEVED: { label: 'Achieved', color: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400' },
  CANCELLED: { label: 'Cancelled', color: 'bg-error-100 dark:bg-error-900/30 text-error-500 dark:text-error-400' },
};

const categoryConfig: Record<string, { label: string; color: string }> = {
  KPI: { label: 'KPI', color: 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400' },
  OKR: { label: 'OKR', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' },
  DEVELOPMENT: { label: 'Development', color: 'bg-coral-100 dark:bg-coral-900/30 text-coral-600 dark:text-coral-400' },
  PROJECT: { label: 'Project', color: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400' },
};

export const GoalsContent: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'all' | 'mine'>('mine');

  const { data: goals, isLoading } = useQuery({
    queryKey: ['performance-goals', view],
    queryFn: () => view === 'mine'
      ? performanceService.getMyGoals().then(r => r.data)
      : performanceService.getGoals().then(r => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            <button
              onClick={() => setView('mine')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                view === 'mine' ? 'bg-white dark:bg-neutral-900 text-brand-600 dark:text-brand-400 shadow-elev-1' : 'text-neutral-500 dark:text-neutral-400'
              )}
            >
              My Goals
            </button>
            <button
              onClick={() => setView('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                view === 'all' ? 'bg-white dark:bg-neutral-900 text-brand-600 dark:text-brand-400 shadow-elev-1' : 'text-neutral-500 dark:text-neutral-400'
              )}
            >
              All Goals
            </button>
          </div>
          <Button size="sm" className="gap-2">
            <Plus size={16} />
            New Goal
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals?.map(goal => {
            const progress = goal.target_value && goal.current_value !== undefined
              ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
              : 0;
            return (
              <Card key={goal.id} hover padding="lg">
                <div className="flex items-start justify-between mb-3">
                  <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider', categoryConfig[goal.category]?.color)}>
                    {categoryConfig[goal.category]?.label || goal.category}
                  </span>
                  <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', goalStatusConfig[goal.status]?.color)}>
                    {goalStatusConfig[goal.status]?.label || goal.status}
                  </span>
                </div>
                <h3 className="font-bold text-neutral-900 dark:text-white mb-1">{goal.title}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3 line-clamp-2">{goal.description}</p>
                {goal.target_value && goal.current_value !== undefined && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">
                      <span>{goal.current_value} / {goal.target_value}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          progress >= 100 ? 'bg-success-500' : progress >= 50 ? 'bg-brand-500' : 'bg-amber-500'
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-neutral-400 dark:text-neutral-500 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                  {goal.employee && (
                    <span>{goal.employee.first_name} {goal.employee.last_name}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <TrendingUp size={12} />
                    {new Date(goal.start_date).toLocaleDateString()}
                  </span>
                  <span>→</span>
                  <span className="flex items-center gap-1">
                    <TrendingDown size={12} />
                    {new Date(goal.end_date).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            );
          })}
          {(!goals || goals.length === 0) && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500">
              <Target className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-medium">No goals yet</p>
              <p className="text-sm">Set your first goal to start tracking progress</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};
