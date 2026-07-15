import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { performanceService } from '@/services/performance.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/ui/PageTransition';
import { Target, Plus, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const goalStatusConfig: Record<string, { labelKey: string; color: string }> = {
  NOT_STARTED: { labelKey: 'performance.notStarted', color: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400' },
  IN_PROGRESS: { labelKey: 'performance.inProgress', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  ACHIEVED: { labelKey: 'performance.achieved', color: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400' },
  CANCELLED: { labelKey: 'performance.cancelled', color: 'bg-error-100 dark:bg-error-900/30 text-error-500 dark:text-error-400' },
};

const categoryConfig: Record<string, { labelKey: string; color: string }> = {
  KPI: { labelKey: 'performance.kpi', color: 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400' },
  OKR: { labelKey: 'performance.okr', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' },
  DEVELOPMENT: { labelKey: 'performance.development', color: 'bg-coral-100 dark:bg-coral-900/30 text-coral-600 dark:text-coral-400' },
  PROJECT: { labelKey: 'performance.project', color: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400' },
};

export const GoalsContent: React.FC = () => {
  const { t } = useTranslation();
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
             <Button variant="ghost" 
              onClick={() => setView('mine')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                view === 'mine' ? 'bg-white dark:bg-neutral-900 text-brand-600 dark:text-brand-400 shadow-elev-1' : 'text-neutral-500 dark:text-neutral-400'
              )}
            >
              {t('performance.myGoals')}
            </Button>
             <Button variant="ghost" 
              onClick={() => setView('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                view === 'all' ? 'bg-white dark:bg-neutral-900 text-brand-600 dark:text-brand-400 shadow-elev-1' : 'text-neutral-500 dark:text-neutral-400'
              )}
            >
              {t('performance.allGoals')}
            </Button>
          </div>
          <Button size="sm" className="gap-2">
            <Plus size={16} />
            {t('performance.newGoal')}
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
                    {t(categoryConfig[goal.category]?.labelKey || 'performance.kpi')}
                  </span>
                  <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', goalStatusConfig[goal.status]?.color)}>
                    {t(goalStatusConfig[goal.status]?.labelKey || 'performance.notStarted')}
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
              <p className="font-medium">{t('performance.noGoalsYet')}</p>
              <p className="text-sm">{t('performance.setFirstGoal')}</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};
