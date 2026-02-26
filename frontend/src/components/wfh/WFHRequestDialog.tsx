import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { wfhService, CreateWFHRequestData } from '@/services/employee/wfh.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';

interface WFHRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const validationSchema = Yup.object({
    request_date: Yup.string().required('Date is required'),
    reason: Yup.string().required('Reason is required').min(10, 'Reason must be at least 10 characters'),
});

export const WFHRequestDialog: React.FC<WFHRequestDialogProps> = ({
    open,
    onOpenChange,
}) => {
    const queryClient = useQueryClient();

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
        <Dialog open={open} onOpenChange={handleClose} title="Request Work From Home" className="max-w-md">
            <form onSubmit={formik.handleSubmit} className="p-6">
                <DialogContent>
                    {/* Error Message */}
                    {requestMutation.error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <p className="text-red-700 dark:text-red-400 text-sm">
                                {(requestMutation.error as Error).message || 'Failed to submit WFH request'}
                            </p>
                        </div>
                    )}

                    {/* Date */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Date *
                        </label>
                        <input
                            type="date"
                            name="request_date"
                            value={formik.values.request_date}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                        />
                        {formik.touched.request_date && formik.errors.request_date && (
                            <p className="text-xs text-red-600 font-medium">{formik.errors.request_date}</p>
                        )}
                    </div>

                    {/* Reason */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Reason *
                        </label>
                        <textarea
                            name="reason"
                            value={formik.values.reason}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            rows={4}
                            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary transition-shadow resize-none"
                            placeholder="Please provide a reason for working from home (minimum 10 characters)..."
                        />
                        {formik.touched.reason && formik.errors.reason && (
                            <p className="text-xs text-red-600 font-medium">{formik.errors.reason}</p>
                        )}
                    </div>
                </DialogContent>

                {/* Footer */}
                <DialogFooter className="mt-8">
                    <Button type="button" variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        isLoading={requestMutation.isPending}
                        disabled={!formik.isValid || !formik.dirty}
                    >
                        Submit Request
                    </Button>
                </DialogFooter>
            </form>
        </Dialog>
    );
};
