import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Loader2 } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'react-hot-toast';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { PayrollSummary } from '@/components/payroll/PayrollSummary';
import { PayslipsContent } from '@/components/payroll/PayslipsContent';
import { SalaryStructuresContent } from '@/components/payroll/SalaryStructuresContent';

import { PayrollDashboard } from '@/pages/payroll/PayrollDashboard';
import { TaxDeclaration } from '@/pages/payroll/TaxDeclaration';
import { ArrearsPage } from '@/pages/payroll/ArrearsPage';
import { FnFSettlementsContent } from '@/pages/payroll/FnFSettlementsContent';

const PAYROLL_TABS = [
  { id: 'dashboard', label: 'Overview', roles: ['ADMIN', 'HR'] },
  { id: 'summary', label: 'Summary', roles: ['ADMIN', 'HR'] },
  { id: 'payslips', label: 'Payslips', roles: ['ADMIN', 'HR', 'EMPLOYEE', 'MANAGER'] },
  { id: 'tax', label: 'Tax & Compliance', roles: ['ADMIN', 'HR', 'EMPLOYEE', 'MANAGER'] },
  { id: 'salary_details', label: 'Salary Structure', roles: ['ADMIN', 'HR'] },
  { id: 'arrears', label: 'Arrears', roles: ['ADMIN', 'HR'] },
  { id: 'fnf', label: 'F&F Settlements', roles: ['ADMIN', 'HR'] },
] as const;

export const Payroll: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isHRorAdmin = user?.role === 'ADMIN' || user?.role === 'HR';
  const [activeTab, setActiveTab] = useState<typeof PAYROLL_TABS[number]['id']>(isHRorAdmin ? 'dashboard' : 'payslips');
  const [payRunLoading, setPayRunLoading] = useState(false);

  const handlePayRun = async () => {
    if (payRunLoading) return;
    try {
      setPayRunLoading(true);
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // Check if a run already exists for the current month
      const dashRes = await api.get(`/payroll/river/dashboard?month=${month}&year=${year}`);
      if (dashRes.data?.runStatus?.id) {
        navigate(`/payroll/process/${dashRes.data.runStatus.id}`);
        return;
      }

      // No existing run — create a new one
      const res = await api.post('/payroll/river/run', { month, year });
      toast.success('New Payroll Run Started!');
      navigate(`/payroll/process/${res.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start payroll run');
    } finally {
      setPayRunLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Payroll Management"
      breadcrumbs={[
        { label: 'Dashboard', href: user?.role === 'ADMIN' || user?.role === 'HR' ? '/dashboard/organization' : '/dashboard/personal' },
        { label: 'Payroll' },
      ]}
    >

      {/* ===== CATEGORY CONTROLS ===== */}
      {PAYROLL_TABS.filter(t => (t.roles as readonly string[]).includes(user?.role || '')).length > 1 && (
        <div className="flex items-center gap-1 p-1 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg mb-6 w-fit border border-gray-200 dark:border-gray-700">
          {PAYROLL_TABS.map((tab) => {
            if (!(tab.roles as readonly string[]).includes(user?.role || '')) return null;
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

          {/* Pay Run Button */}
          {isHRorAdmin && (
            <button
              onClick={handlePayRun}
              disabled={payRunLoading}
              className="ml-2 px-5 py-2 rounded-md text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-sm flex items-center gap-1.5 disabled:opacity-60"
            >
              {payRunLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              Pay Run
            </button>
          )}
        </div>
      )}

      {/* ===== CONTENT FOR TABS ===== */}
      <div className="min-h-[500px]">
        {activeTab === 'dashboard' && <PayrollDashboard />}
        {activeTab === 'summary' && (
          <PayrollSummary onNavigate={(tab) => setActiveTab(tab as any)} />
        )}
        {activeTab === 'payslips' && <PayslipsContent />}
        {activeTab === 'tax' && <TaxDeclaration />}
        {activeTab === 'salary_details' && <SalaryStructuresContent />}
        {activeTab === 'arrears' && <ArrearsPage />}
        {activeTab === 'fnf' && <FnFSettlementsContent />}
      </div>
    </DashboardLayout>
  );
};

export default Payroll;
