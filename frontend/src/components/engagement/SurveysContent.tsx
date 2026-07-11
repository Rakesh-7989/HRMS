import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { engagementService } from '@/services/engagement.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/common/PageTransition';
import { ClipboardCheck, Plus, BarChart3, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const statusConfig: Record<string, { labelKey: string; color: string }> = {
  DRAFT: { labelKey: 'engagement.draft', color: 'bg-neutral-100 text-neutral-500' },
  ACTIVE: { labelKey: 'engagement.active', color: 'bg-success-100 text-success-700' },
  CLOSED: { labelKey: 'engagement.closed', color: 'bg-brand-100 text-brand-700' },
};

export const SurveysContent: React.FC = () => {
  const { t } = useTranslation();
  const { data: surveys, isLoading } = useQuery({
    queryKey: ['engagement-surveys'],
    queryFn: () => engagementService.getSurveys().then(r => r.data),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{t('engagement.employeeSurveys')}</h2>
          <Button size="sm" className="gap-2"><Plus size={16} /> {t('engagement.newSurvey')}</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {surveys?.map(survey => (
            <Card key={survey.id} hover padding="lg">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-brand-100 dark:bg-brand-900/30">
                  <ClipboardCheck className="w-5 h-5 text-brand-600" />
                </div>
                <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', statusConfig[survey.status]?.color)}>
                  {t(statusConfig[survey.status]?.labelKey || 'engagement.draft')}
                </span>
              </div>
              <h3 className="font-bold text-neutral-900 dark:text-white mb-1">{survey.title}</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3 line-clamp-2">{survey.description}</p>
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="capitalize">{survey.type} · {survey.questions?.length || 0} {t('engagement.questions')}</span>
                <span className="flex items-center gap-1">
                  <BarChart3 size={12} />
                  {survey.response_count || 0}/{survey.total_count || 0}
                </span>
              </div>
            </Card>
          ))}
          {(!surveys || surveys.length === 0) && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-neutral-400">
              <ClipboardCheck className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-medium">{t('engagement.noSurveysYet')}</p>
              <p className="text-sm">{t('engagement.createSurveyPrompt')}</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};
