import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { assetsService } from '@/services/assets.service';
import { ArrowLeft, Save, AlertTriangle, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useTranslation } from 'react-i18next';

interface ChecklistItem {
    item_name: string;
    is_returned: boolean;
    notes: string;
}

export const AssetReturnPage: React.FC = () => {
  const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        return_date: new Date().toISOString().split('T')[0],
        condition: 'GOOD',
        notes: '',
    });

    const { hasPermission } = usePermissions();
    const canReturn = hasPermission('assets', 'assign');

    const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch asset details
    const { data: asset, isLoading } = useQuery({
        queryKey: ['asset', id],
        queryFn: () => assetsService.getAsset(id!),
        enabled: !!id,
    });

    // Fetch accessories from DB — what was actually given during assignment
    const { data: dbAccessories, isLoading: accessoriesLoading } = useQuery({
        queryKey: ['asset-accessories', id],
        queryFn: () => assetsService.getAssetAccessories(id!),
        enabled: !!id,
    });

    // Populate checklist from DB accessories once they load
    useEffect(() => {
        if (dbAccessories && dbAccessories.length > 0) {
            setChecklist(
                dbAccessories.map(acc => ({
                    item_name: acc.item_name,
                    is_returned: false,
                    notes: '',
                }))
            );
        }
    }, [dbAccessories]);

    const returnMutation = useMutation({
        mutationFn: (data: any) => assetsService.unassignAsset(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['asset', id] });
            queryClient.invalidateQueries({ queryKey: ['asset-accessories', id] });
            toast.success('Asset returned successfully');
            navigate(`/assets/${id}`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to return asset');
            setIsSubmitting(false);
        },
    });

    const handleChecklistChange = (index: number, field: keyof ChecklistItem, value: boolean | string) => {
        const updated = [...checklist];
        (updated[index] as any)[field] = value;
        setChecklist(updated);
    };

    const handleAddItem = () => {
        const trimmed = newItemName.trim();
        if (!trimmed) return;
        if (checklist.some(item => item.item_name.toLowerCase() === trimmed.toLowerCase())) {
            toast.error('This item is already in the checklist');
            return;
        }
        setChecklist(prev => [...prev, { item_name: trimmed, is_returned: false, notes: '' }]);
        setNewItemName('');
    };

    const handleRemoveItem = (index: number) => {
        setChecklist(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || isSubmitting) return;

        // Enforce notes when condition is DAMAGED or LOST
        if ((form.condition === 'DAMAGED' || form.condition === 'LOST') && !form.notes.trim()) {
            toast.error(`Please provide notes when marking asset as ${form.condition.toLowerCase()}.`);
            return;
        }

        setIsSubmitting(true);

        const checklistData = checklist.map(item => ({
            item_name: item.item_name,
            is_returned: item.is_returned,
            notes: item.notes || undefined,
        }));

        returnMutation.mutate({
            ...form,
            checklist: checklistData,
        });
    };

    const hasPartialReturn = checklist.length > 0 && checklist.some(item => !item.is_returned);
    const needsNotes = (form.condition === 'DAMAGED' || form.condition === 'LOST') && !form.notes.trim();

    if (isLoading || accessoriesLoading) {
        return (
            <DashboardLayout title="Loading...">
                <div className="flex justify-center p-8">{t('common.loading')}</div>
            </DashboardLayout>
        );
    }

    if (!asset) {
        return (
            <DashboardLayout title="Asset Not Found">
                <div className="text-center p-8">Asset not found</div>
            </DashboardLayout>
        );
    }

    if (!canReturn) {
        return (
            <DashboardLayout title="Access Denied">
                <Card>
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                            <X className="text-red-600 dark:text-red-400" size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                            You don't have permission to return assets. Please contact your administrator if you believe this is an error.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/assets')}
                            className="mt-6"
                        >
                            Back to Assets
                        </Button>
                    </div>
                </Card>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            title="Return Asset"
            breadcrumbs={[
                { label: t('common.breadcrumbs.assets'), href: '/assets' },
                { label: asset.name, href: `/assets/${asset.id}` },
                { label: 'Return' },
            ]}
        >
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => navigate(`/assets/${asset.id}`)}>
                        <ArrowLeft size={16} className="mr-2" />
                        Back
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Return Asset</h1>
                </div>

                <Card>
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">{asset.name}</h3>
                        <p className="text-sm text-gray-500 mb-1">Asset Code: {asset.asset_code}</p>
                        <p className="text-sm text-gray-500 mb-1">Category: {asset.category}</p>
                        <p className="text-sm text-gray-500 mb-1">
                            Currently Assigned To: {asset.assigned_employee?.first_name} {asset.assigned_employee?.last_name}
                        </p>
                        {asset.assigned_by_employee && (
                            <p className="text-sm text-gray-500">
                                Assigned By: {asset.assigned_by_employee.first_name} {asset.assigned_by_employee.last_name}
                            </p>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Return Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Return Date
                            </label>
                            <input
                                type="date"
                                required
                                value={form.return_date}
                                onChange={(e) => setForm({ ...form, return_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white dark:[color-scheme:dark]"
                            />
                        </div>

                        {/* Asset Condition */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Asset Condition
                            </label>
                            <select
                                value={form.condition}
                                onChange={(e) => setForm({ ...form, condition: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            >
                                <option value="GOOD">Good</option>
                                <option value="WORN">Worn / Minor Damage</option>
                                <option value="DAMAGED">Damaged / Needs Repair</option>
                                <option value="LOST">Lost</option>
                                <option value="DOA">Dead on Arrival (DOA)</option>
                            </select>
                        </div>

                        {/* Return Checklist — DB Driven */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                Return Checklist — Accessories
                            </h4>
                            <div className="space-y-3">
                                {checklist.length === 0 && (
                                    <p className="text-sm text-gray-400 italic">
                                        No accessories were recorded during assignment. Add items below if applicable.
                                    </p>
                                )}
                                {checklist.map((item, index) => (
                                    <div key={index} className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={item.is_returned}
                                            onChange={(e) => handleChecklistChange(index, 'is_returned', e.target.checked)}
                                            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <div className="flex-1">
                                            <span className={`text-sm ${item.is_returned ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {item.item_name}
                                            </span>
                                            {!item.is_returned && (
                                                <input
                                                    type="text"
                                                    placeholder="Reason not returned..."
                                                    value={item.notes}
                                                    onChange={(e) => handleChecklistChange(index, 'notes', e.target.value)}
                                                    className="mt-1 w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
                                                />
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(index)}
                                            className="mt-0.5 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Remove item"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add custom item */}
                            <div className="mt-3 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
                                    placeholder="Add custom item..."
                                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    disabled={!newItemName.trim()}
                                    className="flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-primary hover:text-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Plus size={14} />
                                    Add
                                </button>
                            </div>

                            {hasPartialReturn && (
                                <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs">
                                    <AlertTriangle size={14} />
                                    Some accessories are not returned. Asset will be marked as "Under Repair" until resolved.
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Notes {(form.condition === 'DAMAGED' || form.condition === 'LOST') && (
                                    <span className="text-red-500">* (Required for {form.condition.toLowerCase()} assets)</span>
                                )}
                            </label>
                            <textarea
                                rows={3}
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${needsNotes
                                    ? 'border-red-400 dark:border-red-500'
                                    : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                placeholder="Any comments about the return..."
                            />
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end pt-4">
                            <Button
                                type="submit"
                                disabled={isSubmitting || returnMutation.isPending}
                                className="flex items-center gap-2"
                            >
                                <Save size={16} />
                                {isSubmitting || returnMutation.isPending ? 'Processing...' : 'Confirm Return'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </DashboardLayout>
    );
};
