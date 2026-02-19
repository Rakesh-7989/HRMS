import React, { useState } from 'react';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { usePermission } from '@/contexts/PermissionContext';
import { PayrollSummary } from '@/components/payroll/PayrollSummary';
import { PayslipsContent } from '@/components/payroll/PayslipsContent';
import { SalaryStructuresContent } from '@/components/payroll/SalaryStructuresContent';


const PAYROLL_TABS = [
  { id: 'summary', label: 'Summary', permissions: ['view_all_payroll'] },
  { id: 'payslips', label: 'Payslips & Tax', permissions: ['view_own_payslip', 'view_all_payroll'] },
  { id: 'salary_details', label: 'Salary Structure', permissions: ['manage_payroll_components', 'view_all_payroll'] },
] as const;

export const Payroll: React.FC = () => {
  const { hasAnyPermission } = usePermission();
  const isHRorAdmin = hasAnyPermission(['view_all_payroll', 'manage_payroll_components']);
  const [activeTab, setActiveTab] = useState<typeof PAYROLL_TABS[number]['id']>(isHRorAdmin ? 'summary' : 'payslips');

  return (
    <DashboardLayout
      title="Payroll Management"
      breadcrumbs={[
        { label: 'Dashboard', href: isHRorAdmin ? '/dashboard/organization' : '/dashboard/personal' },
        { label: 'Payroll' },
      ]}
    >


      {/* ===== CATEGORY CONTROLS ===== */}
      {PAYROLL_TABS.filter(t => hasAnyPermission([...t.permissions])).length > 1 && (
        <div className="flex items-center gap-1 p-1 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg mb-6 w-fit border border-gray-200 dark:border-gray-700">
          {PAYROLL_TABS.map((tab) => {
            if (!hasAnyPermission([...tab.permissions])) return null;

            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${isActive
                  ? 'bg-white dark:bg-gray-700 text-primary shadow-sm ring-1 ring-black/5'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50'
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ===== CONTENT FOR TABS ===== */}
      <div className="min-h-[500px]">
        {activeTab === 'summary' && (
          <PayrollSummary onNavigate={(tab) => setActiveTab(tab as any)} />
        )}
        {activeTab === 'payslips' && <PayslipsContent />}
        {activeTab === 'salary_details' && <SalaryStructuresContent />}
      </div>
    </DashboardLayout>
  );
};

export default Payroll;
