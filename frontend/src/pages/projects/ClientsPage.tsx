import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Building2, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { showToast } from '@/utils/toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui/Table';
import {
    Dialog,
    DialogContent,
    DialogFooter,
} from '@/components/ui/Dialog';
import { StatusBadge } from '@/components/projects/StatusBadge';

import { projectsService } from '@/services/projects.service';
import { usePermissions } from '@/contexts/PermissionsContext';
import type { Client, ClientStatus } from '@/types/project.types';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/utils/constants';

export const ClientsPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'VIEW' | 'EDIT' | 'CREATE'>('CREATE');
    // editingClient is used as selectedClient for both View and Edit modes
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    // New Client Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        country: '',
        zip_code: '',
        status: 'ACTIVE' as ClientStatus,
        notes: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { hasPermission } = usePermissions();
    const canManage = hasPermission('projects', 'manage');

    // Fetch Clients
    const { data: clients = [], isLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: projectsService.getClients,
    });

    // Create Client Mutation
    const createMutation = useMutation({
        mutationFn: projectsService.createClient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setIsModalOpen(false);
            setFormData({
                name: '',
                email: '',
                phone: '',
                address: '',
                city: '',
                state: '',
                country: '',
                zip_code: '',
                status: 'ACTIVE',
                notes: '',
            });
            setIsSubmitting(false);
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string } } };
            setIsSubmitting(false);
            showToast.error((err as {response?: {data?: {message?: string}}}).response?.data?.message || t('projects.clientCreateFailed'));
        },
    });

    // Update Client Mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
            projectsService.updateClient(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setIsModalOpen(false);
            setEditingClient(null);
            setIsSubmitting(false);
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string } } };
            setIsSubmitting(false);
            showToast.error((err as {response?: {data?: {message?: string}}}).response?.data?.message || t('projects.clientUpdateFailed'));
        },
    });

    // Delete Client Mutation
    const deleteMutation = useMutation({
        mutationFn: projectsService.deleteClient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setClientToDelete(null);
        },
        onError: (error: unknown) => {
            const err = error as { response?: { data?: { message?: string } } };
            showToast.error((err as {response?: {data?: {message?: string}}}).response?.data?.message || 'Failed to delete client. It may have linked projects.');
            setClientToDelete(null);
        },
    });

    // Delete confirmation state
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

    const handleOpenCreateModal = () => {
        setEditingClient(null);
        setModalMode('CREATE');
        setFormData({
            name: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            country: '',
            zip_code: '',
            status: 'ACTIVE',
            notes: '',
        });
        setIsModalOpen(true);
    };

    const handleOpenViewModal = (client: Client) => {
        setEditingClient(client);
        setModalMode('VIEW');
        setIsModalOpen(true);
    };

    const handleSwitchToEdit = () => {
        if (!editingClient) return;
        setModalMode('EDIT');
        setFormData({
            name: editingClient.name,
            email: editingClient.email || '',
            phone: editingClient.phone || '',
            address: editingClient.address || '',
            city: editingClient.city || '',
            state: editingClient.state || '',
            country: editingClient.country || '',
            zip_code: editingClient.zip_code || '',
            status: editingClient.status,
            notes: editingClient.notes || '',
        });
    };

    const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement;
        const id = target.id;
        if (id === 'name') {
            target.value = target.value.replace(/[^A-Za-z\s\-.]/g, '');
        } else if (id === 'phone') {
            target.value = target.value.replace(/[^0-9+\-()\s.]/g, '');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setIsSubmitting(true);
        if (modalMode === 'EDIT' && editingClient) {
            updateMutation.mutate({ id: editingClient.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const filteredClients = clients.filter((client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getModalTitle = () => {
        switch (modalMode) {
            case 'VIEW': return 'Client Details';
            case 'EDIT': return 'Edit Client';
            case 'CREATE': return 'Add New Client';
        }
    };

    const getModalDescription = () => {
        switch (modalMode) {
            case 'VIEW': return 'View client information.';
            case 'EDIT': return 'Update client details.';
            case 'CREATE': return 'Create a new client to associate with projects.';
        }
    };

    return (
        <DashboardLayout
            title="Clients"
            breadcrumbs={[
                { label: t('common.breadcrumbs.dashboard'), href: '/dashboard' },
                { label: t('common.breadcrumbs.projects'), href: '/projects' },
                { label: 'Clients' },
            ]}
        >
            <div className="space-y-6">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.PROJECTS)} className="flex items-center gap-2">
                            <ArrowLeft size={16} />
                            Back
                        </Button>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <Input
                                placeholder="Search clients..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {canManage && (
                        <Button onClick={handleOpenCreateModal}>
                            <Plus size={18} />
                            Add Client
                        </Button>
                    )}
                </div>

                {/* Clients Table */}
                <Card className="p-0 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created At</TableHead>
                                {canManage && <TableHead>Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell className="text-center py-8" >
                                        Loading clients...
                                    </TableCell>
                                </TableRow>
                            ) : filteredClients.length === 0 ? (
                                <TableRow>
                                    <TableCell className="text-center py-8" >
                                        No clients found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredClients.map((client) => (
                                    <TableRow
                                        key={client.id}
                                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                        onClick={() => handleOpenViewModal(client)}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500">
                                                    <Building2 size={20} />
                                                </div>
                                                <span className="font-medium">{client.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge type="client" status={client.status} />
                                        </TableCell>
                                        <TableCell>
                                            {client.created_at
                                                ? format(new Date(client.created_at), 'MMM dd, yyyy')
                                                : '-'}
                                        </TableCell>
                                        {canManage && (
                                            <TableCell>
                                                 <Button variant="ghost" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setClientToDelete(client);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Delete Client"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>

                {/* Create/Edit/View Client Modal */}
                <Dialog
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    title={getModalTitle()}
                    description={getModalDescription()}
                >
                    {modalMode === 'VIEW' && editingClient ? (
                        <div>
                            <DialogContent className="sm:max-w-[600px]">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label className="text-muted-foreground">Client Name</Label>
                                        <div className="font-medium">{editingClient.name}</div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Email Address</Label>
                                        <div>{editingClient.email || '-'}</div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Phone Number</Label>
                                        <div>{editingClient.phone || '-'}</div>
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label className="text-muted-foreground">Address</Label>
                                        <div>{editingClient.address || '-'}</div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">City</Label>
                                        <div>{editingClient.city || '-'}</div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">State / Province</Label>
                                        <div>{editingClient.state || '-'}</div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Country</Label>
                                        <div>{editingClient.country || '-'}</div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Zip / Postal Code</Label>
                                        <div>{editingClient.zip_code || '-'}</div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Status</Label>
                                        <div><StatusBadge type="client" status={editingClient.status} /></div>
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label className="text-muted-foreground">Notes</Label>
                                        <div className="whitespace-pre-wrap">{editingClient.notes || '-'}</div>
                                    </div>
                                </div>
                            </DialogContent>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>{t('common.close')}</Button>
                                {canManage && (
                                    <Button onClick={handleSwitchToEdit}><Edit size={16} className="mr-2" /> Edit Client</Button>
                                )}
                            </DialogFooter>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <DialogContent className="sm:max-w-[600px]">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="name">Client Name *</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            onInput={handleInput}
                                            placeholder="e.g. Acme Corp"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="client@example.com"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input
                                            id="phone"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            onInput={handleInput}
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>

                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="address">Address</Label>
                                        <Input
                                            id="address"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            placeholder="123 Main St"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            placeholder="New York"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="state">State / Province</Label>
                                        <Input
                                            id="state"
                                            value={formData.state}
                                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                            placeholder="NY"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="country">Country</Label>
                                        <Input
                                            id="country"
                                            value={formData.country}
                                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                            placeholder="United States"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="zip_code">Zip / Postal Code</Label>
                                        <Input
                                            id="zip_code"
                                            value={formData.zip_code}
                                            onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                                            placeholder="10001"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="status">Status</Label>
                                        <select
                                            id="status"
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as ClientStatus })}
                                            className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
                                        >
                                            <option value="ACTIVE">Active</option>
                                            <option value="INACTIVE">Inactive</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="notes">Notes</Label>
                                        <textarea
                                            id="notes"
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            placeholder="Additional information about the client..."
                                            className="flex min-h-[80px] w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 shadow-elev-1"
                                        />
                                    </div>
                                </div>
                            </DialogContent>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" isLoading={isSubmitting}>
                                    {modalMode === 'EDIT' ? "Update Client" : "Create Client"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog
                    open={!!clientToDelete}
                    onOpenChange={(open) => !open && setClientToDelete(null)}
                    title="Delete Client"
                    description="Are you sure you want to delete this client? This action cannot be undone."
                >
                    <DialogContent>
                        <p className="text-gray-600 dark:text-gray-400">
                            You are about to delete <strong>{clientToDelete?.name}</strong>.
                            This action cannot be undone.
                        </p>
                    </DialogContent>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setClientToDelete(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => clientToDelete && deleteMutation.mutate(clientToDelete.id)}
                            isLoading={deleteMutation.isPending}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </Dialog>
            </div>
        </DashboardLayout>
    );
};
