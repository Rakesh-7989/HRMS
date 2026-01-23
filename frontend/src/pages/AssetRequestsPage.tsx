import React from 'react';
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
    ArrowLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const AssetRequestsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isAdminOrHR = ['ADMIN', 'HR'].includes(user?.role || '');

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
                return <span className="text-blue-600 dark:text-blue-400 font-semibold">{priority}</span>;
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
                                        {isAdminOrHR && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>}
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
                                            {isAdminOrHR && (
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    {request.status === 'PENDING' ? (
                                                        <div className="flex justify-end space-x-2">
                                                            {(() => {
                                                                const isSelfRequest = user?.id === request.employee_id;
                                                                return (
                                                                    <>
                                                                        <Button
                                                                            size="sm"
                                                                            className={`${isSelfRequest
                                                                                ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed opacity-60'
                                                                                : 'bg-green-600 hover:bg-green-700'
                                                                                }`}
                                                                            disabled={isSelfRequest}
                                                                            title={isSelfRequest ? "You cannot approve your own request" : "Approve Request"}
                                                                            onClick={() => !isSelfRequest && handleActionMutation.mutate({ id: request.id, status: 'APPROVED' })}
                                                                        >
                                                                            Approve
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className={`${isSelfRequest
                                                                                ? 'text-gray-400 border-gray-200 cursor-not-allowed opacity-60 hover:bg-transparent'
                                                                                : 'text-red-600 border-red-200 hover:bg-red-50'
                                                                                }`}
                                                                            disabled={isSelfRequest}
                                                                            title={isSelfRequest ? "You cannot reject your own request" : "Reject Request"}
                                                                            onClick={() => {
                                                                                if (isSelfRequest) return;
                                                                                const notes = prompt('Reason for rejection?');
                                                                                if (notes !== null) {
                                                                                    handleActionMutation.mutate({ id: request.id, status: 'REJECTED', admin_notes: notes });
                                                                                }
                                                                            }}
                                                                        >
                                                                            Reject
                                                                        </Button>
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic text-xs">
                                                            {request.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                                                        </span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
        </DashboardLayout>
    );
};
