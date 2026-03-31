import React, { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Button } from '@/components/ui/Button';
import { tenantRegistrationService } from '@/services/tenantRegistration.service';
import { useTranslation } from 'react-i18next';

type Step = 'details' | 'otp' | 'success';

export const RegisterPage: React.FC = () => {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const planId = searchParams.get('plan_id');
    const cycle = searchParams.get('cycle');
    const employees = searchParams.get('employees');
    const coupon = searchParams.get('coupon');

    const [step, setStep] = useState<Step>('details');
    const [otpCode, setOtpCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (!planId && step !== 'success') {
            navigate('/pricing', { replace: true });
        }
    }, [planId, navigate, step]);

    // Registration form
    const formik = useFormik({
        initialValues: {
            email: '',
            name: '',
            domain: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            country: '',
            zip_code: '',
        },
        validationSchema: Yup.object({
            email: Yup.string().email('Invalid email address').required('Email is required'),
            name: Yup.string()
                .min(2, 'Organization name must be at least 2 characters')
                .max(255, 'Organization name is too long')
                .matches(/^[a-zA-Z0-9\s\-.]+$/, 'Organization name can only contain letters, numbers, spaces, hyphens and dots')
                .required('Organization name is required'),
            domain: Yup.string()
                .matches(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/, 'Invalid domain format (e.g. example.com)')
                .max(255, 'Domain is too long'),
            phone: Yup.string()
                .matches(/^(\+\d{1,3}[- ]?)?\d{10}$/, 'Invalid phone number format (e.g. +91 9876543210)')
                .required('Phone number is required'),
            address: Yup.string().max(500, 'Address is too long'),
            city: Yup.string()
                .matches(/^[a-zA-Z\s]+$/, 'City can only contain letters and spaces')
                .max(100, 'City name is too long')
                .required('City is required'),
            state: Yup.string()
                .matches(/^[a-zA-Z\s]+$/, 'State can only contain letters and spaces')
                .max(100, 'State name is too long')
                .required('State is required'),
            country: Yup.string()
                .matches(/^[a-zA-Z\s]+$/, 'Country can only contain letters and spaces')
                .max(100, 'Country name is too long')
                .required('Country is required'),
            zip_code: Yup.string()
                .matches(/^\d{5,6}$/, 'Zip code must be 5 or 6 digits')
                .required('Zip code is required'),
        }),
        onSubmit: async (values) => {
            setError(null);
            setLoading(true);
            try {
                // First send OTP with all uniqueness checks
                await tenantRegistrationService.sendOtp(values.email, values.domain, values.phone);
                setStep('otp');
            } catch (err: any) {
                setError(err?.response?.data?.message || 'Failed to send verification code');
            } finally {
                setLoading(false);
            }
        },
    });

    const handleResendOtp = async () => {
        setError(null);
        setLoading(true);
        try {
            await tenantRegistrationService.sendOtp(formik.values.email, formik.values.domain, formik.values.phone);
            setError(null);
            // Optionally show a success message that OTP was resent
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to resend code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpCode || otpCode.length !== 6) {
            setError('Please enter the 6-digit code');
            return;
        }
        setError(null);
        setLoading(true);
        try {
            await tenantRegistrationService.verifyOtp(formik.values.email, otpCode);
            // After successful verification, complete the registration
            await tenantRegistrationService.registerTenant({
                ...formik.values,
                plan_id: planId || undefined,
                billing_cycle: cycle || undefined,
                employee_count: employees ? parseInt(employees) : undefined,
                coupon_code: coupon || undefined
            });
            setStep('success');
        } catch (err: any) {
            let msg = err?.response?.data?.message || 'Failed to complete registration';
            if (msg.includes('already exists')) msg = 'A tenant with this email, domain, or phone already exists.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement;
        if (target.name === 'name') target.value = target.value.replace(/[^A-Za-z0-9\s\-\.]/g, '');
        // Phone input handling remains loose to allow user to type, validation is strict on blur/submit
    };

    if (isAuthenticated) return <Navigate to="/dashboard" replace />;

    return (
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                <div className="flex items-center gap-3 mb-4 justify-center">
                    <AnimatedLogo size="md" />
                </div>

                <Card className="p-5">
                    {/* Step 1: Registration Details */}
                    {step === 'details' && (
                        <>
                            <div className="mb-4">
                                <h1 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">{t('auth.createAccount')}</h1>
                                <p className="text-sm text-gray-600 dark:text-muted">{t('auth.registerOrg')}</p>
                            </div>
                            {error && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-sm text-red-500">{error}</div>}
                            <form onSubmit={formik.handleSubmit} className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">{t('auth.organizationName')} *</label>
                                            <input name="name" value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur} onInput={handleInput}
                                                className={`w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border ${formik.touched.name && formik.errors.name ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'} focus:outline-none focus:ring-1 focus:ring-primary`} placeholder="Acme Innovations Pvt Ltd" />
                                            {formik.touched.name && formik.errors.name && <p className="text-xs text-red-500 mt-1">{formik.errors.name}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">{t('auth.adminEmail')} *</label>
                                            <input name="email" type="email" value={formik.values.email} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                                className={`w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border ${formik.touched.email && formik.errors.email ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'} focus:outline-none focus:ring-1 focus:ring-primary`} placeholder="admin@acme.com" />
                                            {formik.touched.email && formik.errors.email && <p className="text-xs text-red-500 mt-1">{formik.errors.email}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">{t('auth.domain')}</label>
                                            <input name="domain" value={formik.values.domain} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                                className={`w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border ${formik.touched.domain && formik.errors.domain ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'} focus:outline-none focus:ring-1 focus:ring-primary`} placeholder="acme.com" />
                                            {formik.touched.domain && formik.errors.domain && <p className="text-xs text-red-500 mt-1">{formik.errors.domain}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">{t('common.phone')} *</label>
                                            <input name="phone" value={formik.values.phone} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                                className={`w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border ${formik.touched.phone && formik.errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'} focus:outline-none focus:ring-1 focus:ring-primary`} placeholder="+91 98765 43210" />
                                            {formik.touched.phone && formik.errors.phone && <p className="text-xs text-red-500 mt-1">{formik.errors.phone}</p>}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">{t('auth.city')} *</label>
                                                <input name="city" value={formik.values.city} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                                    className={`w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border ${formik.touched.city && formik.errors.city ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'} focus:outline-none focus:ring-1 focus:ring-primary`} placeholder="Hyderabad" />
                                                {formik.touched.city && formik.errors.city && <p className="text-xs text-red-500 mt-1">{formik.errors.city}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">{t('auth.state')} *</label>
                                                <input name="state" value={formik.values.state} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                                    className={`w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border ${formik.touched.state && formik.errors.state ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'} focus:outline-none focus:ring-1 focus:ring-primary`} placeholder="Telangana" />
                                                {formik.touched.state && formik.errors.state && <p className="text-xs text-red-500 mt-1">{formik.errors.state}</p>}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">{t('auth.country')} *</label>
                                                <input name="country" value={formik.values.country} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                                    className={`w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border ${formik.touched.country && formik.errors.country ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'} focus:outline-none focus:ring-1 focus:ring-primary`} placeholder="India" />
                                                {formik.touched.country && formik.errors.country && <p className="text-xs text-red-500 mt-1">{formik.errors.country}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">{t('auth.zip')} *</label>
                                                <input name="zip_code" value={formik.values.zip_code} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                                    className={`w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border ${formik.touched.zip_code && formik.errors.zip_code ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'} focus:outline-none focus:ring-1 focus:ring-primary`} placeholder="500081" />
                                                {formik.touched.zip_code && formik.errors.zip_code && <p className="text-xs text-red-500 mt-1">{formik.errors.zip_code}</p>}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">{t('common.address')}</label>
                                            <input name="address" value={formik.values.address} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                                className={`w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border ${formik.touched.address && formik.errors.address ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'} focus:outline-none focus:ring-1 focus:ring-primary`} placeholder="Hitech City, Madhapur" />
                                            {formik.touched.address && formik.errors.address && <p className="text-xs text-red-500 mt-1">{formik.errors.address}</p>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button type="submit" disabled={loading} className="px-8">
                                        {loading && <Loader2 className="animate-spin mr-2" size={18} />}
                                        {t('auth.registerTenant')}
                                    </Button>
                                </div>
                            </form>
                        </>
                    )}

                    {/* Step 2: OTP Verification */}
                    {step === 'otp' && (
                        <>
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('auth.verifyEmail')}</h1>
                                <p className="text-gray-600 dark:text-muted">We sent a 6-digit code to <strong>{formik.values.email}</strong></p>
                            </div>
                            {error && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-sm text-red-500">{error}</div>}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">{t('auth.verificationCode')} *</label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                        className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-center text-2xl tracking-widest text-gray-900 dark:text-white"
                                        placeholder="000000"
                                    />
                                </div>
                                <Button onClick={handleVerifyOtp} disabled={loading} className="w-full">
                                    {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <CheckCircle className="mr-2" size={18} />}
                                    {t('auth.verifyAndRegister')}
                                </Button>
                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        disabled={loading}
                                        className="w-full text-sm text-primary hover:underline disabled:opacity-50"
                                    >
                                        {t('auth.resendCode')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setStep('details'); setOtpCode(''); setError(null); }}
                                        className="w-full text-sm text-gray-600 dark:text-muted hover:text-gray-900 dark:hover:text-white"
                                    >
                                        ← {t('auth.editDetails')}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}


                    {/* Step 4: Success */}
                    {step === 'success' && (
                        <div className="text-center py-8">
                            <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
                            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t('auth.registrationComplete')}</h1>
                            <p className="text-gray-600 dark:text-muted mb-6">
                                A temporary password has been sent to <strong>{formik.values.email}</strong>.<br />
                                Please check your email and login to continue.
                            </p>
                            <Button onClick={() => navigate('/login')} className="px-8">
                                {t('auth.goToLogin')}
                            </Button>
                        </div>
                    )}

                    {step !== 'success' && (
                        <div className="pt-6 border-t border-gray-200 dark:border-dark-border mt-6">
                            <a href="/" className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-muted hover:text-gray-900 dark:hover:text-white transition-colors">
                                <ArrowLeft size={16} />
                                {t('auth.backToHome')}
                            </a>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
