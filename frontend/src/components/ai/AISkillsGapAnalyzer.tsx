import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { aiService, SkillGap } from '@/services/ai.service';
import { Card } from '@/components/ui/Card';
import { PageTransition } from '@/components/common/PageTransition';
import { Brain, Lightbulb, Loader2, Search } from 'lucide-react';
import { cn } from '@/utils/cn';

const priorityConfig: Record<string, { color: string; label: string }> = {
  high: { color: 'bg-error-100 dark:bg-error-900/20 text-error-600 dark:text-error-400', label: 'High Priority' },
  medium: { color: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400', label: 'Medium Priority' },
  low: { color: 'bg-success-100 dark:bg-success-900/20 text-success-700 dark:text-success-400', label: 'Low Priority' },
};

interface AISkillsGapAnalyzerProps {
  employeeId?: string;
}

export const AISkillsGapAnalyzer: React.FC<AISkillsGapAnalyzerProps> = ({ employeeId }) => {
  const [searchId, setSearchId] = useState(employeeId || '');

  const { data: gaps, isLoading } = useQuery({
    queryKey: ['ai-skill-gaps', searchId],
    queryFn: () => aiService.getSkillGaps(searchId).then(r => r.data),
    enabled: !!searchId,
  });

  return (
    <div className="space-y-6">
      {!employeeId && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              placeholder="Enter employee ID to analyze..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : gaps ? (
        <div className="space-y-4">
          {gaps.map((gap) => {
            const maxLevel = Math.max(gap.current_level, gap.required_level, 5);
            const config = priorityConfig[gap.priority] || priorityConfig.low;
            return (
              <Card key={gap.skill} padding="md">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-white">{gap.skill}</h4>
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold mt-1 inline-block', config.color)}>
                      {config.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-400">Gap: <span className="font-bold text-error-500">{gap.gap}</span></p>
                  </div>
                </div>
                <div className="relative h-6 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-brand-500 rounded-full transition-all"
                    style={{ width: `${(gap.current_level / maxLevel) * 100}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 bg-error-400/30 rounded-full border-2 border-error-500 transition-all"
                    style={{ width: `${(gap.required_level / maxLevel) * 100}%` }}
                  />
                  <div className="absolute inset-0 flex items-center px-3 text-[10px] font-bold">
                    <span className="text-white drop-shadow-md">Current: {gap.current_level}</span>
                    <span className="ml-auto text-error-500 drop-shadow-md">Required: {gap.required_level}</span>
                  </div>
                </div>
                {gap.suggestions.length > 0 && (
                  <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-brand-50 dark:bg-brand-900/10">
                    <Lightbulb className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                    <div className="text-xs text-neutral-600 dark:text-neutral-300">
                      <span className="font-bold text-brand-600 dark:text-brand-400">Suggestions:</span>{' '}
                      {gap.suggestions.join(' · ')}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : searchId ? (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
          <Brain className="w-12 h-12 mb-3 opacity-40" />
          <p className="font-medium">No skill gap data found</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
          <Brain className="w-12 h-12 mb-3 opacity-40" />
          <p className="font-medium">Enter an employee ID to analyze skill gaps</p>
        </div>
      )}
    </div>
  );
};
