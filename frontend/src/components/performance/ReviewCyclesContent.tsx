import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { performanceService, ReviewCycle, PerformanceReview } from '@/services/performance.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/common/PageTransition';
import { BarChart3, Plus, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400' },
  ACTIVE: { label: 'Active', color: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400' },
  CLOSED: { label: 'Closed', color: 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400' },
};

const reviewStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  ACKNOWLEDGED: { label: 'Acknowledged', color: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400' },
};

export const ReviewCyclesContent: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null);

  const { data: cycles, isLoading } = useQuery({
    queryKey: ['performance-cycles'],
    queryFn: () => performanceService.getCycles().then(r => r.data),
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['performance-reviews', selectedCycle],
    queryFn: () => performanceService.getReviews(selectedCycle || undefined).then(r => r.data),
    enabled: !!selectedCycle,
  });

  const closeCycleMutation = useMutation({
    mutationFn: (id: string) => performanceService.closeCycle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-cycles'] });
      toast.success('Review cycle closed');
    },
  });

  const handleSubmitReview = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { rating: number; comments: string } }) =>
      performanceService.submitReview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast.success('Review submitted');
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
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Review Cycles</h2>
          <Button size="sm" className="gap-2">
            <Plus size={16} />
            New Cycle
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cycles?.map(cycle => (
            <Card
              key={cycle.id}
              hover
              padding="lg"
              className={cn(
                'cursor-pointer transition-all',
                selectedCycle === cycle.id && 'ring-2 ring-brand-500'
              )}
              onClick={() => setSelectedCycle(cycle.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-brand-100 dark:bg-brand-900/30">
                  <BarChart3 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', statusConfig[cycle.status]?.color)}>
                  {statusConfig[cycle.status]?.label || cycle.status}
                </span>
              </div>
              <h3 className="font-bold text-neutral-900 dark:text-white mb-1">{cycle.title}</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">{cycle.period}</p>
              <div className="flex items-center gap-3 text-xs text-neutral-400 dark:text-neutral-500">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(cycle.start_date).toLocaleDateString()}
                </span>
                <span>→</span>
                <span>{new Date(cycle.end_date).toLocaleDateString()}</span>
              </div>
              {cycle.status === 'ACTIVE' && (
                <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                  <button
                    onClick={(e) => { e.stopPropagation(); closeCycleMutation.mutate(cycle.id); }}
                    className="text-xs font-bold text-error-500 hover:text-error-600 transition-colors"
                  >
                    Close Cycle
                  </button>
                </div>
              )}
            </Card>
          ))}
          {(!cycles || cycles.length === 0) && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500">
              <BarChart3 className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-medium">No review cycles yet</p>
              <p className="text-sm">Create your first review cycle to get started</p>
            </div>
          )}
        </div>

        {selectedCycle && (
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Reviews</h3>
            {reviewsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
              </div>
            ) : (
              <div className="space-y-3">
                {reviews?.map(review => (
                  <Card key={review.id} padding="md" className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-sm font-bold text-brand-600 dark:text-brand-400">
                        {review.employee?.first_name?.[0]}{review.employee?.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-white text-sm">
                          {review.employee?.first_name} {review.employee?.last_name}
                        </p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">
                          Reviewer: {review.reviewer?.first_name} {review.reviewer?.last_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', reviewStatusConfig[review.status]?.color)}>
                        {reviewStatusConfig[review.status]?.label || review.status}
                      </span>
                      {review.rating > 0 && (
                        <span className="text-lg font-black text-brand-500">{review.rating}/5</span>
                      )}
                    </div>
                  </Card>
                ))}
                {(!reviews || reviews.length === 0) && (
                  <p className="text-center text-neutral-400 dark:text-neutral-500 py-8">No reviews in this cycle</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
};
