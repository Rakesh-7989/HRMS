import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { Key, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth.service';
import { useTranslation } from 'react-i18next';

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

export const ChangePasswordPage: React.FC = () => {
  const { t: _t } = useTranslation();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

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
                toast.success('Password changed successfully! Please login with your new password.');

                // Clear all tokens and flags - user needs to login fresh
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                localStorage.removeItem('mustChangePassword');
                sessionStorage.removeItem('accessToken');
                sessionStorage.removeItem('refreshToken');
                sessionStorage.removeItem('user');
                sessionStorage.removeItem('mustChangePassword');

                // Redirect to login page
                setTimeout(() => navigate('/login'), 1500);
            } catch (err: any) {
                const message = err.response?.data?.message || err.message || 'Failed to change password';
                toast.error(message);
            } finally {
                setIsLoading(false);
            }
        },
    });

    const Requirement: React.FC<{ label: string; met: boolean }> = ({ label, met }) => (
        <div className="flex items-center gap-1.5">
            <div className={`w-1 h-1 rounded-full ${met ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-muted'}`} />
            <span className={`text-[10px] ${met ? 'text-green-600 font-medium' : 'text-muted'}`}>{label}</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="flex items-center gap-3 mb-8 justify-center">
                    <AnimatedLogo size="lg" />
                </div>

                <Card>
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-fuchsia-500/10 text-fuchsia-500">
                                <ShieldAlert size={24} />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Change Password</h1>
                        </div>
                        <p className="text-gray-600 dark:text-muted">
                            For security, you must change your temporary password before continuing.
                        </p>
                    </div>

                    <form onSubmit={formik.handleSubmit} className="space-y-4">
                        {/* Current Password */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-900 dark:text-white">Current Password</label>
                            <div className="relative">
                                <input
                                    type={showCurrent ? 'text' : 'password'}
                                    {...formik.getFieldProps('currentPassword')}
                                    className="w-full h-10 px-3 pr-10 rounded-md border border-gray-300 dark:border-dark-border bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="Enter temporary password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent((p) => !p)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                            <label className="text-sm font-medium text-gray-900 dark:text-white">New Password</label>
                            <div className="relative">
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    {...formik.getFieldProps('newPassword')}
                                    className="w-full h-10 px-3 pr-10 rounded-md border border-gray-300 dark:border-dark-border bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="At least 8 characters"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew((p) => !p)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {formik.touched.newPassword && formik.errors.newPassword && (
                                <p className="text-xs text-red-500">{formik.errors.newPassword}</p>
                            )}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                                <Requirement label="8+ characters" met={(formik.values.newPassword?.length || 0) >= 8} />
                                <Requirement label="Uppercase" met={/[A-Z]/.test(formik.values.newPassword || '')} />
                                <Requirement label="Lowercase" met={/[a-z]/.test(formik.values.newPassword || '')} />
                                <Requirement label="Number" met={/[0-9]/.test(formik.values.newPassword || '')} />
                                <Requirement label="Special char" met={/[^A-Za-z0-9]/.test(formik.values.newPassword || '')} />
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-900 dark:text-white">Confirm New Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    {...formik.getFieldProps('confirmPassword')}
                                    className="w-full h-10 px-3 pr-10 rounded-md border border-gray-300 dark:border-dark-border bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="Repeat new password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm((p) => !p)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                                <p className="text-xs text-red-500">{formik.errors.confirmPassword}</p>
                            )}
                        </div>

                        <Button type="submit" disabled={isLoading} className="w-full mt-6">
                            {isLoading && <Loader2 className="animate-spin mr-2" size={18} />}
                            <Key className="mr-2" size={18} />
                            Update Password
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};
