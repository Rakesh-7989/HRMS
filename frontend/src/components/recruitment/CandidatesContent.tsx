import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { recruitmentService } from '@/services/recruitment.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/ui/PageTransition';
import { Users, Plus, Mail, Phone, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const statusConfig: Record<string, { labelKey: string; color: string }> = {
  NEW: { labelKey: 'recruitment.new', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  SCREENING: { labelKey: 'recruitment.screening', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  INTERVIEW: { labelKey: 'recruitment.interview', color: 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400' },
  OFFERED: { labelKey: 'recruitment.offered', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400' },
  HIRED: { labelKey: 'recruitment.hired', color: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400' },
  REJECTED: { labelKey: 'recruitment.rejected', color: 'bg-error-100 dark:bg-error-900/30 text-error-500 dark:text-error-400' },
  WITHDRAWN: { labelKey: 'recruitment.withdrawn', color: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400' },
};

const sourceConfig: Record<string, string> = {
  WEBSITE: 'recruitment.website', REFERRAL: 'recruitment.referral', PORTAL: 'recruitment.portal', AGENCY: 'recruitment.agency', DIRECT: 'recruitment.direct',
};

export const CandidatesContent: React.FC = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = React.useState<string | undefined>(undefined);

  const { data: candidates, isLoading } = useQuery({
    queryKey: ['recruitment-candidates', filter],
    queryFn: () => recruitmentService.getCandidates(filter).then(r => r.data),
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
            {[{ id: undefined, labelKey: 'recruitment.all' }, { id: 'NEW', labelKey: 'recruitment.new' }, { id: 'INTERVIEW', labelKey: 'recruitment.interview' }, { id: 'HIRED', labelKey: 'recruitment.hired' }].map(f => (
               <Button variant="ghost" 
                key={f.id || 'all'}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  filter === f.id ? 'bg-white dark:bg-neutral-900 text-brand-600 dark:text-brand-400 shadow-elev-1' : 'text-neutral-500 dark:text-neutral-400'
                )}
              >
                {t(f.labelKey)}
              </Button>
            ))}
          </div>
          <Button size="sm" className="gap-2">
            <Plus size={16} />
            {t('recruitment.addCandidate')}
          </Button>
        </div>

        <div className="space-y-3">
          {candidates?.map(candidate => (
            <Card key={candidate.id} padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-sm font-bold text-brand-600 dark:text-brand-400 shrink-0">
                  {candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-900 dark:text-white text-sm truncate">{candidate.name}</p>
                  <div className="flex items-center gap-3 text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                    <span className="flex items-center gap-1"><Mail size={11} /> {candidate.email}</span>
                    {candidate.phone && <span className="flex items-center gap-1"><Phone size={11} /> {candidate.phone}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  {candidate.experience_years}{t('recruitment.yrs')} · {t(sourceConfig[candidate.source] || candidate.source)}
                </span>
                <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', statusConfig[candidate.status]?.color)}>
                  {t(statusConfig[candidate.status]?.labelKey || 'recruitment.new')}
                </span>
              </div>
            </Card>
          ))}
          {(!candidates || candidates.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500">
              <Users className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-medium">{t('recruitment.noCandidatesYet')}</p>
              <p className="text-sm">{t('recruitment.candidatesWillAppear')}</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};
