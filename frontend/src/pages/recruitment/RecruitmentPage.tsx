import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/contexts/PermissionsContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { JobPostingsContent } from '@/components/recruitment/JobPostingsContent';
import { CandidatesContent } from '@/components/recruitment/CandidatesContent';
import { InterviewsContent } from '@/components/recruitment/InterviewsContent';
import { Briefcase, Users, Calendar, Brain } from 'lucide-react';
import { AITabContent } from '@/components/ai/AITabContent';

const TABS: { id: string; labelKey: string; icon: React.ElementType; permission: [string, string] }[] = [
  { id: 'jobs', labelKey: 'recruitment.jobPostings', icon: Briefcase, permission: ['recruitment', 'view'] },
  { id: 'candidates', labelKey: 'recruitment.candidates', icon: Users, permission: ['recruitment', 'view'] },
  { id: 'interviews', labelKey: 'recruitment.interviews', icon: Calendar, permission: ['recruitment', 'view'] },
  { id: 'ai', labelKey: 'recruitment.aiTools', icon: Brain, permission: ['recruitment', 'view'] },
];

export const RecruitmentPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { hasPermission } = usePermissions();

  const tabParam = searchParams.get('tab');
  const getInitialTab = () => {
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      const tab = TABS.find(t => t.id === tabParam);
      if (tab && hasPermission(tab.permission[0], tab.permission[1])) return tabParam;
    }
    return 'jobs';
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
      case 'jobs': return <JobPostingsContent />;
      case 'candidates': return <CandidatesContent />;
      case 'interviews': return <InterviewsContent />;
      case 'ai': return <AITabContent module="recruitment" />;
      default: return <JobPostingsContent />;
    }
  };

  return (
    <DashboardLayout title={t('recruitment.title')}>
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
                {t(tab.labelKey)}
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
