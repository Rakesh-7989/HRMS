import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { documentsService } from '@/services/documents.service';
import { usersService } from '@/services/users.service';
import { FileText, Upload, Trash2, Download, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useConfirm } from '@/contexts/ConfirmContext';
import { showToast } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

export const EmployeeDocumentsPage: React.FC = () => {
  const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const { confirm } = useConfirm();
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const { data: employee } = useQuery({
        queryKey: ['employee', id],
        queryFn: async () => {
            const res = await usersService.getUsers({});
            return (res.data || []).find(e => e.id === id);
        },
        enabled: !!id
    });

    const { data: documents = [], isLoading } = useQuery({
        queryKey: ['employee-documents', id],
        queryFn: () => documentsService.getDocuments(id!),
        enabled: !!id
    });

    const deleteMutation = useMutation({
        mutationFn: (docId: string) => documentsService.deleteDocument(docId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employee-documents', id] });
            showToast.success(t('employees.documentDeleted'));
        },
        onError: (err: unknown) => {
            const message = (err as {response?: {data?: {message?: string}}}).response?.data?.message || (err as {message?: string}).message || 'Failed to delete';
            showToast.error(message);
        }
    });

    const uploadMutation = useMutation({
        mutationFn: (data: { file_name: string; file_url: string; file_type: string }) =>
            documentsService.uploadDocument(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employee-documents', id] });
            showToast.success(t('common.documentUploaded'));
        },
        onError: (error: unknown) => {
            console.error('Upload failed:', error);
            const msg = (error as {response?: {data?: {message?: string}}})?.response?.data?.message || (error as {message?: string}).message || 'Failed to upload document';
            showToast.error(msg);
        }
    });

    const handleUpload = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (limit to ~8MB to safely fit in 10MB JSON body with Base64 overhead)
        if (file.size > 8 * 1024 * 1024) {
            showToast.error(t('common.fileTooLarge'));
            e.currentTarget.value = '';
            return;
        }

        // Convert file to Base64 string
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            uploadMutation.mutate({
                file_name: file.name,
                file_url: base64String,
                file_type: file.type || 'application/octet-stream'
            });
        };
        reader.readAsDataURL(file);

        // clear the input so the same file can be picked again if needed
        e.currentTarget.value = '';
    };

    const filteredDocs = documents.filter(doc =>
        doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout
            title={`Documents: ${employee ? `${employee.first_name} ${employee.last_name}` : 'Loading...'}`}
            breadcrumbs={[
                { label: t('common.breadcrumbs.dashboard'), href: '/' },
                { label: t('common.breadcrumbs.employees'), href: '/dashboard/employees' },
                { label: 'Documents' }
            ]}
        >
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-elev-1">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Find documents..."
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500/50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
                    <Button onClick={handleUpload} className="flex items-center gap-2">
                        <Upload size={16} />
                        Upload New
                    </Button>
                </div>

                <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-elev-1">
                    {(() => {
                        const columns = [
                            {
                                header: t('common.documentName'),
                                cell: (doc: Record<string, unknown>) => (
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-brand-500/10 rounded-lg text-brand-500">
                                            <FileText size={18} />
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white">{doc.file_name as string}</span>
                                    </div>
                                ),
                            },
                            {
                                header: t('common.type'),
                                cell: (doc: Record<string, unknown>) => (
                                    <span className="text-xs text-gray-500">{(doc.file_type as string) || t('common.unknown')}</span>
                                ),
                            },
                            {
                                header: t('common.uploadedOn'),
                                cell: (doc: Record<string, unknown>) => (
                                    <span className="text-xs text-gray-500">{format(new Date(doc.created_at as string), 'MMM d, yyyy')}</span>
                                ),
                            },
                            {
                                header: t('common.actions'),
                                cell: (doc: Record<string, unknown>) => (
                                    <div className="flex items-center justify-end gap-2">
                                        <a
                                            href={doc.file_url as string}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-400"
                                            title={t('common.download')}
                                        >
                                            <Download size={16} />
                                        </a>
                                         <Button variant="ghost" 
                                            onClick={async () => {
                                                const result = await confirm({
                                                    title: t('profile.deleteDocumentTitle'),
                                                    message: t('profile.deleteDocumentMessage', { name: doc.file_name as string }),
                                                    type: 'destructive',
                                                    confirmText: t('common.delete'),
                                                    cancelText: t('common.cancel')
                                                });
                                                if (result) {
                                                    deleteMutation.mutate(doc.id as string);
                                                }
                                            }}
                                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600"
                                            title={t('common.delete')}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                ),
                            },
                        ];
                        return (
                            <DataTable
                                columns={columns}
                                data={filteredDocs as unknown as Record<string, unknown>[]}
                                loading={isLoading}
                                pageSize={10}
                                emptyMessage={t('common.noDocuments')}
                            />
                        );
                    })()}
                </div>
            </div>
        </DashboardLayout>
    );
};
