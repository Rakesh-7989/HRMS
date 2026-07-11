import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { performanceService } from '@/services/performance.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PageTransition } from '@/components/common/PageTransition';
import { Settings, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const PerformanceSettingsContent: React.FC = () => {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['performance-templates'],
    queryFn: () => performanceService.getTemplates().then(r => r.data),
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
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Review Templates</h2>
          <Button size="sm" className="gap-2">
            <Plus size={16} />
            New Template
          </Button>
        </div>

        <div className="space-y-4">
          {templates?.map(template => (
            <Card key={template.id} padding="lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 rounded-lg bg-brand-100 dark:bg-brand-900/30">
                      <Settings className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    </div>
                    <h3 className="font-bold text-neutral-900 dark:text-white">{template.name}</h3>
                  </div>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 ml-9">
                    Rating Scale: {template.rating_scale} points
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  template.is_active
                    ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                }`}>
                  {template.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="ml-9 space-y-2">
                {template.sections.map((section, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <div className="flex-1 text-neutral-700 dark:text-neutral-300">{section.name}</div>
                    <div className="text-xs text-neutral-400 dark:text-neutral-500">Weight: {section.weight}%</div>
                    <div className="text-xs text-neutral-400 dark:text-neutral-500">Max: {section.max_score}</div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
          {(!templates || templates.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500">
              <Settings className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-medium">No templates yet</p>
              <p className="text-sm">Create review templates to define rating scales and sections</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};
