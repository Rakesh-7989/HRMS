import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { plansService, Plan } from '@/services/plans.service';
import { Edit2, Plus, Save, X, Check, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useTranslation } from 'react-i18next';

export const PlansPage: React.FC = () => {
  const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { confirm } = useConfirm();
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newPlan, setNewPlan] = useState<Partial<Plan>>({
        name: '',
        price: 0,
        max_employees: null,
        features: {
            dashboard: {
                new_joiners: true,
                birthdays: true,
                department_members: true,
                holidays: true,
                work_anniversaries: true,
                leave_availabilities: true,
                upcoming_holidays: true,
                important_links: true
            },
            collaboration: {
                timeline: true,
                news_feed: true,
                announcements: true,
                photo_album: true,
                external_video_sharing: true,
                external_article_sharing: true,
                comments_and_replies: true,
                reactions: true,
                news_feeds_moderations: true,
                tag_employees: true,
                comments_moderation: true
            },
            employee_management: {
                profile: true,
                self_service: true,
                directory: true,
                document_storage: true,
                inbox: true,
                single_sign_on: false,
                portal_access_restriction_date: true,
                termination: true,
                filter: true,
                delete: true
            }
        },
        is_active: true
    });

    const { data, isLoading, error } = useQuery({
        queryKey: ['plans-admin'],
        queryFn: () => plansService.getAdminPlans(),
    });

    const plans = Array.isArray(data) ? data : [];

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Plan> }) => plansService.updatePlan(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans-admin'] });
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            toast.success('Plan updated successfully');
            setEditingPlan(null);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update plan');
        }
    });

    const createMutation = useMutation({
        mutationFn: (data: Partial<Plan>) => plansService.createPlan(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans-admin'] });
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            toast.success('Plan created successfully');
            setIsCreating(false);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create plan');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => plansService.deletePlan(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans-admin'] });
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            toast.success('Plan deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete plan');
        }
    });

    const handleSave = () => {
        if (editingPlan) {
            updateMutation.mutate({ id: editingPlan.id, data: editingPlan });
        }
    };

    const handleCreate = () => {
        createMutation.mutate(newPlan);
    };

    const handleDelete = async (plan: Plan) => {
        const isConfirmed = await confirm({
            title: 'Delete Plan',
            description: `Are you sure you want to delete ${plan.name}? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'destructive'
        } as any);

        if (isConfirmed) {
            deleteMutation.mutate(plan.id);
        }
    };

    const categoryLabels: Record<string, string> = {
        dashboard: 'Dashboard Widgets',
        collaboration: 'Collaboration Tools',
        employee_management: 'Employee Management',
        leave_tracker: 'Leave Tracking',
        attendance_tracker: 'Attendance Tracking',
        project_management: 'Project Management',
        asset_management: 'Asset Management',
        employee_activity_monitoring: 'Activity Monitoring',
        automation: 'Workflow Automation',
        performance_management: 'Performance Management',
        payroll_automation: 'Payroll Automation',
        mobile_application: 'Mobile App',
        other_features: 'Additional Features',
    };

    if (isLoading) {
        return (
            <DashboardLayout title="Subscription Plans">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout title="Subscription Plans">
                <div className="p-8 text-center">
                    <p className="text-red-500 mb-4">Error loading plans: {(error as any).message}</p>
                    <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['plans'] })}>Retry</Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            title="Subscription Plans"
            breadcrumbs={[{ label: t('common.breadcrumbs.dashboard'), href: '/dashboard/system' }, { label: 'Plans' }]}
        >
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <p className="text-muted">Manage pricing plans and their features.</p>
                    <Button onClick={() => setIsCreating(true)} size="sm">
                        <Plus size={16} className="mr-2" />
                        Add Plan
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <Card key={plan.id} className="relative overflow-hidden group">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">{plan.name}</h3>
                                        <p className="text-2xl font-bold text-primary">₹{plan.price}<span className="text-sm text-muted font-normal">/mo (Base)</span></p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditingPlan({ ...plan })}
                                        >
                                            <Edit2 size={16} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(plan)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted">Max Employees:</span>
                                        <span className="font-medium">{plan.max_employees || 'Unlimited'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted">Status:</span>
                                        <span className={plan.is_active ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>
                                            {plan.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Enabled Categories</p>
                                    {plan.features && typeof plan.features === 'object' && Object.entries(plan.features).map(([cat, val]) => {
                                        if (cat === 'contact_sales') return null;
                                        const hasEnabled = val && typeof val === 'object' && Object.values(val).some(v => v === true);
                                        if (!hasEnabled) return null;
                                        return (
                                            <div key={cat} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                                <Check size={12} className="text-green-500" />
                                                {categoryLabels[cat] || cat}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </Card>
                    ))}
                    {plans.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted">
                            No plans found. Click "Add Plan" to create one.
                        </div>
                    )}
                </div>

                {(editingPlan || isCreating) && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-2xl font-bold">
                                        {isCreating ? 'Create New Plan' : `Edit Plan: ${editingPlan?.name}`}
                                    </h3>
                                    <Button variant="ghost" size="sm" onClick={() => { setEditingPlan(null); setIsCreating(false); }}>
                                        <X size={20} />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Plan Name</label>
                                            <input
                                                type="text"
                                                className="w-full p-2.5 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                                                value={isCreating ? newPlan.name : editingPlan?.name}
                                                onChange={(e) => isCreating
                                                    ? setNewPlan({ ...newPlan, name: e.target.value })
                                                    : setEditingPlan({ ...editingPlan!, name: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Base Monthly Price (Yearly will be x12)</label>
                                            <input
                                                type="number"
                                                className="w-full p-2.5 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                                                value={isCreating ? newPlan.price : editingPlan?.price}
                                                onChange={(e) => isCreating
                                                    ? setNewPlan({ ...newPlan, price: parseFloat(e.target.value) || 0 })
                                                    : setEditingPlan({ ...editingPlan!, price: parseFloat(e.target.value) || 0 })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Max Employees (Leave empty for unlimited)</label>
                                            <input
                                                type="number"
                                                className="w-full p-2.5 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                                                value={isCreating ? (newPlan.max_employees || '') : (editingPlan?.max_employees || '')}
                                                onChange={(e) => {
                                                    const val = e.target.value ? parseInt(e.target.value) : null;
                                                    isCreating ? setNewPlan({ ...newPlan, max_employees: val }) : setEditingPlan({ ...editingPlan!, max_employees: val });
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 pt-2">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-primary"
                                                checked={isCreating ? newPlan.is_active : editingPlan?.is_active}
                                                onChange={(e) => isCreating
                                                    ? setNewPlan({ ...newPlan, is_active: e.target.checked })
                                                    : setEditingPlan({ ...editingPlan!, is_active: e.target.checked })
                                                }
                                                id="is_active"
                                            />
                                            <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">Is Active</label>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-sm font-medium">Features Selection</p>
                                        <div className="h-[300px] overflow-y-auto border rounded-lg p-4 space-y-4 bg-gray-50/50 dark:bg-dark-bg/50">
                                            {Object.entries(categoryLabels).map(([cat, label]) => {
                                                const currentFeatures = (isCreating ? newPlan.features : editingPlan?.features) || {};
                                                const catFeatures = currentFeatures[cat as keyof typeof currentFeatures];

                                                return (
                                                    <div key={cat} className="space-y-2">
                                                        <p className="text-xs font-bold uppercase text-muted tracking-wider border-b pb-1">{label}</p>
                                                        <div className="grid grid-cols-1 gap-1.5 pl-2">
                                                            {catFeatures && typeof catFeatures === 'object' ? (
                                                                Object.entries(catFeatures).map(([feat, isEnabled]) => (
                                                                    <div key={feat} className="flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="w-3.5 h-3.5 rounded border-input bg-background text-primary focus:ring-primary"
                                                                            checked={isEnabled as boolean}
                                                                            onChange={(e) => {
                                                                                if (isCreating) {
                                                                                    const newFeats = { ...newPlan.features } as any;
                                                                                    if (!newFeats[cat]) newFeats[cat] = {};
                                                                                    newFeats[cat][feat] = e.target.checked;
                                                                                    setNewPlan({ ...newPlan, features: newFeats });
                                                                                } else {
                                                                                    const newFeats = { ...editingPlan!.features } as any;
                                                                                    if (!newFeats[cat]) newFeats[cat] = {};
                                                                                    newFeats[cat][feat] = e.target.checked;
                                                                                    setEditingPlan({ ...editingPlan!, features: newFeats });
                                                                                }
                                                                            }}
                                                                            id={`${cat}-${feat}`}
                                                                        />
                                                                        <label htmlFor={`${cat}-${feat}`} className="text-xs cursor-pointer hover:text-primary transition-colors">
                                                                            {feat.replace(/_/g, ' ')}
                                                                        </label>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="text-[10px] text-muted italic">No specific features defined</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <Button variant="outline" onClick={() => { setEditingPlan(null); setIsCreating(false); }}>
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={isCreating ? handleCreate : handleSave}
                                        isLoading={isCreating ? createMutation.isPending : updateMutation.isPending}
                                    >
                                        <Save size={16} className="mr-2" />
                                        {isCreating ? 'Create Plan' : 'Save Changes'}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};
