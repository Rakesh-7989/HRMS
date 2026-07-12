import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CreateEmployeeForm } from '@/components/forms/CreateEmployeeForm';
import { useTranslation } from 'react-i18next';

export const AddEmployeePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/dashboard/employees');
  };

  // Subscription Query for Limit Check
  const { data: subscription, isLoading } = useQuery({ // Using react-query's useQuery
    queryKey: ['my-subscription'],
    queryFn: () => import('@/services/subscription.service').then(m => m.subscriptionService.getMySubscription()),
    retry: false
  });

  const currentCount = subscription?.current_employees || 0;
  const maxEmployees = subscription?.max_employees || 0;
  const isLimitReached = maxEmployees > 0 && currentCount >= maxEmployees;

  // Effect to redirect if limit reached? Or just show message?
  // Showing message is better UX than abrupt redirect sometimes, but redirect is safer.
  React.useEffect(() => {
    if (!isLoading && isLimitReached) {
      // toast('Plan limit reached. Please upgrade.', { icon: '🚫' }); // toast might not be imported
      // navigate('/employees'); 
    }
  }, [isLoading, isLimitReached, navigate]);

  if (isLoading) return <div className="p-6">{t('common.loading')}</div>;

  if (isLimitReached) {
    return (
      <DashboardLayout
        title={t('employees.addEmployee')}
        breadcrumbs={[
          { label: t('common.breadcrumbs.dashboard'), href: '/dashboard/organization' },
          { label: t('common.breadcrumbs.employees'), href: '/dashboard/employees' },
          { label: 'Add Employee' },
        ]}
      >
        <Card className="p-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Plan Limit Reached</h2>
          <p className="text-gray-500 max-w-md">
            You have reached the maximum number of employees ({maxEmployees}) for your current plan.
            Please upgrade your plan to add more employees.
          </p>
            <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => navigate('/dashboard/employees')}>
              Back to Employees
            </Button>
            <Button onClick={() => navigate('/settings/billing')}>
              Upgrade Plan
            </Button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={t('employees.addEmployee')}
      breadcrumbs={[
        { label: t('common.breadcrumbs.dashboard'), href: '/dashboard/organization' },
        { label: t('common.breadcrumbs.employees'), href: '/dashboard/employees' },
        { label: 'Add Employee' },
      ]}
    >
      <Card className="flex flex-col flex-1 overflow-hidden">
        <div className="px-6 pt-6 pb-2 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Add New Employee</h2>
          <p className="text-sm text-muted">Fill all required fields to onboard a new employee.</p>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          <CreateEmployeeForm open={true} onOpenChange={() => { }} asPage onSuccess={handleSuccess} />
        </div>
      </Card>
    </DashboardLayout>
  );
};
