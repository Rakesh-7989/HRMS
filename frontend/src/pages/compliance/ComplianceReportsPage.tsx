import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PFReportsContent } from '@/components/compliance/PFReportsContent';
import { ESIReportsContent } from '@/components/compliance/ESIReportsContent';
import { PTReportsContent } from '@/components/compliance/PTReportsContent';
import { LWFReportsContent } from '@/components/compliance/LWFReportsContent';
import { Shield, Activity, FileText, Building2 } from 'lucide-react';

const TABS = [
  { id: 'pf', label: 'PF Returns', icon: Shield },
  { id: 'esi', label: 'ESI Returns', icon: Activity },
  { id: 'pt', label: 'PT Returns', icon: FileText },
  { id: 'lwf', label: 'LWF Returns', icon: Building2 },
];

export const ComplianceReportsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const getInitialTab = () => tabParam && TABS.some(t => t.id === tabParam) ? tabParam : 'pf';
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  useEffect(() => {
    if (tabParam && TABS.some(t => t.id === tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  return (
    <DashboardLayout title="Compliance Reports">
      <div className="space-y-6">
        <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl w-fit">
          {TABS.map(tab => {
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
          {activeTab === 'pf' && <PFReportsContent />}
          {activeTab === 'esi' && <ESIReportsContent />}
          {activeTab === 'pt' && <PTReportsContent />}
          {activeTab === 'lwf' && <LWFReportsContent />}
        </div>
      </div>
    </DashboardLayout>
  );
};
