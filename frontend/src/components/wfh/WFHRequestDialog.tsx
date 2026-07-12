import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { wfhService, CreateWFHRequestData } from '@/services/wfh.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WFHRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const WFHRequestDialog: React.FC<WFHRequestDialogProps> = ({
    open,
    onOpenChange,
}) => {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const validationSchema = Yup.object({
        request_date: Yup.string().required(t('wfh.dateRequired')),
        reason: Yup.string().required(t('wfh.reasonRequired')).min(10, t('wfh.reasonMinLength')),
    });

    const requestMutation = useMutation({
        mutationFn: (data: CreateWFHRequestData) => wfhService.requestWFH(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wfh-requests'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            formik.resetForm();
            onOpenChange(false);
        },
    });

    const formik = useFormik({
        initialValues: {
            request_date: '',
            reason: '',
        },
        validationSchema,
        onSubmit: (values) => {
            requestMutation.mutate(values);
        },
    });

    const handleClose = () => {
        formik.resetForm();
        requestMutation.reset();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose} title={t('wfh.requestTitle')} className="max-w-md">
            <form onSubmit={formik.handleSubmit} className="p-6">
                <DialogContent>
                    {/* Error Message */}
                    {requestMutation.error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <p className="text-red-700 dark:text-red-400 text-sm">
                                {(requestMutation.error as Error).message || t('wfh.submitFailed')}
                            </p>
                        </div>
                    )}

                    {/* Date */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('common.date')} *
                        </label>
                        <input
                            type="date"
                            name="request_date"
                            value={formik.values.request_date}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-shadow"
                        />
                        {formik.touched.request_date && formik.errors.request_date && (
                            <p className="text-xs text-red-600 font-medium">{formik.errors.request_date}</p>
                        )}
                    </div>

                    {/* Reason */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('common.reason')} *
                        </label>
                        <textarea
                            name="reason"
                            value={formik.values.reason}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            rows={4}
                            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-shadow resize-none"
                            placeholder={t('wfh.reasonPlaceholder')}
                        />
                        {formik.touched.reason && formik.errors.reason && (
                            <p className="text-xs text-red-600 font-medium">{formik.errors.reason}</p>
                        )}
                    </div>
                </DialogContent>

                {/* Footer */}
                <DialogFooter className="mt-8">
                    <Button type="button" variant="outline" onClick={handleClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        isLoading={requestMutation.isPending}
                        disabled={!formik.isValid || !formik.dirty}
                    >
                        {t('wfh.submitRequest')}
                    </Button>
                </DialogFooter>
            </form>
        </Dialog>
    );
};
