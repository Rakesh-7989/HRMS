import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth.service';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setError(t('auth.invalidResetToken'));
        }
    }, [token]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            setError(t('auth.missingResetToken'));
            return;
        }

        if (password !== confirmPassword) {
            setError(t('auth.passwordsDoNotMatch'));
            return;
        }

        if (password.length < 8) {
            setError(t('auth.passwordMinLength'));
            return;
        }

        setIsLoading(true);
        setMessage(null);
        setError(null);

        try {
            await authService.resetPassword(token, password);
            setMessage(t('auth.passwordResetSuccess'));
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err: any) {
            setError(err?.message || t('auth.failedResetPassword'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="flex items-center gap-3 mb-8 justify-center">
                    <AnimatedLogo size="lg" />
                </div>

                <Card>
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('auth.resetPassword')}</h1>
                        <p className="text-gray-600 dark:text-muted">{t('auth.enterNewPassword')}</p>
                    </div>

                    {message && <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-700 dark:text-green-400">{message}</div>}
                    {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}

                    <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">{t('auth.newPassword')}</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-muted pr-10"
                                    placeholder={t('auth.enterNewPasswordPlaceholder')}
                                />
                                 <Button variant="ghost" 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </Button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">{t('auth.confirmPassword')}</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-muted pr-10"
                                    placeholder={t('auth.confirmNewPasswordPlaceholder')}
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" isLoading={isLoading} disabled={!!message}>
                            {t('auth.resetPassword')}
                        </Button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10 flex justify-center text-sm">
                        <a href="/login" className="text-brand-500 hover:underline flex items-center gap-2">
                            <ArrowLeft size={14} />
                            {t('auth.backToLogin')}
                        </a>
                    </div>
                </Card>
            </div>
        </div>
    );
};
