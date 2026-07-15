import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CreateEmployeeForm } from '@/components/forms/CreateEmployeeForm';
import { usersService } from '@/services/users.service';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/utils/constants';

export const EditEmployeePage: React.FC = () => {
  const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: employee, isLoading, error } = useQuery({
        queryKey: ['employee-edit', id],
        queryFn: () => usersService.getUserById(id!, { unmask: true }),
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <DashboardLayout title={t('employees.editEmployee')}>
                <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !employee) {
        return (
            <DashboardLayout title={t('employees.editEmployee')}>
                <Card>
                    <div className="text-center py-12">
                        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Employee Not Found
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            The employee you're trying to edit doesn't exist.
                        </p>
                        <Button onClick={() => navigate(ROUTES.EMPLOYEES)}>
                            <ArrowLeft size={16} className="mr-2" />
                            Back to Employees
                        </Button>
                    </div>
                </Card>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            title={`Edit ${employee.first_name} ${employee.last_name}`}
            breadcrumbs={[
                { label: t('common.breadcrumbs.dashboard'), href: '/dashboard/organization' },
                { label: t('common.breadcrumbs.employees'), href: '/dashboard/employees' },
                { label: `${employee.first_name} ${employee.last_name}`, href: `/dashboard/employees/${id}` },
                { label: 'Edit' },
            ]}
        >
            <Card className="flex flex-col flex-1 overflow-hidden">
                <div className="px-6 pt-6 pb-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/dashboard/employees/${id}`)}
                        className="hover:bg-gray-100 hover:text-gray-900 border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                    >
                        <ArrowLeft size={16} className="mr-2" />
                        Back to Details
                    </Button>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col">
                    <CreateEmployeeForm
                        open={true}
                        onOpenChange={() => navigate(`/dashboard/employees/${id}`)}
                        asPage
                        editEmployee={employee}
                        onSuccess={() => navigate(`/dashboard/employees/${id}`)}
                    />
                </div>
            </Card>
        </DashboardLayout>
    );
};


