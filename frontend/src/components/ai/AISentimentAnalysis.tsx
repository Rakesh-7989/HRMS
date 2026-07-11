import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { aiService, SentimentAnalysis } from '@/services/ai.service';
import { Card } from '@/components/ui/Card';
import { PageTransition } from '@/components/common/PageTransition';
import { Brain, TrendingUp, TrendingDown, Minus, Loader2, BarChart3, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AISentimentAnalysisProps {
  surveyId?: string;
}

export const AISentimentAnalysis: React.FC<AISentimentAnalysisProps> = ({ surveyId }) => {
  const { data: sentiment, isLoading } = useQuery({
    queryKey: ['ai-sentiment', surveyId],
    queryFn: () => aiService.analyzeSentiment(surveyId || '').then(r => r.data),
    enabled: !!surveyId,
  });

  if (!surveyId) {
    return (
      <Card padding="lg" className="text-center">
        <Brain className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
        <p className="text-sm text-neutral-400">Select a survey to analyze sentiment</p>
      </Card>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  }

  if (!sentiment) return null;

  const TrendIcon = sentiment.trend === 'improving' ? TrendingUp : sentiment.trend === 'declining' ? TrendingDown : Minus;
  const trendColor = sentiment.trend === 'improving' ? 'text-success-500' : sentiment.trend === 'declining' ? 'text-error-500' : 'text-neutral-400';

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card padding="lg" className="text-center">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Overall Score</p>
            <p className={cn(
              'text-4xl font-black',
              sentiment.overall_score >= 70 ? 'text-success-500' : sentiment.overall_score >= 40 ? 'text-amber-500' : 'text-error-500'
            )}>
              {sentiment.overall_score}%
            </p>
          </Card>
          <Card padding="lg" className="text-center">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Trend</p>
            <TrendIcon className={cn('w-10 h-10 mx-auto', trendColor)} />
            <p className={cn('text-sm font-bold capitalize mt-1', trendColor)}>{sentiment.trend}</p>
          </Card>
          <Card padding="lg" className="text-center">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Categories</p>
            <p className="text-4xl font-black text-brand-500">{sentiment.categories.length}</p>
          </Card>
        </div>

        <Card padding="lg">
          <h3 className="font-bold text-neutral-900 dark:text-white mb-4">Category Breakdown</h3>
          <div className="space-y-4">
            {sentiment.categories.map((cat) => (
              <div key={cat.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">{cat.name}</span>
                  <span className="text-neutral-400">{cat.volume} responses</span>
                </div>
                <div className="h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      cat.score >= 70 ? 'bg-success-500' : cat.score >= 40 ? 'bg-amber-500' : 'bg-error-500'
                    )}
                    style={{ width: `${cat.score}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-400 mt-1">{cat.score}% positive</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card padding="lg">
            <div className="flex items-center gap-2 mb-3">
              <ThumbsUp className="w-4 h-4 text-success-500" />
              <h3 className="font-bold text-neutral-900 dark:text-white">Top Positive Keywords</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {sentiment.top_positive_keywords.map((kw) => (
                <span key={kw} className="px-3 py-1.5 rounded-full bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400 text-xs font-medium">
                  {kw}
                </span>
              ))}
            </div>
          </Card>
          <Card padding="lg">
            <div className="flex items-center gap-2 mb-3">
              <ThumbsDown className="w-4 h-4 text-error-500" />
              <h3 className="font-bold text-neutral-900 dark:text-white">Top Negative Keywords</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {sentiment.top_negative_keywords.map((kw) => (
                <span key={kw} className="px-3 py-1.5 rounded-full bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400 text-xs font-medium">
                  {kw}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};
