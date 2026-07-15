import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { aiService } from '@/services/ai.service';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { PageTransition } from '@/components/ui/PageTransition';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Users, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const severityConfig: Record<string, { color: string; icon: React.ElementType }> = {
  low: { color: 'bg-success-100 text-success-700', icon: Lightbulb },
  medium: { color: 'bg-amber-100 text-amber-700', icon: TrendingUp },
  high: { color: 'bg-coral-100 text-coral-700', icon: AlertTriangle },
  critical: { color: 'bg-error-100 text-error-600', icon: AlertTriangle },
};

export const AIInsightsPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: insights, isLoading } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: () => aiService.getInsights().then(r => r.data),
  });

  return (
    <DashboardLayout title={t('ai.title')}>
      <PageTransition>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-brand-500 to-teal-500">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{t('ai.aiPoweredInsights')}</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {t('ai.subtitle')}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {insights?.map((insight, idx) => {
                const config = severityConfig[insight.severity] || severityConfig.low;
                const Icon = config.icon;
                return (
                  <Card key={idx} padding="lg" className="relative overflow-hidden">
                    <div className="flex items-start gap-4">
                      <div className={cn('p-3 rounded-xl shrink-0', config.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-neutral-900 dark:text-white">{insight.title}</h3>
                          <span className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                            config.color
                          )}>
                            {insight.confidence}{t('ai.confidence')}
                          </span>
                          {insight.affected_count && (
                            <span className="flex items-center gap-1 text-xs text-neutral-400">
                              <Users size={12} /> {insight.affected_count} {t('ai.affected')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">{insight.description}</p>
                        {insight.recommendation && (
                          <div className="flex items-start gap-2 p-3 rounded-xl bg-brand-50 dark:bg-brand-900/10 text-sm">
                            <Lightbulb className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                            <span className="text-neutral-700 dark:text-neutral-300">{insight.recommendation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
              {(!insights || insights.length === 0) && (
                <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
                  <Brain className="w-16 h-16 mb-4 opacity-30" />
                  <p className="font-medium text-lg">No insights available yet</p>
                  <p className="text-sm">AI insights will appear as your organization grows</p>
                </div>
              )}
            </div>
          )}
        </div>
      </PageTransition>
    </DashboardLayout>
  );
};
