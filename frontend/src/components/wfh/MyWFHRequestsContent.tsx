import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { wfhService } from '@/services/wfh.service';
import { format } from 'date-fns';
import { Calendar, Clock, Home, CheckCircle2, XCircle, AlertCircle, Plus } from 'lucide-react';
import { WFHRequestDialog } from '@/components/wfh/WFHRequestDialog';

export const MyWFHRequestsContent: React.FC = () => {
    const [isWFHDialogOpen, setIsWFHDialogOpen] = useState(false);
    const { data: myRequests = [], isLoading } = useQuery({
        queryKey: ['wfh-requests', 'my'],
        queryFn: () => wfhService.getMyRequests(),
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'REJECTED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'PENDING': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED': return <CheckCircle2 size={14} className="mr-1" />;
            case 'REJECTED': return <XCircle size={14} className="mr-1" />;
            case 'PENDING': return <Clock size={14} className="mr-1" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        My WFH Requests
                    </h3>
                    <Button
                        size="sm"
                        onClick={() => setIsWFHDialogOpen(true)}
                        className="flex items-center gap-2"
                    >
                        <Plus size={16} />
                        New Request
                    </Button>
                </div>

                {isLoading ? (
                    <div className="h-48 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    </div>
                ) : myRequests.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-muted">
                        <Home className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700 mb-4" />
                        <p>You haven't made any WFH requests yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {myRequests.map((request) => (
                                    <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-gray-400" />
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {format(new Date(request.request_date), 'MMM dd, yyyy')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                            {request.reason}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                                                {getStatusIcon(request.status)}
                                                {request.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                                            {request.status === 'APPROVED' && request.approval_comment && (
                                                <div className="flex items-start gap-1">
                                                    <AlertCircle size={12} className="mt-0.5" />
                                                    <span>{request.approval_comment}</span>
                                                </div>
                                            )}
                                            {request.status === 'REJECTED' && request.rejection_reason && (
                                                <div className="flex items-start gap-1 text-red-500">
                                                    <AlertCircle size={12} className="mt-0.5" />
                                                    <span>{request.rejection_reason}</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <WFHRequestDialog open={isWFHDialogOpen} onOpenChange={setIsWFHDialogOpen} />
        </div>
    );
};
