import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { engagementService } from '@/services/engagement.service';
import { Card } from '@/components/ui/Card';
import { PageTransition } from '@/components/ui/PageTransition';
import { Cake, Sparkles, Gift, Star, Loader2 } from 'lucide-react';

const typeIcons: Record<string, React.ElementType> = {
  BIRTHDAY: Cake, WORK_ANNIVERSARY: Sparkles, MARRIAGE_ANNIVERSARY: Gift, PROMOTION: Star, ACHIEVEMENT: Star,
};

const typeLabelKeys: Record<string, string> = {
  BIRTHDAY: 'engagement.birthday', WORK_ANNIVERSARY: 'engagement.workAnniversary', MARRIAGE_ANNIVERSARY: 'engagement.marriageAnniversary',
  PROMOTION: 'engagement.promotion', ACHIEVEMENT: 'engagement.achievement',
};

export const CelebrationsContent: React.FC = () => {
  const { t } = useTranslation();
  const currentMonth = new Date().getMonth() + 1;
  const { data: celebrations, isLoading } = useQuery({
    queryKey: ['engagement-celebrations', currentMonth],
    queryFn: () => engagementService.getCelebrations(currentMonth).then(r => r.data),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

  return (
    <PageTransition>
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{t('engagement.thisMonthCelebrations')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {celebrations?.map(c => {
            const Icon = typeIcons[c.type] || Gift;
            return (
              <Card key={c.id} padding="lg" className="text-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <p className="font-bold text-neutral-900 dark:text-white">{c.employee?.first_name} {c.employee?.last_name}</p>
                <p className="text-sm text-brand-600 dark:text-brand-400 font-semibold">{t(typeLabelKeys[c.type]) || c.type}</p>
                <p className="text-xs text-neutral-400 mt-1">{new Date(c.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
                {c.message && <p className="text-sm text-neutral-500 mt-2 italic">"{c.message}"</p>}
              </Card>
            );
          })}
          {(!celebrations || celebrations.length === 0) && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-neutral-400">
              <Cake className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-medium">{t('engagement.noCelebrationsThisMonth')}</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};
