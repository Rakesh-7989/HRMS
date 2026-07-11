import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { usePermissions } from '@/contexts/PermissionsContext';
import { ReviewCyclesContent } from '@/components/performance/ReviewCyclesContent';
import { GoalsContent } from '@/components/performance/GoalsContent';
import { FeedbackContent } from '@/components/performance/FeedbackContent';
import { PerformanceSettingsContent } from '@/components/performance/PerformanceSettingsContent';
import { BarChart3, Target, MessageSquare, Settings, Brain } from 'lucide-react';
import { AITabContent } from '@/components/ai/AITabContent';

const TABS = [
  { id: 'reviews', label: 'Reviews', icon: BarChart3, permission: ['performance', 'view'] },
  { id: 'goals', label: 'Goals', icon: Target, permission: ['performance', 'view'] },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, permission: ['performance', 'view'] },
  { id: 'ai', label: 'AI Insights', icon: Brain, permission: ['performance', 'view'] },
  { id: 'settings', label: 'Settings', icon: Settings, permission: ['performance', 'manage'] },
];

export const PerformancePage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { hasPermission } = usePermissions();

  const tabParam = searchParams.get('tab');
  const getInitialTab = () => {
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      const tab = TABS.find(t => t.id === tabParam);
      if (tab && hasPermission(tab.permission[0], tab.permission[1])) return tabParam;
    }
    return 'reviews';
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  useEffect(() => {
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      const tab = TABS.find(t => t.id === tabParam);
      if (tab && hasPermission(tab.permission[0], tab.permission[1])) setActiveTab(tabParam);
    }
  }, [tabParam, hasPermission]);

  const renderContent = () => {
    switch (activeTab) {
      case 'reviews': return <ReviewCyclesContent />;
      case 'goals': return <GoalsContent />;
      case 'feedback': return <FeedbackContent />;
      case 'ai': return <AITabContent module="performance" />;
      case 'settings': return <PerformanceSettingsContent />;
      default: return <ReviewCyclesContent />;
    }
  };

  return (
    <DashboardLayout title="Performance Management">
      <div className="space-y-6">
        <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl w-fit">
          {TABS.map(tab => {
            const canAccess = hasPermission(tab.permission[0], tab.permission[1]);
            if (!canAccess) return null;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-neutral-900 text-brand-600 dark:text-brand-400 shadow-elev-1'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="min-h-[400px]">
          {renderContent()}
        </div>
      </div>
    </DashboardLayout>
  );
};
