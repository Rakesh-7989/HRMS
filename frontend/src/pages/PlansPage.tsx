import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { plansService, Plan } from '@/services/plans.service';
import { Edit2, Plus, Save, Check, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/Dialog';

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
            showToast.success('Plan updated successfully');
            setEditingPlan(null);
        },
        onError: (error: any) => {
            showToast.error(error.response?.data?.message || 'Failed to update plan');
        }
    });

    const createMutation = useMutation({
        mutationFn: (data: Partial<Plan>) => plansService.createPlan(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans-admin'] });
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            showToast.success('Plan created successfully');
            setIsCreating(false);
        },
        onError: (error: any) => {
            showToast.error(error.response?.data?.message || 'Failed to create plan');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => plansService.deletePlan(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plans-admin'] });
            queryClient.invalidateQueries({ queryKey: ['plans'] });
            showToast.success('Plan deleted successfully');
        },
        onError: (error: any) => {
            showToast.error(error.response?.data?.message || 'Failed to delete plan');
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
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
                                        <p className="text-2xl font-bold text-brand-500">₹{plan.price}<span className="text-sm text-muted font-normal">/mo (Base)</span></p>
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

                <Dialog
                    open={!!editingPlan || isCreating}
                    onOpenChange={(open) => { if (!open) { setEditingPlan(null); setIsCreating(false); } }}
                    onBack={() => { setEditingPlan(null); setIsCreating(false); }}
                    title={isCreating ? 'Create New Plan' : `Edit Plan: ${editingPlan?.name}`}
                    description="Configure the details and features for this plan"
                    className="max-w-4xl"
                    footer={
                        <div className="flex justify-end gap-3 w-full">
                            <Button variant="outline" onClick={() => { setEditingPlan(null); setIsCreating(false); }} className="rounded-2xl border-neutral-200 dark:border-white/10 text-slate-500 font-bold">
                                Cancel
                            </Button>
                            <Button
                                onClick={isCreating ? handleCreate : handleSave}
                                isLoading={isCreating ? createMutation.isPending : updateMutation.isPending}
                                className="rounded-2xl bg-brand-500 text-white font-bold flex items-center gap-2"
                            >
                                <Save size={16} />
                                {isCreating ? 'Create Plan' : 'Save Changes'}
                            </Button>
                        </div>
                    }
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Plan Name</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/50 focus:border-transparent outline-none font-medium"
                                    value={isCreating ? newPlan.name : editingPlan?.name}
                                    onChange={(e) => isCreating
                                        ? setNewPlan({ ...newPlan, name: e.target.value })
                                        : setEditingPlan({ ...editingPlan!, name: e.target.value })
                                    }
                                    placeholder="e.g. Basic, Professional, Enterprise"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Base Monthly Price</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                    <input
                                        type="number"
                                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/50 focus:border-transparent outline-none font-medium"
                                        value={isCreating ? newPlan.price : editingPlan?.price}
                                        onChange={(e) => isCreating
                                            ? setNewPlan({ ...newPlan, price: parseFloat(e.target.value) || 0 })
                                            : setEditingPlan({ ...editingPlan!, price: parseFloat(e.target.value) || 0 })
                                        }
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Max Employees</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/50 focus:border-transparent outline-none font-medium"
                                    placeholder="Leave empty for unlimited"
                                    value={isCreating ? (newPlan.max_employees || '') : (editingPlan?.max_employees || '')}
                                    onChange={(e) => {
                                        const val = e.target.value ? parseInt(e.target.value) : null;
                                        isCreating ? setNewPlan({ ...newPlan, max_employees: val }) : setEditingPlan({ ...editingPlan!, max_employees: val });
                                    }}
                                />
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded-lg border-gray-300 dark:border-gray-600 text-brand-500 focus:ring-brand-500/50 cursor-pointer"
                                    checked={isCreating ? newPlan.is_active : editingPlan?.is_active}
                                    onChange={(e) => isCreating
                                        ? setNewPlan({ ...newPlan, is_active: e.target.checked })
                                        : setEditingPlan({ ...editingPlan!, is_active: e.target.checked })
                                    }
                                    id="is_active"
                                />
                                <label htmlFor="is_active" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">Active and Available for Subscription</label>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Features Selection</label>
                            <div className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-2xl p-4 space-y-5 bg-gray-50/30 dark:bg-gray-900/30 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
                                {Object.entries(categoryLabels).map(([cat, label]) => {
                                    const currentFeatures = (isCreating ? newPlan.features : editingPlan?.features) || {};
                                    const catFeatures = currentFeatures[cat as keyof typeof currentFeatures];

                                    return (
                                        <div key={cat} className="space-y-3">
                                            <p className="text-[10px] font-black uppercase text-brand-500 tracking-widest bg-brand-500/5 dark:bg-brand-500/10 px-3 py-1 rounded-full inline-block">{label}</p>
                                            <div className="grid grid-cols-1 gap-2 pl-2">
                                                {catFeatures && typeof catFeatures === 'object' ? (
                                                    Object.entries(catFeatures).map(([feat, isEnabled]) => (
                                                        <div key={feat} className="flex items-center gap-3 group">
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-brand-500 focus:ring-brand-500/50 cursor-pointer"
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
                                                            <label htmlFor={`${cat}-${feat}`} className="text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer group-hover:text-brand-500 transition-colors">
                                                                {feat.replace(/_/g, ' ')}
                                                            </label>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-gray-400 italic font-medium">No specific features defined</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Dialog>
            </div>
        </DashboardLayout>
    );
};
