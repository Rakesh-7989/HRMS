import React, { useState } from 'react';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { PayrollSummary } from '@/components/payroll/PayrollSummary';
import { ExpensesContent } from '@/components/payroll/ExpensesContent';
import { LoansContent } from '@/components/payroll/LoansContent';
import { PayslipsContent } from '@/components/payroll/PayslipsContent';
import { CostCentersContent } from '@/components/payroll/CostCentersContent';
import { MerchantsContent } from '@/components/payroll/MerchantsContent';
import { SalaryDetailsContent } from '@/components/payroll/SalaryDetailsContent';
import { TimesheetContent } from '@/components/payroll/TimesheetContent';

const PAYROLL_TABS = [
  { id: 'summary', label: 'Summary', roles: ['ADMIN', 'HR', 'EMPLOYEE', 'MANAGER'] },
  { id: 'timesheets', label: 'Timesheets', roles: ['ADMIN', 'HR', 'EMPLOYEE', 'MANAGER'] },
  { id: 'payslips', label: 'Payslips & Tax', roles: ['ADMIN', 'HR', 'EMPLOYEE', 'MANAGER'] },
  { id: 'loans', label: 'Loans', roles: ['ADMIN', 'HR', 'EMPLOYEE', 'MANAGER'] },
  { id: 'expenses', label: 'Expenses', roles: ['ADMIN', 'HR', 'EMPLOYEE', 'MANAGER'] },
  { id: 'cost_centers', label: 'Cost Centers & Reports', roles: ['ADMIN', 'HR'] },
  { id: 'merchants', label: 'Merchants & Payouts', roles: ['ADMIN', 'HR', 'MANAGER'] },
  { id: 'salary_details', label: 'Salary Structure', roles: ['ADMIN', 'HR', 'EMPLOYEE', 'MANAGER'] },
] as const;

export const Payroll: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<typeof PAYROLL_TABS[number]['id']>('summary');

  return (
    <DashboardLayout
      title="Payroll"
      breadcrumbs={[
        { label: 'Dashboard', href: user?.role === 'ADMIN' || user?.role === 'HR' ? '/dashboard/organization' : '/dashboard/personal' },
        { label: 'Payroll' },
      ]}
    >


      {/* ===== CATEGORY CONTROLS ===== */}
      <div className="flex flex-wrap items-center gap-2 mb-4 overflow-x-auto pb-2">
        {PAYROLL_TABS.map((tab) => {
          if (!(tab.roles as readonly string[]).includes(user?.role || '')) return null;

          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${isActive
                ? 'bg-primary text-white border-primary'
                : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
                }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===== CONTENT FOR TABS ===== */}
      <div className="min-h-[500px]">
        {activeTab === 'summary' && (
          <PayrollSummary onNavigate={(tab) => setActiveTab(tab as any)} />
        )}
        {activeTab === 'timesheets' && <TimesheetContent />}
        {activeTab === 'payslips' && <PayslipsContent />}
        {activeTab === 'expenses' && <ExpensesContent />}
        {activeTab === 'loans' && <LoansContent />}
        {activeTab === 'cost_centers' && <CostCentersContent />}
        {activeTab === 'merchants' && <MerchantsContent />}
        {activeTab === 'salary_details' && <SalaryDetailsContent />}
      </div>
    </DashboardLayout>
  );
};

export default Payroll;
