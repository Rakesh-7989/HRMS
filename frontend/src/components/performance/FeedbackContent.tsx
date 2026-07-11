import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceService, FeedbackRequest } from '@/services/performance.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/common/PageTransition';
import { MessageSquare, Plus, Send, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { toast } from 'react-hot-toast';

export const FeedbackContent: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'received' | 'pending' | 'sent'>('pending');
  const [responseText, setResponseText] = useState<Record<string, string>>({});

  const { data: feedbackList, isLoading } = useQuery({
    queryKey: ['performance-feedback', view],
    queryFn: () => {
      if (view === 'pending') return performanceService.getPendingFeedback().then(r => r.data);
      return performanceService.getFeedbackRequests().then(r => r.data);
    },
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      performanceService.submitFeedback(id, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-feedback'] });
      toast.success(t('performance.feedbackSubmitted'));
      setResponseText({});
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
            {[
              { id: 'pending', labelKey: 'performance.pendingFeedback' },
              { id: 'received', labelKey: 'performance.received' },
              { id: 'sent', labelKey: 'performance.sent' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id as 'received' | 'pending' | 'sent')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  view === tab.id
                    ? 'bg-white dark:bg-neutral-900 text-brand-600 dark:text-brand-400 shadow-elev-1'
                    : 'text-neutral-500 dark:text-neutral-400'
                )}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
          <Button size="sm" className="gap-2">
            <Plus size={16} />
            {t('performance.requestFeedback')}
          </Button>
        </div>

        <div className="space-y-3">
          {feedbackList?.map(fb => (
            <Card key={fb.id} padding="md">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-sm font-bold text-brand-600 dark:text-brand-400">
                    {view === 'sent'
                      ? fb.employee?.first_name?.[0] : fb.requester?.first_name?.[0]
                    }
                    {view === 'sent'
                      ? fb.employee?.last_name?.[0] : fb.requester?.last_name?.[0]
                    }
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white text-sm">
                      {view === 'sent'
                        ? `${fb.employee?.first_name} ${fb.employee?.last_name}`
                        : `${fb.requester?.first_name} ${fb.requester?.last_name}`
                      }
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      {new Date(fb.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold',
                  fb.status === 'PENDING'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    : 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400'
                )}>
                  {fb.status}
                </span>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3">
                "{fb.message}"
              </p>
              {fb.response && (
                <div className="text-sm text-neutral-500 dark:text-neutral-400 bg-brand-50 dark:bg-brand-900/10 rounded-xl p-3 mb-3">
                  <span className="font-bold text-brand-600 dark:text-brand-400">{t('performance.response')}: </span>
                  {fb.response}
                </div>
              )}
              {view === 'pending' && fb.status === 'PENDING' && (
                <div className="space-y-3">
                  <textarea
                    placeholder={t('performance.writeFeedback')}
                    value={responseText[fb.id] || ''}
                    onChange={(e) => setResponseText(prev => ({ ...prev, [fb.id]: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    rows={3}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (responseText[fb.id]?.trim()) {
                        submitFeedbackMutation.mutate({ id: fb.id, response: responseText[fb.id] });
                      }
                    }}
                    disabled={!responseText[fb.id]?.trim()}
                    className="gap-2"
                  >
                    <Send size={14} />
                    {t('performance.submitFeedback')}
                  </Button>
                </div>
              )}
            </Card>
          ))}
          {(!feedbackList || feedbackList.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500">
              <MessageSquare className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-medium">{t('performance.noFeedback')}</p>
              <p className="text-sm">{t('performance.requestFeedbackCTA')}</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};
