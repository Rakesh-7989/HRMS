import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { CreateEmployeeForm } from '@/components/forms/CreateEmployeeForm';

export const AddEmployeePage: React.FC = () => {
  return (
    <DashboardLayout
      title="Add Employee"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard/organization' },
        { label: 'Employees', href: '/employees' },
        { label: 'Add Employee' },
      ]}
    >
      <Card className="p-6 space-y-4">
        <p className="text-sm text-muted">Fill all required fields to onboard a new employee.</p>
        <CreateEmployeeForm open={true} onOpenChange={() => {}} asPage />
      </Card>
    </DashboardLayout>
  );
};


