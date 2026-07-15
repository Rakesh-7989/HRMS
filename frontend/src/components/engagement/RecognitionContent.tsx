import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { engagementService } from '@/services/engagement.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/ui/PageTransition';
import { Award, Heart, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const categoryConfig: Record<string, { labelKey: string; icon: string; color: string }> = {
  VALUES: { labelKey: 'engagement.values', icon: '⭐', color: 'bg-amber-100 text-amber-700' },
  HELPING: { labelKey: 'engagement.helpingHand', icon: '🤝', color: 'bg-blue-100 text-blue-700' },
  INNOVATION: { labelKey: 'engagement.innovation', icon: '💡', color: 'bg-brand-100 text-brand-700' },
  LEADERSHIP: { labelKey: 'engagement.leadership', icon: '👑', color: 'bg-coral-100 text-coral-700' },
  CUSTOMER: { labelKey: 'engagement.customerFocus', icon: '🎯', color: 'bg-teal-100 text-teal-700' },
  TEAMWORK: { labelKey: 'engagement.teamwork', icon: '🤗', color: 'bg-success-100 text-success-700' },
};

export const RecognitionContent: React.FC = () => {
  const { t } = useTranslation();
  const { data: recognitions, isLoading } = useQuery({
    queryKey: ['engagement-recognition'],
    queryFn: () => engagementService.getRecognition().then(r => r.data),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{t('engagement.peerRecognition')}</h2>
          <Button size="sm" className="gap-2"><Heart size={16} /> {t('engagement.sendRecognition')}</Button>
        </div>
        <div className="space-y-3">
          {recognitions?.map(r => (
            <Card key={r.id} padding="md">
              <div className="flex items-start gap-4">
                <div className={cn('p-2.5 rounded-xl', categoryConfig[r.category]?.color || 'bg-neutral-100')}>
                  <Award className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-neutral-900 dark:text-white text-sm">
                      {r.from_employee?.first_name} {r.from_employee?.last_name}
                    </span>
                    <span className="text-neutral-400">→</span>
                    <span className="font-semibold text-brand-600 dark:text-brand-400 text-sm">
                      {r.to_employee?.first_name} {r.to_employee?.last_name}
                    </span>
                    <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-bold', categoryConfig[r.category]?.color)}>
                      {t(categoryConfig[r.category]?.labelKey) || r.category}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">"{r.message}"</p>
                  <p className="text-xs text-neutral-400 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </Card>
          ))}
          {(!recognitions || recognitions.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
              <Award className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-medium">{t('engagement.noRecognitionYet')}</p>
              <p className="text-sm">{t('engagement.recognizeColleagues')}</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};
