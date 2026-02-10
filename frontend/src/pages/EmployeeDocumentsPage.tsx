import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { documentsService } from '@/services/documents.service';
import { usersService } from '@/services/users.service';
import { FileText, Upload, Trash2, Download, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useConfirm } from '@/contexts/ConfirmContext';

export const EmployeeDocumentsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    const { confirm } = useConfirm();
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const { data: employee } = useQuery({
        queryKey: ['employee', id],
        queryFn: async () => {
            const employees = await usersService.getUsers({});
            return employees.find(e => e.id === id);
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
            toast.success('Document deleted');
        }
    });

    const uploadMutation = useMutation({
        mutationFn: (data: { file_name: string; file_url: string; file_type: string }) =>
            documentsService.uploadDocument(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employee-documents', id] });
            toast('Document uploaded successfully', { icon: '✅' });
        },
        onError: (error: any) => {
            console.error('Upload failed:', error);
            const msg = error?.response?.data?.message || 'Failed to upload document';
            toast(msg, { icon: '⚠️' });
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
            toast('File size too large (max 8MB)', { icon: '⚠️' });
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
                { label: 'Dashboard', href: '/' },
                { label: 'Employees', href: '/employees' },
                { label: 'Documents' }
            ]}
        >
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Find documents..."
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
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

                <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Document Name</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded On</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                            {isLoading ? (
                                <tr><td colSpan={4} className="py-8 text-center text-gray-400">Loading documents...</td></tr>
                            ) : filteredDocs.length === 0 ? (
                                <tr><td colSpan={4} className="py-8 text-center text-gray-400">No documents found</td></tr>
                            ) : (
                                filteredDocs.map(doc => (
                                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                    <FileText size={18} />
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white">{doc.file_name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-xs text-gray-500">{doc.file_type || 'Unknown'}</span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-xs text-gray-500">{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <a
                                                    href={doc.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-400"
                                                >
                                                    <Download size={16} />
                                                </a>
                                                <button
                                                    onClick={async () => {
                                                        const result = await confirm({
                                                            title: 'Delete Document',
                                                            message: `Are you sure you want to delete "${doc.file_name}"? This action cannot be undone.`,
                                                            type: 'destructive',
                                                            confirmText: 'Delete',
                                                            cancelText: 'Cancel'
                                                        });
                                                        if (result) {
                                                            deleteMutation.mutate(doc.id);
                                                        }
                                                    }}
                                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
};
