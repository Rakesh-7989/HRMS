import React from 'react';
import { AISentimentAnalysis } from './AISentimentAnalysis';
import { AISkillsGapAnalyzer } from './AISkillsGapAnalyzer';
import { AIResumeParser } from './AIResumeParser';
import { Card } from '@/components/ui/Card';
import { PageTransition } from '@/components/ui/PageTransition';
import { Brain, Sparkles, MessageSquareText, BarChart3, Target, Upload } from 'lucide-react';

interface AITabContentProps {
  module: 'performance' | 'recruitment' | 'engagement';
  surveyId?: string;
  employeeId?: string;
}

const moduleConfig: Record<string, { title: string; features: Array<{ icon: React.ElementType; label: string; desc: string }> }> = {
  performance: {
    title: 'AI for Performance',
    features: [
      { icon: Target, label: 'Skills Gap Analysis', desc: 'Identify skill gaps and get learning recommendations' },
      { icon: BarChart3, label: 'Performance Predictions', desc: 'AI predicts performance trends and flags risks' },
      { icon: MessageSquareText, label: 'Review Writing Assistant', desc: 'Generate performance review comments with AI' },
    ],
  },
  recruitment: {
    title: 'AI for Recruitment',
    features: [
      { icon: Upload, label: 'Resume Parser', desc: 'Auto-extract candidate details from resumes' },
      { icon: Brain, label: 'Candidate Matching', desc: 'AI matches candidates to job requirements' },
      { icon: Sparkles, label: 'JD Generator', desc: 'Generate job descriptions from keywords' },
    ],
  },
  engagement: {
    title: 'AI for Engagement',
    features: [
      { icon: BarChart3, label: 'Sentiment Analysis', desc: 'Analyze survey responses for sentiment trends' },
      { icon: Brain, label: 'Attrition Prediction', desc: 'Identify employees at risk of leaving' },
      { icon: Sparkles, label: 'Recommendations', desc: 'Get AI-driven engagement improvement suggestions' },
    ],
  },
};

export const AITabContent: React.FC<AITabContentProps> = ({ module, surveyId, employeeId }) => {
  const config = moduleConfig[module];

  return (
    <PageTransition>
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-500 to-teal-500">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{config.title}</h2>
            <p className="text-sm text-neutral-400">Leverage AI to enhance your {module} workflows</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {config.features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.label} padding="lg" className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                </div>
                <h3 className="font-bold text-neutral-900 dark:text-white text-sm mb-1">{f.label}</h3>
                <p className="text-xs text-neutral-400">{f.desc}</p>
              </Card>
            );
          })}
        </div>

        {module === 'engagement' && surveyId && (
          <div>
            <h3 className="font-bold text-neutral-900 dark:text-white mb-4">Sentiment Analysis</h3>
            <AISentimentAnalysis surveyId={surveyId} />
          </div>
        )}

        {module === 'performance' && (
          <div>
            <h3 className="font-bold text-neutral-900 dark:text-white mb-4">Skills Gap Analysis</h3>
            <AISkillsGapAnalyzer employeeId={employeeId} />
          </div>
        )}

        {module === 'recruitment' && (
          <div>
            <h3 className="font-bold text-neutral-900 dark:text-white mb-4">Resume Parser</h3>
            <AIResumeParser onParsed={() => {}} />
          </div>
        )}
      </div>
    </PageTransition>
  );
};
