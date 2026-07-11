import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePermissions } from '@/contexts/PermissionsContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BonusPlansContent } from '@/components/bonus/BonusPlansContent';
import { EmployeeBonusesContent } from '@/components/bonus/EmployeeBonusesContent';
import { CommissionStructuresContent } from '@/components/bonus/CommissionStructuresContent';
import { Gift, Users, Percent } from 'lucide-react';

const TABS = [
  { id: 'plans', label: 'Bonus Plans', icon: Gift, permission: ['bonus', 'view'] },
  { id: 'bonuses', label: 'Employee Bonuses', icon: Users, permission: ['bonus', 'view'] },
  { id: 'commissions', label: 'Commissions', icon: Percent, permission: ['bonus', 'manage'] },
];

export const BonusPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { hasPermission } = usePermissions();

  const tabParam = searchParams.get('tab');
  const getInitialTab = () => {
    if (tabParam && TABS.some(t => t.id === tabParam)) return tabParam;
    return 'plans';
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  useEffect(() => {
    if (tabParam && TABS.some(t => t.id === tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  return (
    <DashboardLayout title="Bonus & Incentives">
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
          {activeTab === 'plans' && <BonusPlansContent />}
          {activeTab === 'bonuses' && <EmployeeBonusesContent />}
          {activeTab === 'commissions' && <CommissionStructuresContent />}
        </div>
      </div>
    </DashboardLayout>
  );
};
