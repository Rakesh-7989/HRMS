import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { assetsService } from '@/services/assets.service';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

export const AssetReturnPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        return_date: new Date().toISOString().split('T')[0],
        condition: 'GOOD',
        notes: '',
    });

    const { data: asset, isLoading } = useQuery({
        queryKey: ['asset', id],
        queryFn: () => assetsService.getAsset(id!),
        enabled: !!id,
    });

    const returnMutation = useMutation({
        mutationFn: (data: typeof form) => assetsService.unassignAsset(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['asset', id] });
            navigate(`/assets/${id}`);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        returnMutation.mutate(form);
    };

    if (isLoading) {
        return (
            <DashboardLayout title="Loading...">
                <div className="flex justify-center p-8">Loading...</div>
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

    return (
        <DashboardLayout
            title="Return Asset"
            breadcrumbs={[
                { label: 'Assets', href: '/assets' },
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
                        <p className="text-sm text-gray-500">
                            Currently Assigned To: {asset.assigned_employee?.first_name} {asset.assigned_employee?.last_name}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Return Date
                            </label>
                            <input
                                type="date"
                                required
                                value={form.return_date}
                                onChange={(e) => setForm({ ...form, return_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Asset Condition
                            </label>
                            <select
                                value={form.condition}
                                onChange={(e) => setForm({ ...form, condition: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                                <option value="GOOD">Good</option>
                                <option value="WORN">Worn / Minor Damage</option>
                                <option value="DAMAGED">Damaged / Needs Repair</option>
                                <option value="LOST">Lost</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Notes
                            </label>
                            <textarea
                                rows={3}
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="Any comments about the return..."
                            />
                        </div>

                        {returnMutation.isError && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md flex items-center gap-2">
                                <AlertCircle size={16} />
                                Failed to return asset. Please try again.
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={returnMutation.isPending} className="flex items-center gap-2">
                                <Save size={16} />
                                {returnMutation.isPending ? 'Processing...' : 'Confirm Return'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </DashboardLayout>
    );
};
