import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CreateEmployeeForm } from '@/components/forms/CreateEmployeeForm';
import { usersService } from '@/services/users.service';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

export const EditEmployeePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: employee, isLoading, error } = useQuery({
        queryKey: ['employee', id],
        queryFn: () => usersService.getUserById(id!),
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <DashboardLayout title="Edit Employee">
                <div className="space-y-4 p-6">
                    <Skeleton variant="rectangular" width="100%" height={48} />
                    <Skeleton variant="rectangular" width="100%" height={400} />
                </div>
            </DashboardLayout>
        );
    }

    if (error || !employee) {
        return (
            <DashboardLayout title="Edit Employee">
                <Card>
                    <div className="text-center py-12">
                        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Employee Not Found
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            The employee you're trying to edit doesn't exist.
                        </p>
                        <Button onClick={() => navigate('/employees')}>
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
                { label: 'Dashboard', href: '/dashboard/organization' },
                { label: 'Employees', href: '/employees' },
                { label: `${employee.first_name} ${employee.last_name}`, href: `/employees/${id}` },
                { label: 'Edit' },
            ]}
        >
            <Card className="p-6">
                <div className="mb-6">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/employees/${id}`)}>
                        <ArrowLeft size={16} className="mr-2" />
                        Back to Details
                    </Button>
                </div>
                <CreateEmployeeForm
                    open={true}
                    onOpenChange={() => navigate(`/employees/${id}`)}
                    asPage
                    editEmployee={employee}
                    onSuccess={() => navigate(`/employees/${id}`)}
                />
            </Card>
        </DashboardLayout>
    );
};

export default EditEmployeePage;
