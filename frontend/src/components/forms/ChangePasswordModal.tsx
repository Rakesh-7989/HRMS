import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { Key, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth/auth.service';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const validationSchema = Yup.object({
    currentPassword: Yup.string().required('Current password is required'),
    newPassword: Yup.string()
        .min(8, 'Password must be at least 8 characters long')
        .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
        .matches(/[0-9]/, 'Password must contain at least one number')
        .matches(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
        .notOneOf([Yup.ref('currentPassword')], 'New password cannot be the same as current password')
        .required('New password is required'),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('newPassword')], 'Passwords must match')
        .required('Confirm password is required'),
});

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
    const [isLoading, setIsLoading] = React.useState(false);
    const [showCurrent, setShowCurrent] = React.useState(false);
    const [showNew, setShowNew] = React.useState(false);
    const [showConfirm, setShowConfirm] = React.useState(false);

    const formik = useFormik({
        initialValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
        validationSchema,
        onSubmit: async (values) => {
            setIsLoading(true);
            try {
                await authService.changePassword(
                    values.currentPassword,
                    values.newPassword,
                    values.confirmPassword
                );
                toast.success('Password changed successfully');
                formik.resetForm();
                onClose();
            } catch (err: any) {
                const message = err.response?.data?.message || err.message || 'Failed to change password';
                toast.error(message);
            } finally {
                setIsLoading(false);
            }
        },
    });

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Key size={20} />
                        </div>
                        <DialogTitle>Change Password</DialogTitle>
                    </div>
                    <p className="text-sm text-muted">
                        Ensure your new password follows the security requirements.
                    </p>
                </DialogHeader>

                <form onSubmit={formik.handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-4">
                        {/* Current Password */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Current Password</label>
                            <div className="relative">
                                <input
                                    type={showCurrent ? 'text' : 'password'}
                                    {...formik.getFieldProps('currentPassword')}
                                    className="w-full h-10 px-3 pr-10 rounded-md border border-input bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted"
                                    placeholder="Enter current password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent((p) => !p)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {formik.touched.currentPassword && formik.errors.currentPassword && (
                                <p className="text-xs text-red-500">{formik.errors.currentPassword}</p>
                            )}
                        </div>

                        {/* New Password */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">New Password</label>
                            <div className="relative">
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    {...formik.getFieldProps('newPassword')}
                                    className="w-full h-10 px-3 pr-10 rounded-md border border-input bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted"
                                    placeholder="At least 8 characters"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew((p) => !p)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {formik.touched.newPassword && formik.errors.newPassword && (
                                <p className="text-xs text-red-500">{formik.errors.newPassword}</p>
                            )}
                            {/* Requirement Hints */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                                <Requirement
                                    label="8+ characters"
                                    met={(formik.values.newPassword?.length || 0) >= 8}
                                />
                                <Requirement
                                    label="Uppercase"
                                    met={/[A-Z]/.test(formik.values.newPassword || '')}
                                />
                                <Requirement
                                    label="Lowercase"
                                    met={/[a-z]/.test(formik.values.newPassword || '')}
                                />
                                <Requirement
                                    label="Number"
                                    met={/[0-9]/.test(formik.values.newPassword || '')}
                                />
                                <Requirement
                                    label="Special char"
                                    met={/[^A-Za-z0-9]/.test(formik.values.newPassword || '')}
                                />
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Confirm New Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    {...formik.getFieldProps('confirmPassword')}
                                    className="w-full h-10 px-3 pr-10 rounded-md border border-input bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-muted"
                                    placeholder="Repeat new password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm((p) => !p)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                                <p className="text-xs text-red-500">{formik.errors.confirmPassword}</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="pt-2 gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isLoading}>
                            Update Password
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const Requirement: React.FC<{ label: string; met: boolean }> = ({ label, met }) => (
    <div className="flex items-center gap-1.5">
        <div
            className={`w-1 h-1 rounded-full ${met ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-muted'}`}
        />
        <span className={`text-[10px] ${met ? 'text-green-600 font-medium' : 'text-muted'}`}>
            {label}
        </span>
    </div>
);
