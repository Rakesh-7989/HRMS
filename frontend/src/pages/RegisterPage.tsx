import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Card } from '@/components/ui/Card';
import { 
    Building, Mail, MapPin, ArrowLeft, Loader2, BadgeCheck, 
    CreditCard, Users, Shield, CheckCircle2 
} from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Button } from '@/components/ui/Button';
import { tenantRegistrationService } from '@/services/tenantRegistration.service';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';

const STORAGE_KEY = 'WellZo_registration_draft';

export const RegisterPage: React.FC = () => {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const planId = searchParams.get('plan_id');
    const cycle = searchParams.get('cycle') || 'MONTHLY';
    const employees = searchParams.get('employees');
    const coupon = searchParams.get('coupon');

    const [step, setStep] = useState<'details' | 'review' | 'otp' | 'success'>('details');
    const [otpCode, setOtpCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [planData, setPlanData] = useState<any>(null);
    const [couponData, setCouponData] = useState<any>(null);


    React.useEffect(() => {
        const draft = localStorage.getItem(STORAGE_KEY);
        if (!planId && !draft && step === 'details') {
            navigate('/pricing', { replace: true });
        }
    }, [planId, navigate, step]);

    const formik = useFormik({
        initialValues: (() => {
            const draft = localStorage.getItem(STORAGE_KEY);
            if (draft) {
                try {
                    return JSON.parse(draft);
                } catch (e) {
                    console.error('Draft recovery failed:', e);
                }
            }
            return {
                name: '',
                domain: '',
                email: '',
                phone: '',
                address: '',
                city: '',
                state: '',
                zip_code: '',
                employee_count: parseInt(employees || '5', 10),
                planId: planId || '',
                cycle: cycle || 'MONTHLY',
                coupon: coupon || ''
            };
        })(),
        validationSchema: Yup.object({
            email: Yup.string().email('Invalid email address').required('Email is required'),
            name: Yup.string().min(2, 'Too short').max(255, 'Too long').required('Name is required'),
            domain: Yup.string()
                .matches(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9][a-z0-9-]{0,61}[a-z0-9])*$/, 'Invalid format (e.g. my-org or example.com)')
                .max(255, 'Domain is too long')
                .required('Organization domain is required'),
            address: Yup.string().required('Address is required'),
            city: Yup.string().required('City is required'),
            state: Yup.string().required('State is required'),
            zip_code: Yup.string().required('Pincode is required'),
            phone: Yup.string().required('Phone number is required'),
            employee_count: Yup.number().min(1, 'Min 1').required('Required'),
        }),
        onSubmit: async () => {
            console.log("Submit Step 1 triggered", formik.values);
            setError(null);
            setLoading(true);
            try {
                // 1. Check Domain Availability
                console.log("Checking domain availability:", formik.values.domain);
                const domainCheck = await tenantRegistrationService.checkAvailability({ subdomain: formik.values.domain });
                console.log("Domain check result:", domainCheck);
                if (!domainCheck.available) {
                    const msg = domainCheck.message || 'Workspace name is already taken';
                    formik.setFieldError('domain', msg);
                    formik.setFieldTouched('domain', true);
                    setError(`Domain Error: ${msg}`);
                    return;
                }

                // 2. Check Email Availability
                console.log("Checking email availability:", formik.values.email);
                const emailCheck = await tenantRegistrationService.checkAvailability({ email: formik.values.email });
                console.log("Email check result:", emailCheck);
                if (!emailCheck.available) {
                    const msg = emailCheck.message || 'Email is already registered';
                    formik.setFieldError('email', msg);
                    formik.setFieldTouched('email', true);
                    setError(`Email Error: ${msg}`);
                    return;
                }

                // If all good, proceed to review
                console.log("Validation passed, going to review step");
                setStep('review');
            } catch (err: any) {
                console.error("Submission error in Step 1:", err);
                setError(err?.response?.data?.message || 'Failed to verify availability. Please try again.');
            } finally {
                setLoading(false);
            }
        },
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formik.values));
    }, [formik.values]);

    // Fetch plan & coupon details for the review step / draft recovery
    useEffect(() => {
        const idToFetch = planId || formik.values.planId;
        if (idToFetch) {
            import('@/services/superAdmin.service').then(({ superAdminService }) => {
                superAdminService.getPlans().then(plans => {
                    const plan = plans.find((p: any) => p.id === idToFetch);
                    if (plan) setPlanData(plan);
                });
            });
        }

        // Auto-validate coupon if present in draft
        if (formik.values.coupon && !couponData) {
            api.post('/subscriptions/coupons/validate', { code: formik.values.coupon })
                .then(res => {
                    if (res.data.success) setCouponData(res.data.data);
                })
                .catch(console.error);
        }
    }, [planId, formik.values.planId, formik.values.coupon]);

    const handleDomainBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        formik.handleBlur(e);
        const value = e.target.value;
        if (!value || formik.errors.domain) return;

        try {
            const check = await tenantRegistrationService.checkAvailability({ subdomain: value });
            if (!check.available) {
                formik.setFieldError('domain', check.message || 'Workspace name is already taken');
            }
        } catch (err) {
            console.error('Domain check failed:', err);
        }
    };

    const handleEmailBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        formik.handleBlur(e);
        const value = e.target.value;
        if (!value || formik.errors.email) return;

        try {
            const check = await tenantRegistrationService.checkAvailability({ email: value });
            if (!check.available) {
                formik.setFieldError('email', check.message || 'Email is already registered');
            }
        } catch (err) {
            console.error('Email check failed:', err);
        }
    };

    const handleCouponBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        formik.handleBlur(e);
        const code = e.target.value;
        if (!code) {
            setCouponData(null);
            return;
        }

        try {
            console.log("Validating coupon:", code);
            const response = await api.post('/subscriptions/coupons/validate', { code });
            if (response.data.success) {
                setCouponData(response.data.data);
                setError(null);
            }
        } catch (err: any) {
            setCouponData(null);
            // We don't block the form for an invalid coupon, just show error
            setError(err?.response?.data?.message || 'Invalid Coupon Code');
        }
    };

    const handleSendOtp = async () => {
        setError(null);
        setLoading(true);
        try {
            await tenantRegistrationService.sendOtp(formik.values.email, formik.values.domain, formik.values.phone);
            setStep('otp');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to send verification code');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setError(null);
        setLoading(true);
        try {
            await tenantRegistrationService.sendOtp(formik.values.email, formik.values.domain, formik.values.phone);
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
        console.log('--- Handle Verify OTP Start ---');
        console.log('Email:', formik.values.email);
        console.log('Plan ID:', planId);

        try {
            await tenantRegistrationService.verifyOtp(formik.values.email, otpCode);
            const response = await tenantRegistrationService.registerTenant({
                ...formik.values,
                plan_id: formik.values.planId || planId || undefined,
                billing_cycle: cycle as any || formik.values.cycle || 'MONTHLY',
                employee_count: formik.values.employee_count,
                coupon_code: formik.values.coupon || undefined
            });

            console.log('--- Register Response Received ---', response);
            
            // The service returns the whole JSON object: { status, message, data: { paymentRequired, paymentData, ... } }
            const resultData = response.data;
            const paymentRequired = resultData?.paymentRequired;
            const paymentData = resultData?.paymentData;

            if (paymentRequired && paymentData) {
                // If amount is 0, backend might say skip_checkout
                if ((paymentData as any).skip_checkout) {
                    console.log('Zero amount detected, bypassing Cashfree and verifying...');
                    try {
                        await tenantRegistrationService.verifyPaymentPublic((paymentData as any).order_id);
                        setStep('success');
                    } catch (vErr) {
                        console.error('Verification failed for free subscription:', vErr);
                        navigate(`/payment-success?order_id=${(paymentData as any).order_id}`);
                    }
                    return;
                }

                console.log('Proceeding to Cashfree Checkout with Session:', paymentData.payment_session_id);
                try {
                    const cashfree = (window as any).Cashfree({ mode: "sandbox" });
                    await cashfree.checkout({
                        paymentSessionId: paymentData.payment_session_id,
                        redirectTarget: "_self"
                    });
                } catch (cfErr) {
                    console.error('Cashfree SDK Error:', cfErr);
                    // Fallback to manual payment page if SDK fails
                    const params = new URLSearchParams({
                        tenant_id: resultData.tenantId,
                        email: resultData.adminEmail
                    });
                    window.location.href = `/complete-payment?${params.toString()}`;
                }
            } else if (paymentRequired) {
                console.warn('Payment required but paymentData missing. Redirecting to recovery page.');
                const params = new URLSearchParams({
                    tenant_id: resultData.tenantId,
                    email: resultData.adminEmail
                });
                window.location.href = `/complete-payment?${params.toString()}`;
            } else {
                console.log('Registration success - No payment required.');
                setStep('success');
            }
        } catch (err: any) {
            console.error('Registration/Verification Error:', err);
            setError(err?.response?.data?.message || 'Failed to complete registration');
        } finally {
            setLoading(false);
            console.log('--- Handle Verify OTP End ---');
        }
    };


    const calculateBreakdown = (): {
        pricePerUser: number;
        subtotal: number;
        setup: number;
        discount: number;
        gst: number;
        total: number;
        durationMonths: number;
    } => {
        const count = formik.values.employee_count || 10;
        let duration = 1;
        const currentCycle = cycle || formik.values.cycle || 'MONTHLY';
        
        if (currentCycle === 'QUARTERLY') duration = 3;
        else if (currentCycle === 'HALF_YEARLY') duration = 6;
        else if (currentCycle === 'YEARLY') duration = 12;

        const isPremium = planData?.name?.toUpperCase() === 'PREMIUM' || planId?.includes('premium') || formik.values.planId?.includes('premium');
        
        // Correct realistic fallbacks based on your pricing configuration
        const fallbackUnitPrice = isPremium ? 70 : 55;
        const fallbackSetup = isPremium ? 6000 : 5000;

        const periodPriceEntry = planData?.prices?.find((p: any) => p.interval === currentCycle);
        let basePrice = parseFloat(periodPriceEntry?.unit_amount || planData?.current_price || planData?.price || fallbackUnitPrice);
        if (basePrice <= 0) basePrice = fallbackUnitPrice;

        let setupFee = parseFloat(planData?.setup_fee || 0);
        // Use the official setup fee from the DB if available, else use the verified fallbacks
        if (setupFee <= 0) setupFee = fallbackSetup;

        const subtotal = basePrice * count * (periodPriceEntry ? 1 : duration); 
        const totalTaxable = subtotal + setupFee;
        
        let discount = 0;
        if (couponData) {
            if (couponData.discount_type === 'PERCENT') {
                discount = Math.ceil((totalTaxable * couponData.discount_value) / 100);
            } else {
                discount = Math.min(totalTaxable, couponData.discount_value);
            }
        }

        const discountedTaxable = Math.max(0, totalTaxable - discount);
        const gst = Math.ceil(discountedTaxable * 0.18);
        
        return {
            pricePerUser: basePrice,
            subtotal,
            setup: setupFee,
            discount,
            gst,
            total: Math.ceil(discountedTaxable + gst),
            durationMonths: duration
        };
    };

    if (isAuthenticated) return <Navigate to="/dashboard" replace />;

    const breakdown = calculateBreakdown();

    return (
        <div className="h-screen w-full bg-gray-50 dark:bg-dark-bg flex flex-col items-center justify-start py-4 lg:py-10 px-4 overflow-y-auto overflow-x-hidden scroll-smooth">
            <div className="w-full max-w-4xl pb-20">
                <div className="flex justify-center mb-6 translate-y-1 opacity-80 scale-75 transform origin-top shrink-0">
                    <AnimatedLogo size="lg" />
                </div>

                <Card className="shadow-2xl border-none bg-white dark:bg-dark-card rounded-2xl overflow-visible">
                    <div className="p-0">
                        {step === 'details' && (
                            <div className="p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="text-center mb-4">
                                    <h1 className="text-2xl lg:text-4xl font-black text-gray-900 dark:text-white mb-1 uppercase tracking-tighter leading-none">Begin Your Journey</h1>
                                    <p className="text-[11px] text-gray-400 dark:text-muted italic px-4 font-bold">Complete your profile to unlock premium HRMS features. ✨</p>
                                </div>

                                {error && (
                                    <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/20 text-red-600 dark:text-red-400 text-xs font-black italic uppercase tracking-widest flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">⚠️</div>
                                        <span>{error}</span>
                                    </div>
                                )}

                                <form onSubmit={(e) => { e.preventDefault(); formik.handleSubmit(e); }}>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-10 mb-6">
                                        {/* Left Column */}
                                        <div className="space-y-3">
                                            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] border-b-2 border-primary/20 pb-1 italic">Basic Identity</h3>
                                            
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1 tracking-widest">Company Name *</label>
                                                <div className="relative group">
                                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors" size={16} />
                                                    <input name="name" value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border-2 ${formik.errors.name ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-gray-100 dark:border-white/5'} focus:border-primary/50 outline-none text-sm transition-all`} placeholder="WellZo Tech" />
                                                </div>
                                                {formik.errors.name && <p className="text-xs text-red-500 mt-1 ml-1 font-black italic uppercase">⚠️ {formik.errors.name as string}</p>}
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1 tracking-widest">Org Domain *</label>
                                                <div className="relative group">
                                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors" size={16} />
                                                    <input name="domain" value={formik.values.domain} onChange={formik.handleChange} onBlur={handleDomainBlur}
                                                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border-2 ${formik.errors.domain ? 'border-red-500 shadow-xl shadow-red-500/20' : 'border-gray-100 dark:border-white/5'} focus:border-primary/50 outline-none text-sm transition-all lowercase`} placeholder="my-org-domain" />
                                                </div>
                                                {formik.errors.domain && <p className="text-xs text-red-500 mt-1 ml-1 font-black italic uppercase">⚠️ {formik.errors.domain as string}</p>}
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1 tracking-widest">Work Email *</label>
                                                <input name="email" value={formik.values.email} onChange={formik.handleChange} onBlur={handleEmailBlur}
                                                    className={`w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border-2 ${formik.errors.email ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-gray-100 dark:border-white/5'} focus:border-primary/50 outline-none text-sm transition-all`} placeholder="admin@org.com" />
                                                {formik.errors.email && <p className="text-xs text-red-500 mt-1 ml-1 font-black italic uppercase">⚠️ {formik.errors.email as string}</p>}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1 tracking-widest">Phone *</label>
                                                    <input name="phone" value={formik.values.phone} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                                        className={`w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border-2 ${formik.errors.phone ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-gray-100 dark:border-white/5'} focus:border-primary/50 outline-none text-sm transition-all`} />
                                                    {formik.errors.phone && <p className="text-xs text-red-500 mt-1 ml-1 font-black italic uppercase">⚠️ {formik.errors.phone as string}</p>}
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1 tracking-widest">Employees *</label>
                                                    <input type="number" name="employee_count" value={formik.values.employee_count} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                                        className={`w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border-2 ${formik.errors.employee_count ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-gray-100 dark:border-white/5'} focus:border-primary/50 outline-none text-sm transition-all`} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column */}
                                        <div className="space-y-5">
                                            <h3 className="text-xs font-black text-primary uppercase tracking-widest border-b-2 border-primary/20 pb-1 italic">Headquarters</h3>
                                            
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1 tracking-widest">Address *</label>
                                                <textarea name="address" rows={2} value={formik.values.address} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                                    className={`w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border-2 ${formik.errors.address ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-gray-100 dark:border-white/5'} focus:border-primary/50 outline-none text-sm transition-all resize-none`} placeholder="Full address..." />
                                                {formik.errors.address && <p className="text-xs text-red-500 mt-1 ml-1 font-black italic uppercase">⚠️ {formik.errors.address as string}</p>}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1 tracking-widest">City *</label>
                                                    <input name="city" value={formik.values.city} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                                        className={`w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border-2 ${formik.errors.city ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-gray-100 dark:border-white/5'} focus:border-primary/50 outline-none text-sm transition-all`} />
                                                    {formik.errors.city && <p className="text-xs text-red-500 mt-1 ml-1 font-black italic uppercase text-[8px] truncate">⚠️ {formik.errors.city as string}</p>}
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1 tracking-widest">State *</label>
                                                    <input name="state" value={formik.values.state} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                                        className={`w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border-2 ${formik.errors.state ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-gray-100 dark:border-white/5'} focus:border-primary/50 outline-none text-sm transition-all`} />
                                                    {formik.errors.state && <p className="text-xs text-red-500 mt-1 ml-1 font-black italic uppercase text-[8px] truncate">⚠️ {formik.errors.state as string}</p>}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1 tracking-widest">ZIP Code *</label>
                                                    <input name="zip_code" value={formik.values.zip_code} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                                        className={`w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border-2 ${formik.errors.zip_code ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-gray-100 dark:border-white/5'} focus:border-primary/50 outline-none text-sm transition-all`} placeholder="533124" />
                                                    {formik.errors.zip_code && <p className="text-xs text-red-500 mt-1 ml-1 font-black italic uppercase">⚠️ {formik.errors.zip_code as string}</p>}
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-[#e9f225] bg-[#e9f225]/10 px-2 py-0.5 rounded italic mb-1 ml-1 tracking-widest w-fit">Coupon Code</label>
                                                    <input name="coupon" value={formik.values.coupon} onChange={formik.handleChange} onBlur={handleCouponBlur}
                                                        className={`w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border-2 border-dashed ${couponData ? 'border-green-500 bg-green-500/5' : 'border-[#e9f225]/30'} focus:border-[#e9f225] outline-none text-sm transition-all uppercase placeholder:normal-case font-bold`} placeholder="GIGGLE25..." />
                                                    {couponData && <p className="text-[9px] text-green-500 mt-1 ml-1 font-black italic uppercase italic">✓ Applied: {couponData.discount_type === 'PERCENT' ? `${couponData.discount_value}% Off` : `₹${couponData.discount_value} Off`}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-white/10">
                                        <button type="button" onClick={() => navigate('/pricing')} className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-all">
                                            <ArrowLeft size={16} /> Abort
                                        </button>
                                        <Button type="submit" isLoading={loading} className="h-12 px-12 rounded-xl text-sm font-black tracking-widest uppercase shadow-xl shadow-primary/30 animate-in fade-in slide-in-from-right-4">
                                            Next: Review →
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {step === 'review' && (
                            <div className="p-4 lg:p-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="text-center mb-4">
                                    <h2 className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white inline-flex items-center justify-center gap-2">
                                        <BadgeCheck className="text-primary" size={24} /> Confirm Details
                                    </h2>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Final verification before security deployment.</p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-2">
                                    <div className="bg-gray-50/50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10">
                                        <h3 className="text-[9px] font-black uppercase tracking-widest text-primary mb-3 pb-1 border-b border-primary/10 italic">Identity Summary</h3>
                                        <div className="space-y-2.5">
                                            <div className="flex justify-between border-b border-gray-100 dark:border-white/5 pb-1.5">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Org</span>
                                                <span className="text-xs font-black text-gray-900 dark:text-white uppercase truncate ml-4">{formik.values.name}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 dark:border-white/5 pb-1.5">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Workforce</span>
                                                <span className="text-xs font-black text-gray-900 dark:text-white">{formik.values.employee_count} Persons</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 dark:border-white/5 pb-1.5">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Plan</span>
                                                <span className="text-xs font-black text-primary uppercase italic">{planData?.name || 'Standard'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 dark:border-white/5 pb-1.5">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Cycle</span>
                                                <span className="text-xs font-black text-gray-600 dark:text-gray-300 uppercase truncate ml-4">{cycle.replace('_', ' ')}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 dark:border-white/5 pb-1.5">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Email</span>
                                                <span className="text-xs font-black text-gray-900 dark:text-white truncate ml-4">{formik.values.email}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 dark:border-white/5 pb-1.5">
                                                <span className="text-[9px] font-bold text-primary uppercase italic">Valid Until</span>
                                                <span className="text-xs font-black text-primary">
                                                    {new Date(new Date().setMonth(new Date().getMonth() + breakdown.durationMonths)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <div className="pt-1">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Corporate Seat</span>
                                                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 leading-tight uppercase line-clamp-2">
                                                    {formik.values.address}, {formik.values.city}, {formik.values.state} - {formik.values.zip_code}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-2xl border-2 border-primary/20 relative overflow-hidden group">
                                        <h3 className="text-[9px] font-black uppercase tracking-widest text-primary mb-3 pb-1 border-b border-primary/10 italic">Billing Protocol</h3>
                                        <div className="space-y-3 relative z-10">
                                            <div className="flex justify-between items-start text-xs font-bold">
                                                <div className="space-y-0.5">
                                                    <span className="text-gray-500 uppercase block text-[10px] tracking-tighter">SaaS Subscription</span>
                                                    <span className="text-[8px] text-gray-400 font-bold italic">({formik.values.employee_count} Users × ₹{breakdown.pricePerUser.toLocaleString()} × {breakdown.durationMonths}mo)</span>
                                                </div>
                                                <span className="text-gray-900 dark:text-white font-black">₹{breakdown.subtotal.toLocaleString()}</span>
                                            </div>
                                            
                                            <div className="flex justify-between text-xs font-bold py-1 border-b border-gray-100 dark:border-white/5">
                                                <span className="text-gray-500 uppercase text-[10px]">Onboarding Setup Fee</span>
                                                <span className="text-gray-900 dark:text-white font-black">+ ₹{breakdown.setup.toLocaleString()}</span>
                                            </div>

                                            {formik.values.coupon && (
                                                <div className="space-y-1.5 py-1">
                                                    <div className={`flex justify-between items-center text-xs font-bold ${breakdown.discount > 0 ? 'text-green-500 bg-green-500/10 border-green-500/20' : 'text-yellow-500 bg-yellow-500/5 border-yellow-500/10'} px-3 py-2 rounded-xl border shadow-sm animate-in zoom-in duration-300`}>
                                                        <div className="flex flex-col">
                                                            <span className="uppercase text-[9px] font-black italic">✓ {breakdown.discount > 0 ? 'Coupon Applied' : 'Verifying...'}</span>
                                                            <span className="text-[7.5px] opacity-70 uppercase tracking-widest font-black leading-none">{formik.values.coupon}</span>
                                                        </div>
                                                        <span className="font-black text-sm">- ₹{breakdown.discount.toLocaleString()}</span>
                                                    </div>
                                                    {breakdown.discount > 0 && (
                                                        <div className="flex justify-between px-1 text-[9px] font-black text-gray-500 uppercase italic">
                                                            <span className="tracking-tight">Taxable Value (Before IGST)</span>
                                                            <span className="text-primary font-bold">₹{Math.max(0, breakdown.subtotal + breakdown.setup - breakdown.discount).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex justify-between text-[10px] font-bold text-gray-400 pt-1">
                                                <span className="uppercase tracking-widest">IGST (18%)</span>
                                                <span className="font-black text-gray-700 dark:text-gray-300">₹{breakdown.gst.toLocaleString()}</span>
                                            </div>

                                            <div className="flex justify-between items-baseline text-xl font-black pt-3 border-t-2 border-primary/10 mt-1">
                                                <span className="text-primary italic text-[10px] uppercase tracking-[0.2em]">TOTAL DUE</span>
                                                <div className="text-gray-900 dark:text-white flex items-baseline gap-1">
                                                    <span className="text-xs font-black text-primary">₹</span>
                                                    <span className="tracking-tighter text-2xl">{breakdown.total.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button onClick={() => setStep('details')} className="px-6 h-11 rounded-xl border-2 border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-[10px] font-black uppercase tracking-widest transition-all">Back</button>
                                    <Button onClick={handleSendOtp} disabled={loading} className="flex-1 h-11 rounded-xl shadow-xl shadow-primary/20 text-[10px] font-black tracking-widest uppercase">
                                        {loading ? <Loader2 className="animate-spin" /> : 'Confirm & Proceed →'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === 'otp' && (
                            <div className="p-6 lg:p-12 text-center animate-in fade-in zoom-in duration-300">
                                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
                                    <Mail className="text-primary" size={40} />
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tighter">Verify Security Code</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 font-bold italic">Sent to: {formik.values.email}</p>
                                
                                {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-black italic uppercase">⚠️ {error}</div>}
                                
                                <input type="text" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                    className="w-full text-center text-4xl tracking-widest font-black py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border-4 border-gray-100 dark:border-white/10 focus:border-primary outline-none mb-8 transition-all" placeholder="000000" />
                                
                                <Button onClick={handleVerifyOtp} disabled={loading || otpCode.length !== 6} className="w-full h-14 rounded-2xl shadow-xl shadow-primary/20 text-sm font-black tracking-widest uppercase">
                                    {loading ? <Loader2 className="animate-spin" /> : 'Finish Registration'}
                                </Button>

                                <button onClick={handleResendOtp} disabled={loading} className="mt-6 text-[10px] font-black text-primary uppercase tracking-widest hover:text-primary/70 transition-all disabled:opacity-50 underline decoration-2 underline-offset-4">
                                    Didn't receive code? Resend
                                </button>
                                
                                <button onClick={() => setStep('review')} className="mt-8 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600">← Back to Review</button>
                            </div>
                        )}

                        {step === 'success' && (
                            <div className="p-12 text-center animate-in fade-in zoom-in duration-500">
                                <CheckCircle2 className="text-green-500 mx-auto mb-8" size={80} />
                                <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tighter">Welcome Aboard!</h1>
                                <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-sm mx-auto font-bold italic leading-relaxed">Your organization is active. Initial credentials have been dispatched to your inbox.</p>
                                <Button onClick={() => navigate('/login')} className="px-12 h-14 rounded-2xl text-sm font-black tracking-widest uppercase shadow-xl shadow-primary/20">Go to Dashboard →</Button>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};
