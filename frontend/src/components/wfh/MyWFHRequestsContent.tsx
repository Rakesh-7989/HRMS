import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { wfhService } from '@/services/wfh.service';
import { format } from 'date-fns';
import { Calendar, Clock, Home, CheckCircle2, XCircle, AlertCircle, Plus } from 'lucide-react';
import { WFHRequestDialog } from '@/components/wfh/WFHRequestDialog';
import { usePermissions } from '@/contexts/PermissionsContext';
import { DataTable } from '@/components/ui/DataTable';
import { useTranslation } from 'react-i18next';

export const MyWFHRequestsContent: React.FC = () => {
    const { t } = useTranslation();
    const { hasPermission } = usePermissions();
    const canCreate = hasPermission('wfh', 'create');
    const [isWFHDialogOpen, setIsWFHDialogOpen] = useState(false);
    const { data: myRequests = [], isLoading } = useQuery({
        queryKey: ['wfh-requests', 'my'],
        queryFn: () => wfhService.getMyRequests(),
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'REJECTED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'PENDING_HR': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'PENDING': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED': return <CheckCircle2 size={14} className="mr-1" />;
            case 'REJECTED': return <XCircle size={14} className="mr-1" />;
            case 'PENDING_HR':
            case 'PENDING': return <Clock size={14} className="mr-1" />;
            default: return null;
        }
    };

    const columns = [
        {
            header: t('common.date'),
            cell: (request: any) => (
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {format(new Date(request.request_date), 'MMM dd, yyyy')}
                    </span>
                </div>
            ),
        },
        {
            header: t('common.reason'),
            cell: (request: any) => request.reason,
        },
        {
            header: t('common.status'),
            cell: (request: any) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                    {getStatusIcon(request.status)}
                    {request.status === 'PENDING_HR' ? 'PENDING (HR)' : request.status}
                </span>
            ),
        },
        {
            header: t('common.notes'),
            cell: (request: any) => (
                <div className="text-xs">
                    {request.status === 'APPROVED' && request.approval_comment && (
                        <div className="flex items-start gap-1">
                            <AlertCircle size={12} className="mt-0.5" />
                            <span>{request.approval_comment}</span>
                        </div>
                    )}
                    {request.status === 'REJECTED' && request.rejection_reason && (
                        <div className="flex items-start gap-1 text-red-500">
                            <AlertCircle size={12} className="mt-0.5 shrink-0" />
                            <span className="leading-tight">Reason: {request.rejection_reason}</span>
                        </div>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('wfh.myRequests')}
                    </h3>
                    {canCreate && (
                        <Button
                            size="sm"
                            onClick={() => setIsWFHDialogOpen(true)}
                            className="flex items-center gap-2"
                        >
                            <Plus size={16} />
                            {t('wfh.newRequest')}
                        </Button>
                    )}
                </div>

                <DataTable
                    data={myRequests}
                    columns={columns}
                    loading={isLoading}
                    emptyMessage={t('wfh.noRequestsYet')}
                />
            </Card>

            <WFHRequestDialog open={isWFHDialogOpen} onOpenChange={setIsWFHDialogOpen} />
        </div>
    );
};
