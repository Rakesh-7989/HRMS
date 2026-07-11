import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { recruitmentService } from '@/services/recruitment.service';
import { Card } from '@/components/ui/Card';
import { PageTransition } from '@/components/common/PageTransition';
import { Calendar, Video, Phone, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const modeIcons: Record<string, React.ElementType> = {
  VIDEO: Video,
  PHONE: Phone,
  IN_PERSON: MapPin,
};

const statusConfig: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400' },
  COMPLETED: { label: 'Completed', color: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400' },
  CANCELLED: { label: 'Cancelled', color: 'bg-error-100 dark:bg-error-900/30 text-error-500 dark:text-error-400' },
  RESCHEDULED: { label: 'Rescheduled', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
};

export const InterviewsContent: React.FC = () => {
  const { data: interviews, isLoading } = useQuery({
    queryKey: ['recruitment-interviews'],
    queryFn: () => recruitmentService.getInterviews().then(r => r.data),
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
      <div className="space-y-3">
        {interviews?.map(interview => {
          const ModeIcon = modeIcons[interview.mode] || Calendar;
          return (
            <Card key={interview.id} padding="md">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                    <ModeIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white text-sm">
                      {interview.candidate?.name || 'Candidate'}
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      {interview.round_name} · {interview.interviewer?.first_name} {interview.interviewer?.last_name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(interview.scheduled_at).toLocaleString()}
                      </span>
                      <span>{interview.duration_minutes}min</span>
                    </div>
                  </div>
                </div>
                <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', statusConfig[interview.status]?.color)}>
                  {statusConfig[interview.status]?.label || interview.status}
                </span>
              </div>
              {interview.feedback && (
                <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-300">
                  {interview.feedback}
                  {interview.rating && (
                    <span className="ml-2 text-brand-500 font-bold">Rating: {interview.rating}/5</span>
                  )}
                </div>
              )}
            </Card>
          );
        })}
        {(!interviews || interviews.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500">
            <Calendar className="w-12 h-12 mb-3 opacity-40" />
            <p className="font-medium">No interviews scheduled</p>
            <p className="text-sm">Schedule interviews with candidates to get started</p>
          </div>
        )}
      </div>
    </PageTransition>
  );
};
