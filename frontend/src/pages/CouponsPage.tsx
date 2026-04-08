import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { couponService, Coupon } from '@/services/coupons.service';
import { Plus, Copy, Tag, Calendar, Percent, IndianRupee, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/Dialog';

const CreateCouponModal = ({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) => {
    const { t } = useTranslation();

    const formik = useFormik({
        initialValues: {
            code: '',
            discount_type: 'PERCENT',
            discount_value: 0,
            max_redemptions: '',
            expires_at: ''
        },
        validationSchema: Yup.object({
            code: Yup.string().required('Code is required').uppercase(),
            discount_type: Yup.string().oneOf(['PERCENT', 'FIXED']).required(),
            discount_value: Yup.number().positive().required(),
            max_redemptions: Yup.number().positive().nullable(),
            expires_at: Yup.date().nullable().min(new Date(), 'Expiry must be in future')
        }),
        onSubmit: async (values) => {
            try {
                await couponService.createCoupon({
                    ...values,
                    max_redemptions: values.max_redemptions ? Number(values.max_redemptions) : undefined,
                    expires_at: values.expires_at || undefined
                } as any);
                toast.success('Coupon created');
                onSuccess();
                onClose();
            } catch (error: any) {
                toast.error(error.response?.data?.message || 'Failed to create coupon');
            }
        }
    });

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => !open && onClose()}
            onBack={onClose}
            title="Create New Coupon"
            description="Generate a new discount code for subscriptions"
            className="max-w-md"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <Button type="button" variant="outline" onClick={onClose} className="rounded-2xl border-slate-200 dark:border-white/10 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-white/5">
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" form="create-coupon-form" disabled={formik.isSubmitting} className="rounded-2xl bg-primary text-white font-bold min-w-[140px]">
                        Create Coupon
                    </Button>
                </div>
            }
        >
            <form id="create-coupon-form" onSubmit={formik.handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coupon Code</label>
                    <input
                        type="text"
                        name="code"
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 uppercase"
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
            </form>
        </Dialog>
    );
}

export const CouponsPage: React.FC = () => {
  const { t: _t } = useTranslation();
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const { data: coupons, isLoading } = useQuery({
        queryKey: ['coupons'],
        queryFn: couponService.getCoupons
    });

    const copyLink = (code: string) => {
        const link = `${window.location.origin}/pricing?coupon=${code}`;
        navigator.clipboard.writeText(link);
        toast.success('Link copied to clipboard');
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
                                        <div className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-lg font-mono font-bold text-lg tracking-wider border border-purple-100 dark:border-purple-800 border-dashed">
                                            {coupon.code}
                                        </div>
                                        <div className={`px-2 py-1 rounded-md text-xs font-bold ${
                                            coupon.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                            coupon.status === 'INACTIVE' ? 'bg-gray-100 text-gray-500' :
                                            coupon.status === 'EXPIRED' ? 'bg-red-100 text-red-600' :
                                            'bg-amber-100 text-amber-600' // LIMIT EXCEEDED
                                        }`}>
                                            {coupon.status}
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            {coupon.discount_type === 'PERCENT' ? <Percent className="w-4 h-4" /> : <IndianRupee className="w-4 h-4" />}
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {coupon.discount_value}{coupon.discount_type === 'PERCENT' ? '%' : ' INR'} OFF
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                                            <RefreshCw className="w-4 h-4" />
                                            <span>{coupon.times_redeemed} used {coupon.max_redemptions ? `/ ${coupon.max_redemptions}` : ''}</span>
                                        </div>
                                        {coupon.expires_at && (
                                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                                <Calendar className="w-4 h-4" />
                                                <span>Expires {format(new Date(coupon.expires_at), 'PP')}</span>
                                            </div>
                                        )}
                                    </div>

                                    <Button variant="outline" className="w-full text-xs" onClick={() => copyLink(coupon.code)}>
                                        <Copy className="w-3 h-3 mr-2" />
                                        Copy Share Link
                                    </Button>
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
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['coupons'] })}
            />
        </DashboardLayout>
    );
};
