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
    ClipboardList,
    ArrowLeft,
    Edit,
    Trash2,
    X,
    FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '@/contexts/ConfirmContext';

export const AssetRequestsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { confirm, prompt: showPrompt } = useConfirm();
    const isAdminOrHR = ['ADMIN', 'HR'].includes(user?.role || '');

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
            toast.success('Request updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update request');
        }
    });

    const updateRequestMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            assetsService.updateRequest(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assetRequests'] });
            toast.success('Request updated successfully');
            setShowModal(false);
            resetForm();
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update request');
            setIsSubmitting(false);
        }
    });

    const cancelRequestMutation = useMutation({
        mutationFn: (id: string) => assetsService.cancelRequest(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assetRequests'] });
            toast.success('Request cancelled successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to cancel request');
        }
    });

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

    const handleEdit = (request: any) => {
        setFormData({
            asset_name: request.asset_name,
            category: request.category,
            priority: request.priority,
            reason: request.reason || ''
        });
        setEditingId(request.id);
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
                return <span className="text-violet-600 dark:text-violet-400 font-semibold">{priority}</span>;
        }
    };

    return (
        <DashboardLayout title="Asset Requests">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={() => navigate('/assets')} className="flex items-center gap-2">
                            <ArrowLeft size={16} />
                            Back
                        </Button>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Asset Requests</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {isAdminOrHR
                                    ? 'Review and manage asset requests from all employees.'
                                    : 'View your submitted asset requests and their status.'}
                            </p>
                        </div>
                    </div>
                </div>

                <Card>
                    {isLoading ? (
                        <div className="p-8 text-center">Loading requests...</div>
                    ) : !requests || requests.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <ClipboardList size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                            <p className="dark:text-gray-200">No asset requests found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset Details</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Requested On</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                    {requests.map((request: any) => (
                                        <tr key={request.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {request.first_name} {request.last_name}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">{request.employee_code}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{request.asset_name}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">{request.category}</div>
                                                {request.reason && (
                                                    <div className="mt-1 text-xs text-gray-400 max-w-xs truncate" title={request.reason}>
                                                        Reason: {request.reason}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {getPriorityBadge(request.priority)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(request.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {format(new Date(request.created_at), 'MMM dd, yyyy')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {request.status === 'PENDING' ? (
                                                    <div className="flex justify-end space-x-2">
                                                        {(() => {
                                                            const isSelfRequest = user?.employee_id === request.employee_id;

                                                            if (isSelfRequest) {
                                                                return (
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="text-violet-600 border-violet-200 hover:bg-violet-50"
                                                                            title="Edit Request"
                                                                            onClick={() => handleEdit(request)}
                                                                        >
                                                                            <Edit size={14} />
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                                                            title="Cancel Request"
                                                                            onClick={() => handleDelete(request.id)}
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </Button>
                                                                    </div>
                                                                );
                                                            }

                                                            if (isAdminOrHR) {
                                                                return (
                                                                    <>
                                                                        <Button
                                                                            size="sm"
                                                                            className="bg-green-600 hover:bg-green-700"
                                                                            title="Approve Request"
                                                                            onClick={() => handleActionMutation.mutate({ id: request.id, status: 'APPROVED' })}
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
                                                                                    handleActionMutation.mutate({ id: request.id, status: 'REJECTED', admin_notes: notes });
                                                                                }
                                                                            }}
                                                                        >
                                                                            Reject
                                                                        </Button>
                                                                    </>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs">
                                                        {request.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>

            {/* Edit Asset Request Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-purple-500/10">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <FileText size={22} className="text-primary" />
                                {isEditMode ? 'Edit Asset Request' : 'New Asset Request'}
                            </h2>
                            <button
                                onClick={() => { setShowModal(false); resetForm(); }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Asset Name / Description *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.asset_name}
                                    onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Category *
                                </label>
                                <select
                                    required
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Priority *
                                </label>
                                <select
                                    required
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Reason *
                                </label>
                                <textarea
                                    required
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    isLoading={isSubmitting}
                                >
                                    {isEditMode ? 'Update Request' : 'Submit Request'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};
