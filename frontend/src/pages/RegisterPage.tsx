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

type Step = 'details' | 'otp' | 'success';

export const RegisterPage: React.FC = () => {
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
            email: Yup.string().email('Invalid email').required('Email is required'),
            name: Yup.string().min(2, 'Min 2 characters').max(255).required('Organization name is required'),
            domain: Yup.string().max(255).required('Domain is required'),
            phone: Yup.string()
                .matches(/^[\d\s\-\+\(\)]+$/, 'Invalid phone format')
                .test('digits', 'At least 10 digits', (val) => !val || val.replace(/\D/g, '').length >= 10)
                .max(20)
                .required('Phone number is required'),
            address: Yup.string().max(500).required('Address is required'),
            city: Yup.string().max(100).required('City is required'),
            state: Yup.string().max(100).required('State is required'),
            country: Yup.string().max(100).required('Country is required'),
            zip_code: Yup.string()
                .matches(/^\d+$/, 'Invalid zip code (digits only)')
                .min(5, 'Invalid zip code (min 5 digits)')
                .max(10, 'Invalid zip code')
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
        // Text-only fields (Name, City, State, Country) - No numbers or special chars (except simple punctuation)
        if (['name', 'city', 'state', 'country'].includes(target.name)) {
            target.value = target.value.replace(/[^A-Za-z\s\-\.]/g, '');
        }
        if (target.name === 'phone') target.value = target.value.replace(/[^0-9+\-()\s\.]/g, '');
        if (target.name === 'zip_code') target.value = target.value.replace(/[^0-9]/g, '');
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
                                <h1 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">Create account</h1>
                                <p className="text-sm text-gray-600 dark:text-muted">Register your organization to get started</p>
                            </div>
                            {error && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">{error}</div>}
                            <form onSubmit={formik.handleSubmit} className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Organization Name *</label>
                                            <input name="name" value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur} onInput={handleInput}
                                                className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Acme Inc." />
                                            {formik.touched.name && formik.errors.name && <p className="text-xs text-red-400 mt-1">{formik.errors.name}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Admin Email *</label>
                                            <input name="email" type="email" value={formik.values.email} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                                className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="admin@company.com" />
                                            {formik.touched.email && formik.errors.email && <p className="text-xs text-red-400 mt-1">{formik.errors.email}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Domain *</label>
                                            <input name="domain" value={formik.values.domain} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                                className={`w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border ${formik.touched.domain && formik.errors.domain ? 'border-red-400' : 'border-gray-300 dark:border-dark-border'} focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`} placeholder="yourcompany.com" />
                                            {formik.touched.domain && formik.errors.domain && <p className="text-xs text-red-400 mt-1">{formik.errors.domain}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Phone *</label>
                                            <input name="phone" value={formik.values.phone} onChange={formik.handleChange} onBlur={formik.handleBlur} onInput={handleInput}
                                                className={`w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border ${formik.touched.phone && formik.errors.phone ? 'border-red-400' : 'border-gray-300 dark:border-dark-border'} focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`} placeholder="+1 234 567 890" />
                                            {formik.touched.phone && formik.errors.phone && <p className="text-xs text-red-400 mt-1">{formik.errors.phone}</p>}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">City *</label>
                                                <input name="city" value={formik.values.city} onChange={formik.handleChange} onBlur={formik.handleBlur} onInput={handleInput}
                                                    className={`w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border ${formik.touched.city && formik.errors.city ? 'border-red-400' : 'border-gray-300 dark:border-dark-border'} focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`} placeholder="e.g. New York" />
                                                {formik.touched.city && formik.errors.city && <p className="text-xs text-red-400 mt-1">{formik.errors.city}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">State *</label>
                                                <input name="state" value={formik.values.state} onChange={formik.handleChange} onBlur={formik.handleBlur} onInput={handleInput}
                                                    className={`w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border ${formik.touched.state && formik.errors.state ? 'border-red-400' : 'border-gray-300 dark:border-dark-border'} focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`} placeholder="e.g. NY" />
                                                {formik.touched.state && formik.errors.state && <p className="text-xs text-red-400 mt-1">{formik.errors.state}</p>}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Country *</label>
                                                <input name="country" value={formik.values.country} onChange={formik.handleChange} onBlur={formik.handleBlur} onInput={handleInput}
                                                    className={`w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border ${formik.touched.country && formik.errors.country ? 'border-red-400' : 'border-gray-300 dark:border-dark-border'} focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`} placeholder="United States" />
                                                {formik.touched.country && formik.errors.country && <p className="text-xs text-red-400 mt-1">{formik.errors.country}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Zip *</label>
                                                <input name="zip_code" value={formik.values.zip_code} onChange={formik.handleChange} onBlur={formik.handleBlur} onInput={handleInput}
                                                    className={`w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border ${formik.touched.zip_code && formik.errors.zip_code ? 'border-red-400' : 'border-gray-300 dark:border-dark-border'} focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`} placeholder="10001" />
                                                {formik.touched.zip_code && formik.errors.zip_code && <p className="text-xs text-red-400 mt-1">{formik.errors.zip_code}</p>}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Address *</label>
                                            <input name="address" value={formik.values.address} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                                className={`w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border ${formik.touched.address && formik.errors.address ? 'border-red-400' : 'border-gray-300 dark:border-dark-border'} focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`} placeholder="123 Main St" />
                                            {formik.touched.address && formik.errors.address && <p className="text-xs text-red-400 mt-1">{formik.errors.address}</p>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button type="submit" disabled={loading} className="px-8">
                                        {loading && <Loader2 className="animate-spin mr-2" size={18} />}
                                        Register Tenant
                                    </Button>
                                </div>
                            </form>
                        </>
                    )}

                    {/* Step 2: OTP Verification */}
                    {step === 'otp' && (
                        <>
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Verify your email</h1>
                                <p className="text-gray-600 dark:text-muted">We sent a 6-digit code to <strong>{formik.values.email}</strong></p>
                            </div>
                            {error && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-sm text-red-500">{error}</div>}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Verification Code *</label>
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
                                    Verify & Register
                                </Button>
                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        disabled={loading}
                                        className="w-full text-sm text-primary hover:underline disabled:opacity-50"
                                    >
                                        Resend verification code
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setStep('details'); setOtpCode(''); setError(null); }}
                                        className="w-full text-sm text-gray-600 dark:text-muted hover:text-gray-900 dark:hover:text-white"
                                    >
                                        ← Edit registration details
                                    </button>
                                </div>
                            </div>
                        </>
                    )}


                    {/* Step 4: Success */}
                    {step === 'success' && (
                        <div className="text-center py-8">
                            <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
                            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Registration Complete!</h1>
                            <p className="text-gray-600 dark:text-muted mb-6">
                                A temporary password has been sent to <strong>{formik.values.email}</strong>.<br />
                                Please check your email and login to continue.
                            </p>
                            <Button onClick={() => navigate('/login')} className="px-8">
                                Go to Login
                            </Button>
                        </div>
                    )}

                    {step !== 'success' && (
                        <div className="pt-6 border-t border-gray-200 dark:border-dark-border mt-6">
                            <a href="/" className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-muted hover:text-gray-900 dark:hover:text-white transition-colors">
                                <ArrowLeft size={16} />
                                Back to home
                            </a>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
