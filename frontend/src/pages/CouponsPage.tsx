import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { couponService, Coupon } from '@/services/coupons.service';
import { Plus, Copy, Tag, Calendar, Percent, DollarSign, RefreshCw, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

// Using a simple Modal if UI components not standard, but let's try to use standard logic or raw HTML for modal if needed.
// I'll use a custom Modal implementation inside this file if needed to be safe, or just standard HTML fixed div.

const CreateCouponModal = ({ isOpen, onClose, onSuccess, coupon }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; coupon?: Coupon | null }) => {
    if (!isOpen) return null;

    const formik = useFormik({
        initialValues: {
            code: coupon?.code || '',
            discount_type: coupon?.discount_type || 'PERCENT',
            discount_value: coupon?.discount_value || 0,
            max_redemptions: coupon?.max_redemptions || '',
            expires_at: coupon?.expires_at ? format(new Date(coupon.expires_at), 'yyyy-MM-dd') : '',
            is_active: coupon ? coupon.is_active : true
        },
        enableReinitialize: true,
        validationSchema: Yup.object({
            code: Yup.string().required('Code is required').uppercase(),
            discount_type: Yup.string().oneOf(['PERCENT', 'FIXED']).required(),
            discount_value: Yup.number().positive().required(),
            max_redemptions: Yup.number().positive().nullable(),
            expires_at: Yup.date().nullable().min(new Date(), 'Expiry must be in future')
        }),
        onSubmit: async (values) => {
            try {
                if (coupon) {
                    await couponService.updateCoupon(coupon.id, {
                        ...values,
                        max_redemptions: values.max_redemptions ? Number(values.max_redemptions) : null,
                        expires_at: values.expires_at || null
                    } as any);
                    toast.success('Coupon updated');
                } else {
                    await couponService.createCoupon({
                        ...values,
                        max_redemptions: values.max_redemptions ? Number(values.max_redemptions) : undefined,
                        expires_at: values.expires_at || undefined
                    } as any);
                    toast.success('Coupon created');
                }
                onSuccess();
                onClose();
            } catch (error: any) {
                toast.error(error.response?.data?.message || `Failed to ${coupon ? 'update' : 'create'} coupon`);
            }
        }
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-2xl">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{coupon ? 'Edit Coupon' : 'Create New Coupon'}</h2>
                <form onSubmit={formik.handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coupon Code</label>
                        <input
                            type="text"
                            name="code"
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 uppercase"
                            placeholder="SUMMER2026"
                            value={formik.values.code}
                            onChange={(e) => {
                                formik.handleChange(e);
                                formik.setFieldValue('code', e.target.value.toUpperCase());
                            }}
                        />
                        {formik.touched.code && formik.errors.code && <div className="text-red-500 text-xs mt-1">{formik.errors.code}</div>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                            <select
                                name="discount_type"
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                value={formik.values.discount_type}
                                onChange={formik.handleChange}
                            >
                                <option value="PERCENT">Percentage (%)</option>
                                <option value="FIXED">Fixed Amount (₹)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value</label>
                            <input
                                type="number"
                                name="discount_value"
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                placeholder="e.g. 10"
                                value={formik.values.discount_value}
                                onChange={formik.handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Redemptions (Optional)</label>
                        <input
                            type="number"
                            name="max_redemptions"
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            placeholder="e.g. 100"
                            value={formik.values.max_redemptions}
                            onChange={formik.handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Date (Optional)</label>
                        <input
                            type="date"
                            name="expires_at"
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            value={formik.values.expires_at}
                            onChange={formik.handleChange}
                        />
                        {formik.touched.expires_at && formik.errors.expires_at && <div className="text-red-500 text-xs mt-1">{formik.errors.expires_at as string}</div>}
                    </div>

                    {coupon && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                name="is_active"
                                id="is_active"
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                checked={formik.values.is_active}
                                onChange={formik.handleChange}
                            />
                            <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Active
                            </label>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={formik.isSubmitting}>{coupon ? 'Update Coupon' : 'Create Coupon'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export const CouponsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [couponToEdit, setCouponToEdit] = useState<Coupon | null>(null);
    const [couponToDelete, setCouponToDelete] = useState<string | null>(null);

    const { data: coupons, isLoading } = useQuery({
        queryKey: ['coupons'],
        queryFn: couponService.getCoupons
    });

    const copyLink = (code: string) => {
        const link = `${window.location.origin}/pricing?coupon=${code}`;
        navigator.clipboard.writeText(link);
        toast.success('Link copied to clipboard');
    };

    const handleDelete = async (id: string) => {
        setCouponToDelete(id);
    };

    const confirmDelete = async () => {
        if (!couponToDelete) return;
        try {
            await couponService.deleteCoupon(couponToDelete);
            toast.success('Coupon deleted');
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete');
        } finally {
            setCouponToDelete(null);
        }
    };

    return (
        <DashboardLayout title="Subscription Coupons">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Coupons</h1>
                        <p className="text-gray-500 text-sm">Manage discount codes for subscriptions</p>
                    </div>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Coupon
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {coupons?.map((coupon: Coupon) => (
                            <div key={coupon.id} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Tag className="w-24 h-24 transform rotate-12" />
                                </div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg font-mono font-bold text-lg tracking-wider border border-indigo-100 dark:border-indigo-800 border-dashed">
                                            {coupon.code}
                                        </div>
                                        <div className={`px-2 py-1 rounded-md text-xs font-bold ${coupon.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {coupon.is_active ? 'ACTIVE' : 'INACTIVE'}
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            {coupon.discount_type === 'PERCENT' ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {coupon.discount_value}{coupon.discount_type === 'PERCENT' ? '%' : ' INR'} OFF
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                                            <RefreshCw className="w-4 h-4" />
                                            <span>{coupon.times_redeemed} used {coupon.max_redemptions ? `/ ${coupon.max_redemptions}` : ''}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                                            <Calendar className="w-4 h-4" />
                                            <span>
                                                {coupon.expires_at
                                                    ? `Expires ${format(new Date(coupon.expires_at), 'MMM dd, yyyy')}`
                                                    : 'No Expiry Date'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button variant="outline" className="flex-1 text-xs" onClick={() => copyLink(coupon.code)}>
                                            <Copy className="w-3 h-3 mr-2" />
                                            Copy Link
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="px-3"
                                            onClick={() => setCouponToEdit(coupon)}
                                            title="Edit Coupon"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="px-3 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 dark:border-red-900/30"
                                            onClick={() => handleDelete(coupon.id)}
                                            title="Delete Coupon"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {coupons?.length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-500">
                                No coupons found. Create your first one!
                            </div>
                        )}
                    </div>
                )}
            </div>

            <CreateCouponModal
                isOpen={isCreateModalOpen || !!couponToEdit}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setCouponToEdit(null);
                }}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['coupons'] })}
                coupon={couponToEdit}
            />

            <ConfirmDialog
                isOpen={!!couponToDelete}
                onClose={() => setCouponToDelete(null)}
                onConfirm={() => confirmDelete()}
                title="Delete Coupon"
                message="Are you sure you want to delete this coupon? This action cannot be undone."
                type="destructive"
                confirmText="Delete Coupon"
            />
        </DashboardLayout>
    );
};
