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
            domain: Yup.string().max(255),
            phone: Yup.string()
                .matches(/^[\d\s\-\+\(\)]+$/, 'Invalid phone format')
                .test('digits', 'At least 10 digits', (val) => !val || val.replace(/\D/g, '').length >= 10)
                .max(20),
            address: Yup.string().max(500),
            city: Yup.string().max(100),
            state: Yup.string().max(100),
            country: Yup.string().max(100),
            zip_code: Yup.string().max(20),
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
        if (target.name === 'name') target.value = target.value.replace(/[^A-Za-z\s\-\.]/g, '');
        if (target.name === 'phone') target.value = target.value.replace(/[^0-9+\-()\s\.]/g, '');
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
                            {error && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-sm text-red-100">{error}</div>}
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
                                            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Domain</label>
                                            <input name="domain" value={formik.values.domain} onChange={formik.handleChange}
                                                className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="yourcompany.com" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Phone</label>
                                            <input name="phone" value={formik.values.phone} onChange={formik.handleChange} onInput={handleInput}
                                                className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="+1 234 567 890" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">City</label>
                                                <input name="city" value={formik.values.city} onChange={formik.handleChange}
                                                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. New York" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">State</label>
                                                <input name="state" value={formik.values.state} onChange={formik.handleChange}
                                                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. NY" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Country</label>
                                                <input name="country" value={formik.values.country} onChange={formik.handleChange}
                                                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="United States" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Zip</label>
                                                <input name="zip_code" value={formik.values.zip_code} onChange={formik.handleChange}
                                                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="10001" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Address</label>
                                            <input name="address" value={formik.values.address} onChange={formik.handleChange}
                                                className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="123 Main St" />
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
