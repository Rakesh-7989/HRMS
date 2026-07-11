import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePermissions } from '@/contexts/PermissionsContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SurveysContent } from '@/components/engagement/SurveysContent';
import { RecognitionContent } from '@/components/engagement/RecognitionContent';
import { CelebrationsContent } from '@/components/engagement/CelebrationsContent';
import { ClipboardCheck, Award, Cake, Brain } from 'lucide-react';
import { AITabContent } from '@/components/ai/AITabContent';

const TABS = [
  { id: 'surveys', label: 'Surveys', icon: ClipboardCheck, permission: ['engagement', 'view'] },
  { id: 'recognition', label: 'Recognition', icon: Award, permission: ['engagement', 'view'] },
  { id: 'celebrations', label: 'Celebrations', icon: Cake, permission: ['engagement', 'view'] },
  { id: 'ai', label: 'AI Insights', icon: Brain, permission: ['engagement', 'view'] },
];

export const EngagementPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { hasPermission } = usePermissions();

  const tabParam = searchParams.get('tab');
  const getInitialTab = () => {
    if (tabParam && TABS.some(t => t.id === tabParam)) return tabParam;
    return 'surveys';
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  useEffect(() => {
    if (tabParam && TABS.some(t => t.id === tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  return (
    <DashboardLayout title="Employee Engagement">
      <div className="space-y-6">
        <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl w-fit">
          {TABS.map(tab => {
            const canAccess = hasPermission(tab.permission[0], tab.permission[1]);
            if (!canAccess) return null;
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-neutral-900 text-brand-600 shadow-elev-1'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>
        <div className="min-h-[400px]">
          {activeTab === 'surveys' && <SurveysContent />}
          {activeTab === 'recognition' && <RecognitionContent />}
          {activeTab === 'celebrations' && <CelebrationsContent />}
          {activeTab === 'ai' && <AITabContent module="engagement" />}
        </div>
      </div>
    </DashboardLayout>
  );
};
