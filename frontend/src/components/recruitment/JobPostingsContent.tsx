import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recruitmentService, JobPosting } from '@/services/recruitment.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/common/PageTransition';
import { Briefcase, Plus, MapPin, Clock, Users, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { showToast } from '@/utils/toast';

const statusConfig: Record<string, { labelKey: string; color: string }> = {
  DRAFT: { labelKey: 'recruitment.draft', color: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400' },
  PUBLISHED: { labelKey: 'recruitment.published', color: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400' },
  CLOSED: { labelKey: 'recruitment.closed', color: 'bg-error-100 dark:bg-error-900/30 text-error-500 dark:text-error-400' },
};

const typeConfig: Record<string, string> = {
  FULL_TIME: 'recruitment.fullTime',
  PART_TIME: 'recruitment.partTime',
  CONTRACT: 'recruitment.contract',
  INTERNSHIP: 'recruitment.internship',
};

export const JobPostingsContent: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<string | undefined>(undefined);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['recruitment-jobs', filter],
    queryFn: () => recruitmentService.getJobs(filter).then(r => r.data),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => recruitmentService.publishJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-jobs'] });
      showToast.success(t('recruitment.jobPublished'));
    },
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
            {[{ id: undefined, labelKey: 'recruitment.all' }, { id: 'PUBLISHED', labelKey: 'recruitment.published' }, { id: 'DRAFT', labelKey: 'recruitment.draft' }, { id: 'CLOSED', labelKey: 'recruitment.closed' }].map(f => (
              <button
                key={f.id || 'all'}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  filter === f.id ? 'bg-white dark:bg-neutral-900 text-brand-600 dark:text-brand-400 shadow-elev-1' : 'text-neutral-500 dark:text-neutral-400'
                )}
              >
                {t(f.labelKey)}
              </button>
            ))}
          </div>
          <Button size="sm" className="gap-2">
            <Plus size={16} />
            {t('recruitment.newJob')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs?.map(job => (
            <Card key={job.id} hover padding="lg">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-brand-100 dark:bg-brand-900/30">
                  <Briefcase className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', statusConfig[job.status]?.color)}>
                  {t(statusConfig[job.status]?.labelKey || 'recruitment.draft')}
                </span>
              </div>
              <h3 className="font-bold text-neutral-900 dark:text-white mb-1">{job.title}</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">{job.department}</p>
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
                  <MapPin size={12} />
                  {job.location}
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
                  <Clock size={12} />
                  {t(typeConfig[job.type] || job.type)} · {job.experience_min}-{job.experience_max} {t('recruitment.yrs')}
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
                  <Users size={12} />
                  {job.candidate_count || 0} {t('recruitment.candidates')} · {job.openings} {t('recruitment.openings')}
                </div>
              </div>
              {job.status === 'DRAFT' && (
                <button
                  onClick={() => publishMutation.mutate(job.id)}
                  className="w-full py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-colors"
                >
                  {t('recruitment.publish')}
                </button>
              )}
            </Card>
          ))}
          {(!jobs || jobs.length === 0) && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500">
              <Briefcase className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-medium">{t('recruitment.noJobsYet')}</p>
              <p className="text-sm">{t('recruitment.createFirstJob')}</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};
