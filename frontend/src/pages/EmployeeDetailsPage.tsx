import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { usersService, TerminateEmployeeData } from '@/services/users.service';
import { departmentService } from '@/services/department.service';
import { designationService } from '@/services/designation.service';
import { leaveService } from '@/services/leave.service';
import { getShifts } from '@/services/shift.service';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils/cn';
import {
    User as UserIcon,
    Mail,
    Phone,
    Building2,
    Briefcase,
    Calendar,
    MapPin,
    AlertCircle,
    Edit,
    UserX,
    UserCheck,
    ArrowLeft,
    Wallet,
    Heart,
    FileText,
    Clock,
    Users,
    Eye,
    EyeOff,
    Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { SalaryAssignmentSection } from '@/components/payroll/SalaryAssignmentSection';

type TabType = 'personal' | 'employment' | 'financial' | 'documents';

export const EmployeeDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<TabType>('personal');
    const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
    const [terminateData, setTerminateData] = useState<TerminateEmployeeData>({
        termination_date: new Date().toISOString().split('T')[0],
        termination_reason: '',
    });

    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'HR';

    // Sensitive field reveal state
    const [revealedFields, setRevealedFields] = useState<Record<string, string>>({});
    const [revealingField, setRevealingField] = useState<string | null>(null);

    const handleRevealField = useCallback(async (fieldName: string) => {
        if (revealedFields[fieldName]) {
            // Toggle off
            setRevealedFields(prev => {
                const next = { ...prev };
                delete next[fieldName];
                return next;
            });
            return;
        }
        try {
            setRevealingField(fieldName);
            const result = await usersService.revealSensitiveField(id!, fieldName);
            setRevealedFields(prev => ({ ...prev, [fieldName]: result.value }));
            // Auto-hide after 10 seconds
            setTimeout(() => {
                setRevealedFields(prev => {
                    const next = { ...prev };
                    delete next[fieldName];
                    return next;
                });
            }, 10000);
        } catch (err: any) {
            toast.error(err.message || 'Failed to reveal field');
        } finally {
            setRevealingField(null);
        }
    }, [id, revealedFields]);

    // Queries
    const { data: employee, isLoading, error } = useQuery({
        queryKey: ['employee', id],
        queryFn: () => usersService.getUserById(id!),
        enabled: !!id,
    });

    const { data: departments = [] } = useQuery({
        queryKey: ['departments'],
        queryFn: () => departmentService.getDepartments(),
    });

    const { data: designations = [] } = useQuery({
        queryKey: ['designations'],
        queryFn: () => designationService.getDesignations(),
    });

    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts'],
        queryFn: () => getShifts(),
    });

    const { data: leaveBalances = [] } = useQuery({
        queryKey: ['employee-leave-balances', id],
        queryFn: () => leaveService.getEmployeeBalances(id!),
        enabled: !!id && canManage,
    });

    // Mutations
    const toggleStatusMutation = useMutation({
        mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
            usersService.updateStatus(userId, isActive),
        onSuccess: (updatedUser: any, variables) => {
            // Immediately update the employee details cache with the returned user
            const userId = (updatedUser && updatedUser.id) || variables.userId || id;
            if (updatedUser) {
                queryClient.setQueryData(['employee', userId], updatedUser);
            }
            // Also invalidate the employee list so any lists refresh
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Employee status updated');
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const terminateMutation = useMutation({
        mutationFn: (data: TerminateEmployeeData) =>
            usersService.terminateEmployee(id!, data),
        onSuccess: (result, variables) => {
            // Optimistically update the employee details cache to show terminated state immediately
            queryClient.setQueryData(['employee', id], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    is_active: false,
                    is_terminated: true,
                    termination_date: variables?.termination_date || old.termination_date,
                    termination_reason: variables?.termination_reason || old.termination_reason,
                };
            });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            setTerminateDialogOpen(false);
            toast.success(result.message);
            navigate('/dashboard/employees');
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const rehireMutation = useMutation({
        mutationFn: () => usersService.rehireEmployee(id!),
        onSuccess: (result) => {
            // Update cache to reflect rehired user immediately
            queryClient.setQueryData(['employee', id], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    is_active: true,
                    is_terminated: false,
                    termination_date: null,
                    termination_reason: null,
                };
            });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success(result.message);
        },
        onError: (err: Error) => toast.error(err.message),
    });

    // Find department and designation names
    const getDepartmentName = (deptId?: string) => {
        if (!deptId) return 'Not Assigned';
        const dept = departments.find(d => d.id === deptId);
        return dept?.name || 'Unknown';
    };

    const getDesignationName = (desigId?: string) => {
        if (!desigId) return 'Not Assigned';
        const desig = designations.find(d => d.id === desigId);
        return desig?.name || 'Unknown';
    };

    const getShiftName = (shiftId?: string, legacyShift?: string) => {
        if (shiftId) {
            const shift = shifts.find((s: any) => s.id === shiftId);
            if (shift) return `${shift.name} (${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)})`;
        }
        return legacyShift || 'Regular';
    };

    const tabs = [
        { id: 'personal', label: 'Personal', icon: UserIcon },
        { id: 'employment', label: 'Employment', icon: Briefcase },
        { id: 'financial', label: 'Financial', icon: Wallet },
        { id: 'documents', label: 'Documents', icon: FileText },
    ];

    if (isLoading) {
        return (
            <DashboardLayout title="Employee Details">
                <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !employee) {
        return (
            <DashboardLayout title="Employee Details">
                <Card>
                    <div className="text-center py-12">
                        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Employee Not Found
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            The employee you're looking for doesn't exist or has been removed.
                        </p>
                        <Button onClick={() => navigate('/dashboard/employees')}>
                            <ArrowLeft size={16} className="mr-2" />
                            Back to Employees
                        </Button>
                    </div>
                </Card>
            </DashboardLayout>
        );
    }

    const isTerminated = employee.is_terminated || !employee.is_active;

    return (
        <DashboardLayout
            title="Employee Details"
            breadcrumbs={[
                { label: 'Dashboard', href: '/dashboard/organization' },
                { label: 'Employees', href: '/dashboard/employees' },
                { label: `${employee.first_name} ${employee.last_name}` },
            ]}
        >
            <div className="space-y-6">
                {/* Header Card */}
                <Card>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                'w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg',
                                isTerminated ? 'bg-gray-400' : 'bg-gradient-to-br from-primary to-primary-dark'
                            )}>
                                {employee.first_name?.charAt(0)}{employee.last_name?.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {employee.first_name} {employee.last_name}
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400">{employee.email}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={cn(
                                        'px-3 py-1 rounded-full text-xs font-medium',
                                        employee.role === 'ADMIN' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                                        employee.role === 'HR' && 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
                                        employee.role === 'MANAGER' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                                        employee.role === 'EMPLOYEE' && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
                                    )}>
                                        {employee.role?.replace('_', ' ')}
                                    </span>
                                    <span className={cn(
                                        'px-3 py-1 rounded-full text-xs font-medium',
                                        employee.is_active
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    )}>
                                        {employee.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                    {employee.is_terminated && (
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                            Terminated
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {canManage && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <Button variant="outline" onClick={() => navigate(`/dashboard/employees/${id}/edit`)}>
                                    <Edit size={16} className="mr-2" />
                                    Edit
                                </Button>

                                {employee.is_terminated ? (
                                    <Button
                                        variant="primary"
                                        onClick={() => rehireMutation.mutate()}
                                        isLoading={rehireMutation.isPending}
                                    >
                                        <UserCheck size={16} className="mr-2" />
                                        Rehire
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            variant="outline"
                                            onClick={() => toggleStatusMutation.mutate({
                                                userId: employee.id,
                                                isActive: !employee.is_active
                                            })}
                                            isLoading={toggleStatusMutation.isPending}
                                            disabled={toggleStatusMutation.isPending || currentUser?.id === employee.id}
                                            title={
                                                currentUser?.id === employee.id
                                                    ? "You cannot deactivate your own account"
                                                    : employee.is_active ? 'Deactivate' : 'Activate'
                                            }
                                            className={cn(
                                                currentUser?.id === employee.id ? 'opacity-50 cursor-not-allowed' : '',
                                                employee.is_active ? 'text-red-600 border-red-300 hover:bg-red-50' : 'text-green-600 border-green-300 hover:bg-green-50'
                                            )}
                                        >
                                            {employee.is_active ? <UserX size={16} className="mr-2" /> : <UserCheck size={16} className="mr-2" />}
                                            {employee.is_active ? 'Deactivate' : 'Activate'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={() => setTerminateDialogOpen(true)}
                                            disabled={currentUser?.id === employee.id}
                                            title={currentUser?.id === employee.id ? "You cannot terminate your own account" : "Terminate Employee"}
                                        >
                                            <UserX size={16} className="mr-2" />
                                            Terminate
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </Card>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                                activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            )}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'personal' && (
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Contact Information
                            </h3>
                            <div className="space-y-4">
                                <InfoRow icon={Mail} label="Email" value={employee.email} />
                                <SensitiveInfoRow
                                    icon={Phone}
                                    label="Phone"
                                    maskedValue={employee.phone || 'Not provided'}
                                    fieldName="phone"
                                    revealedFields={revealedFields}
                                    revealingField={revealingField}
                                    onReveal={handleRevealField}
                                    hasValue={!!employee.phone}
                                />
                                <InfoRow icon={MapPin} label="Address" value={employee.address || 'Not provided'} />
                            </div>
                        </Card>

                        <Card>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Personal Details
                            </h3>
                            <div className="space-y-4">
                                <InfoRow icon={Calendar} label="Date of Birth" value={employee.date_of_birth ? format(new Date(employee.date_of_birth), 'MMM dd, yyyy') : 'Not provided'} />
                                <InfoRow icon={UserIcon} label="Gender" value={employee.gender || 'Not provided'} />
                                <InfoRow icon={Heart} label="Marital Status" value={employee.marital_status || 'Not provided'} />
                                <InfoRow icon={MapPin} label="Nationality" value={employee.nationality || 'Not provided'} />
                            </div>
                        </Card>

                        <Card className="md:col-span-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Emergency Contact
                            </h3>
                            <div className="grid md:grid-cols-3 gap-4">
                                <InfoRow icon={UserIcon} label="Name" value={employee.emergency_name || 'Not provided'} />
                                <SensitiveInfoRow
                                    icon={Phone}
                                    label="Phone"
                                    maskedValue={employee.emergency_phone || 'Not provided'}
                                    fieldName="emergency_phone"
                                    revealedFields={revealedFields}
                                    revealingField={revealingField}
                                    onReveal={handleRevealField}
                                    hasValue={!!employee.emergency_phone}
                                />
                                <InfoRow icon={Users} label="Relationship" value={employee.emergency_relation || 'Not provided'} />
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'employment' && (
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Employment Details
                            </h3>
                            <div className="space-y-4">
                                <InfoRow icon={Briefcase} label="Employee ID" value={employee.employee_id || 'Not assigned'} />
                                <InfoRow icon={Building2} label="Department" value={getDepartmentName(employee.department_id)} />
                                <InfoRow icon={Briefcase} label="Designation" value={getDesignationName(employee.designation_id)} />
                                <InfoRow icon={UserIcon} label="Reports To" value={employee.manager?.first_name ? `${employee.manager.first_name} ${employee.manager.last_name}` : 'Not assigned'} />
                            </div>
                        </Card>

                        <Card>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Work Schedule
                            </h3>
                            <div className="space-y-4">
                                <InfoRow icon={Calendar} label="Join Date" value={employee.join_date ? format(new Date(employee.join_date), 'MMM dd, yyyy') : 'Not provided'} />
                                <InfoRow icon={Briefcase} label="Employment Type" value={employee.employment_type || 'Full-time'} />
                                <InfoRow icon={Clock} label="Shift" value={getShiftName(employee.shift_id, employee.shift)} />
                                <InfoRow icon={MapPin} label="Job Location" value={employee.job_location || 'Not provided'} />
                            </div>
                        </Card>

                        {canManage && leaveBalances.length > 0 && (
                            <Card className="md:col-span-2">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Leave Balances
                                </h3>
                                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    {leaveBalances.map((balance: any) => (
                                        <div key={balance.leave_type_id || balance.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {balance.leave_type?.name || 'Leave'}
                                            </p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {balance.available || 0}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                of {balance.entitled || 0} days
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>
                )}

                {activeTab === 'financial' && (
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Bank Details
                                </h3>
                                <div className="space-y-4">
                                    <InfoRow icon={Building2} label="Bank Name" value={employee.bank_name || 'Not provided'} />
                                    <InfoRow icon={Building2} label="Branch Name" value={employee.branch_name || 'Not provided'} />
                                    <InfoRow icon={UserIcon} label="Account Name" value={employee.account_name || 'Not provided'} />
                                    <SensitiveInfoRow icon={Wallet} label="Account Number" maskedValue={employee.account_number || 'Not provided'} fieldName="account_number" revealedFields={revealedFields} revealingField={revealingField} onReveal={handleRevealField} hasValue={!!employee.account_number} />
                                    <SensitiveInfoRow icon={Wallet} label="IFSC Code" maskedValue={employee.ifsc_code || 'Not provided'} fieldName="ifsc_code" revealedFields={revealedFields} revealingField={revealingField} onReveal={handleRevealField} hasValue={!!employee.ifsc_code} />
                                </div>
                            </Card>
                            <Card>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Payroll & Tax Information
                                </h3>
                                <div className="space-y-4">
                                    <SensitiveInfoRow icon={FileText} label="Tax ID (PAN)" maskedValue={employee.tax_id || 'Not provided'} fieldName="tax_id" revealedFields={revealedFields} revealingField={revealingField} onReveal={handleRevealField} hasValue={!!employee.tax_id} />
                                    <SensitiveInfoRow icon={FileText} label="Aadhaar Number" maskedValue={employee.aadhar_number || 'Not provided'} fieldName="aadhar_number" revealedFields={revealedFields} revealingField={revealingField} onReveal={handleRevealField} hasValue={!!employee.aadhar_number} />
                                    <InfoRow icon={Wallet} label="Annual Salary (CTC)" value={
                                        employee.annual_salary
                                            ? `₹${Number(employee.annual_salary).toLocaleString('en-IN')}`
                                            : (employee.ctc ? `₹${Number(employee.ctc).toLocaleString('en-IN')}` : 'Not provided')
                                    } />
                                    <SensitiveInfoRow icon={FileText} label="UAN" maskedValue={employee.uan || 'Not provided'} fieldName="uan" revealedFields={revealedFields} revealingField={revealingField} onReveal={handleRevealField} hasValue={!!employee.uan} />
                                    <SensitiveInfoRow icon={Wallet} label="PF A/C Number" maskedValue={employee.pf_account || 'Not provided'} fieldName="pf_account" revealedFields={revealedFields} revealingField={revealingField} onReveal={handleRevealField} hasValue={!!employee.pf_account} />
                                    <SensitiveInfoRow icon={FileText} label="ESI Number" maskedValue={employee.esi_number || 'Not provided'} fieldName="esi_number" revealedFields={revealedFields} revealingField={revealingField} onReveal={handleRevealField} hasValue={!!employee.esi_number} />
                                </div>
                            </Card>
                        </div>

                        {canManage && employee.employee_uuid && (
                            <SalaryAssignmentSection employeeId={employee.employee_uuid} />
                        )}
                    </div>
                )}

                {activeTab === 'documents' && (
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Documents
                            </h3>
                            <Button onClick={() => navigate(`/dashboard/employees/${id}/documents`)}>
                                <FileText size={16} className="mr-2" />
                                View All Documents
                            </Button>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            Click "View All Documents" to manage employee documents.
                        </p>
                    </Card>
                )}
            </div>

            {/* Terminate Dialog */}
            <Dialog
                open={terminateDialogOpen}
                onOpenChange={setTerminateDialogOpen}
                title="Terminate Employee"
                className="max-w-md"
            >
                <form onSubmit={(e) => { e.preventDefault(); terminateMutation.mutate(terminateData); }}>
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            <p className="text-sm text-red-700 dark:text-red-400">
                                <strong>Warning:</strong> This action will terminate {employee.first_name} {employee.last_name}'s employment.
                                They will lose access to the system.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Termination Date *
                            </label>
                            <input
                                type="date"
                                value={terminateData.termination_date}
                                onChange={(e) => setTerminateData({ ...terminateData, termination_date: e.target.value })}
                                required
                                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Reason for Termination
                            </label>
                            <textarea
                                value={terminateData.termination_reason}
                                onChange={(e) => setTerminateData({ ...terminateData, termination_reason: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
                                placeholder="Optional reason for termination..."
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                        <Button type="button" variant="ghost" onClick={() => setTerminateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            className="bg-red-600 hover:bg-red-700"
                            isLoading={terminateMutation.isPending}
                        >
                            Confirm Termination
                        </Button>
                    </div>
                </form>
            </Dialog>
        </DashboardLayout>
    );
};

// Helper component for info rows
const InfoRow: React.FC<{
    icon: React.ElementType;
    label: string;
    value: string;
}> = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3">
        <Icon size={18} className="text-gray-400 mt-0.5" />
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-gray-900 dark:text-white">{value}</p>
        </div>
    </div>
);

// Sensitive info row with eye-icon reveal toggle
const SensitiveInfoRow: React.FC<{
    icon: React.ElementType;
    label: string;
    maskedValue: string;
    fieldName: string;
    revealedFields: Record<string, string>;
    revealingField: string | null;
    onReveal: (field: string) => void;
    hasValue: boolean;
}> = ({ icon: Icon, label, maskedValue, fieldName, revealedFields, revealingField, onReveal, hasValue }) => {
    const isRevealed = !!revealedFields[fieldName];
    const isLoading = revealingField === fieldName;
    const displayValue = isRevealed ? revealedFields[fieldName] : maskedValue;

    return (
        <div className="flex items-start gap-3">
            <Icon size={18} className="text-gray-400 mt-0.5" />
            <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                <div className="flex items-center gap-2">
                    <p className={cn(
                        "text-gray-900 dark:text-white font-mono",
                        isRevealed && "text-primary font-semibold"
                    )}>
                        {displayValue}
                    </p>
                    {hasValue && (
                        <button
                            onClick={() => onReveal(fieldName)}
                            disabled={isLoading}
                            className={cn(
                                "p-1 rounded-md transition-all hover:bg-gray-100 dark:hover:bg-gray-700",
                                isRevealed ? "text-primary" : "text-gray-400 hover:text-gray-600"
                            )}
                            title={isRevealed ? 'Hide' : 'Reveal (audit-logged)'}
                        >
                            {isLoading ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : isRevealed ? (
                                <EyeOff size={14} />
                            ) : (
                                <Eye size={14} />
                            )}
                        </button>
                    )}
                </div>
                {isRevealed && (
                    <p className="text-[10px] text-amber-500 mt-0.5">Auto-hides in 10s</p>
                )}
            </div>
        </div>
    );
};

export default EmployeeDetailsPage;
