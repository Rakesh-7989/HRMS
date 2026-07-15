import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { assetsService } from '@/services/assets.service';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle,
    XCircle,
    Clock,
    ArrowLeft,
    Edit,
    Trash2
} from 'lucide-react';
import { showToast } from '@/utils/toast';
import { useConfirm } from '@/contexts/ConfirmContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/Dialog';
import { DataTable } from '@/components/ui/DataTable';
import { ROUTES } from '@/utils/constants';

export const AssetRequestsPage: React.FC = () => {
  const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { confirm, prompt: showPrompt } = useConfirm();
    const { hasPermission } = usePermissions();
    const canManageRequests = hasPermission('assets', 'manage_requests') || hasPermission('assets', 'manage');
    const canRequest = hasPermission('assets', 'request');
    const canView = hasPermission('assets', 'view') || canManageRequests;

    // Edit/Delete State
    const [showModal, setShowModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        asset_name: '',
        category: 'Laptop',
        priority: 'Medium',
        reason: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: requests, isLoading } = useQuery({
        queryKey: ['assetRequests'],
        queryFn: () => assetsService.listRequests(),
    });

    const handleActionMutation = useMutation({
        mutationFn: ({ id, status, admin_notes }: { id: string; status: 'APPROVED' | 'REJECTED', admin_notes?: string }) =>
            assetsService.handleRequest(id, { status, admin_notes }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assetRequests'] });
            showToast.success(t('assets.requestUpdated'));
        },
        onError: (error: unknown) => {
            showToast.error((error as {message?: string}).message || t('assets.updateRequestFailed'));
        }
    });

    const updateRequestMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
            assetsService.updateRequest(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assetRequests'] });
            showToast.success(t('assets.requestUpdated'));
            setShowModal(false);
            resetForm();
        },
        onError: (error: unknown) => {
            showToast.error((error as {message?: string}).message || t('assets.updateRequestFailed'));
            setIsSubmitting(false);
        }
    });

    const cancelRequestMutation = useMutation({
        mutationFn: (id: string) => assetsService.cancelRequest(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assetRequests'] });
            showToast.success(t('assets.requestCancelled'));
        },
        onError: (error: unknown) => {
            showToast.error((error as {message?: string}).message || t('assets.cancelRequestFailed'));
        }
    });

    if (!canView && !canRequest) {
        return (
            <DashboardLayout title="Access Denied">
                <Card>
                    <p className="p-8 text-center text-gray-500">You do not have permission to view asset requests.</p>
                </Card>
            </DashboardLayout>
        );
    }

    const resetForm = () => {
        setFormData({
            asset_name: '',
            category: 'Laptop',
            priority: 'Medium',
            reason: ''
        });
        setEditingId(null);
        setIsEditMode(false);
        setIsSubmitting(false);
    };

    const handleEdit = (request: unknown) => {
        const r = request as Record<string, unknown>;
        setFormData({
            asset_name: r.asset_name as string,
            category: r.category as string,
            priority: r.priority as string,
            reason: (r.reason as string) || ''
        });
        setEditingId(r.id as string);
        setIsEditMode(true);
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        const result = await confirm({
            title: 'Cancel Request',
            message: 'Are you sure you want to cancel this asset request? This action cannot be undone.',
            type: 'destructive',
            confirmText: 'Cancel Request',
            cancelText: 'Keep Request'
        });
        if (result) {
            cancelRequestMutation.mutate(id);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (isEditMode && editingId) {
            updateRequestMutation.mutate({ id: editingId, data: formData });
        } else {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        <CheckCircle size={12} className="mr-1" /> Approved
                    </span>
                );
            case 'REJECTED':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                        <XCircle size={12} className="mr-1" /> Rejected
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                        <Clock size={12} className="mr-1" /> Pending
                    </span>
                );
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'High':
                return <span className="text-red-600 dark:text-red-400 font-semibold">{priority}</span>;
            case 'Medium':
                return <span className="text-orange-600 dark:text-orange-400 font-semibold">{priority}</span>;
            default:
                return <span className="text-brand-600 dark:text-brand-400 font-semibold">{priority}</span>;
        }
    };

    return (
        <DashboardLayout title={t('assets.assetRequests')}>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.ASSETS)} className="flex items-center gap-2">
                            <ArrowLeft size={16} />
                            Back
                        </Button>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Asset Requests</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {canManageRequests
                                    ? 'Review and manage asset requests from all employees.'
                                    : 'View your submitted asset requests and their status.'}
                            </p>
                        </div>
                    </div>
                </div>

                <Card>
                    <DataTable
                        columns={[
                            {
                                header: 'Employee',
                                cell: (row: Record<string, unknown>) => (
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {row.first_name as string} {row.last_name as string}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{row.employee_code as string}</div>
                                    </div>
                                ),
                                sortKey: 'first_name',
                            },
                            {
                                header: 'Asset Details',
                                cell: (row: Record<string, unknown>) => (
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{row.asset_name as string}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{row.category as string}</div>
                                        {(row.reason as string) && (
                                            <div className="mt-1 text-xs text-gray-400 max-w-xs truncate" title={(row.reason as string)}>
                                                Reason: {row.reason as string}
                                            </div>
                                        )}
                                    </div>
                                ),
                                sortKey: 'asset_name',
                            },
                            {
                                header: 'Priority',
                                cell: (row: Record<string, unknown>) => getPriorityBadge(row.priority as string),
                                sortKey: 'priority',
                            },
                            {
                                header: 'Status',
                                cell: (row: Record<string, unknown>) => getStatusBadge(row.status as string),
                                sortKey: 'status',
                            },
                            {
                                header: 'Requested On',
                                cell: (row: Record<string, unknown>) => format(new Date(row.created_at as string), 'MMM dd, yyyy'),
                                sortKey: 'created_at',
                            },
                            {
                                header: 'Actions',
                                cell: (row: Record<string, unknown>) => {
                                    if ((row.status as string) !== 'PENDING') {
                                        return <span className="text-gray-400 italic text-xs">{(row.status as string) === 'APPROVED' ? 'Approved' : 'Rejected'}</span>;
                                    }
                                    const isSelfRequest = (user as unknown as Record<string, unknown>)?.employee_id === (row.employee_id as string);
                                    if (isSelfRequest) {
                                        return (
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-brand-600 border-brand-200 hover:bg-brand-50"
                                                    title="Edit Request"
                                                    onClick={() => handleEdit(row)}
                                                >
                                                    <Edit size={14} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                                    title="Cancel Request"
                                                    onClick={() => handleDelete(row.id as string)}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        );
                                    }
                                    if (canManageRequests) {
                                        return (
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700"
                                                    title="Approve Request"
                                                    onClick={() => handleActionMutation.mutate({ id: row.id as string, status: 'APPROVED' })}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                                    title="Reject Request"
                                                    onClick={async () => {
                                                        const notes = await showPrompt({
                                                            title: 'Reject Request',
                                                            message: 'Please provide a reason for rejecting this request.',
                                                            placeholder: 'Reason for rejection...',
                                                            confirmText: 'Reject',
                                                            cancelText: 'Cancel'
                                                        });
                                                        if (notes !== null) {
                                                            handleActionMutation.mutate({ id: row.id as string, status: 'REJECTED', admin_notes: notes });
                                                        }
                                                    }}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        );
                                                    }
                                    return null;
                                },
                            },
                        ]}
                        data={requests as unknown as Record<string, unknown>[] || []}
                        loading={isLoading}
                        emptyMessage="No asset requests found."
                        pageSize={10}
                    />
                </Card>
            </div>

            {/* Edit Asset Request Modal */}
            <Dialog
                open={showModal}
                onOpenChange={(open) => { if (!open) { setShowModal(false); resetForm(); } }}
                onBack={() => { setShowModal(false); resetForm(); }}
                title={isEditMode ? 'Edit Asset Request' : 'New Asset Request'}
                description="Provide details for your asset request"
                className="max-w-md"
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => { setShowModal(false); resetForm(); }}
                            disabled={isSubmitting}
                            className="rounded-2xl border-neutral-200 dark:border-white/10 text-slate-500 font-bold hover:bg-neutral-50 dark:hover:bg-white/5"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="edit-request-form"
                            disabled={isSubmitting}
                            isLoading={isSubmitting}
                            className="rounded-2xl bg-brand-500 text-white font-bold min-w-[140px]"
                        >
                            {isEditMode ? 'Update Request' : 'Submit Request'}
                        </Button>
                    </div>
                }
            >
                <form id="edit-request-form" onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="assetrequest-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Asset Name / Description *
                        </label>
                        <input
                            id="assetrequest-name"
                            type="text"
                            required
                            value={formData.asset_name}
                            onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500/50 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                        />
                    </div>

                    <div>
                        <label htmlFor="assetrequest-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Category *
                        </label>
                        <select
                            id="assetrequest-category"
                            required
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500/50 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium cursor-pointer"
                        >
                            <option value="Laptop">Laptop</option>
                            <option value="Desktop">Desktop</option>
                            <option value="Mobile">Mobile</option>
                            <option value="Monitor">Monitor</option>
                            <option value="Printer">Printer</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="assetrequest-priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Priority *
                        </label>
                        <select
                            id="assetrequest-priority"
                            required
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500/50 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium cursor-pointer"
                        >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="assetrequest-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Reason *
                        </label>
                        <textarea
                            id="assetrequest-reason"
                            required
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500/50 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none font-medium"
                        />
                    </div>
                </form>
            </Dialog>
        </DashboardLayout>
    );
};
