import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Card } from '@/components/ui/Card';
import { ArrowLeft } from 'lucide-react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Button } from '@/components/ui/Button';
import { tenantRegistrationService } from '@/services/tenantRegistration.service';

export const RegisterPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [message, setMessage] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const formik = useFormik({
        initialValues: {
            name: '',
            email: '',
            domain: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            country: '',
            zip_code: '',
        },
        validationSchema: Yup.object({
            name: Yup.string()
                .min(2, 'Organization name must be at least 2 characters')
                .max(255, 'Organization name must not exceed 255 characters')
                .required('Organization name is required'),
            email: Yup.string()
                .email('Please enter a valid email address')
                .max(255, 'Email must not exceed 255 characters')
                .required('Email is required'),
            domain: Yup.string().max(255, 'Domain must not exceed 255 characters'),
            phone: Yup.string()
                .matches(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format. Use only digits, spaces, hyphens, +, (, )')
                .test('digits', 'Phone number must contain at least 10 digits', (val) => {
                    if (!val) return true;
                    return val.replace(/\D/g, '').length >= 10;
                })
                .max(20, 'Phone must not exceed 20 characters'),
            address: Yup.string().max(500, 'Address must not exceed 500 characters'),
            city: Yup.string().max(100, 'City must not exceed 100 characters'),
            state: Yup.string().max(100, 'State must not exceed 100 characters'),
            country: Yup.string().max(100, 'Country must not exceed 100 characters'),
            zip_code: Yup.string().max(20, 'Zip code must not exceed 20 characters'),
        }),
        onSubmit: async (values) => {
            setMessage(null);
            setError(null);
            try {
                await tenantRegistrationService.registerTenant(values);
                setMessage('Tenant registered successfully. Please check your admin email for temporary credentials.');
                formik.resetForm();
            } catch (err: any) {
                let errorMsg = err?.response?.data?.message || err?.message || 'Registration failed';

                // Map common backend errors if they slip through
                if (errorMsg.includes('already exists')) {
                    errorMsg = 'A tenant with this email, domain, or phone already exists.';
                }

                setError(errorMsg);
            }
        },
    });

    const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement;
        const name = target.name;
        if (name === 'name') {
            target.value = target.value.replace(/[^A-Za-z\s\-\.]/g, '');
        } else if (name === 'phone') {
            target.value = target.value.replace(/[^0-9+\-()\s\.]/g, '');
        }
    };

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-6">
            <div className="w-full max-w-4xl">
                <div className="flex items-center gap-3 mb-8 justify-center">
                    <AnimatedLogo size="lg" />
                </div>

                <Card>
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Create account</h1>
                        <p className="text-gray-600 dark:text-muted">Register your organization to get started</p>
                    </div>

                    {message && <div className="mb-4 p-3 rounded bg-green-500/10 border border-green-500/20 text-sm text-green-700">{message}</div>}
                    {error && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}

                    <form onSubmit={formik.handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Organization Name *</label>
                                    <input
                                        name="name"
                                        value={formik.values.name}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        onInput={handleInput}
                                        className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="Acme Inc."
                                    />
                                    {formik.touched.name && formik.errors.name && <p className="text-xs text-red-400 mt-1">{formik.errors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Admin Email *</label>
                                    <input
                                        name="email"
                                        type="email"
                                        value={formik.values.email}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="admin@company.com"
                                    />
                                    {formik.touched.email && formik.errors.email && <p className="text-xs text-red-400 mt-1">{formik.errors.email}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Domain</label>
                                    <input
                                        name="domain"
                                        value={formik.values.domain}
                                        onChange={formik.handleChange}
                                        className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="yourcompany.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Phone</label>
                                    <input
                                        name="phone"
                                        // pattern="^\+?[0-9\s\-()]{10,18}$" // Removed invalid regex, using Yup validation instead
                                        value={formik.values.phone}
                                        onChange={formik.handleChange}
                                        onInput={handleInput}
                                        className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="+1 234 567 890"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">City</label>
                                        <input
                                            name="city"
                                            value={formik.values.city}
                                            onChange={formik.handleChange}
                                            className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">State</label>
                                        <input
                                            name="state"
                                            value={formik.values.state}
                                            onChange={formik.handleChange}
                                            className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Country</label>
                                        <input
                                            name="country"
                                            value={formik.values.country}
                                            onChange={formik.handleChange}
                                            className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Zip</label>
                                        <input
                                            name="zip_code"
                                            value={formik.values.zip_code}
                                            onChange={formik.handleChange}
                                            className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Address</label>
                                    <input
                                        name="address"
                                        value={formik.values.address}
                                        onChange={formik.handleChange}
                                        className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-dark-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="123 Main St"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" className="px-8">
                                Register Tenant
                            </Button>
                        </div>
                    </form>

                    <div className="pt-6 border-t border-gray-200 dark:border-dark-border mt-6">
                        <a
                            href="/"
                            className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-muted hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft size={16} />
                            Back to home
                        </a>
                    </div>
                </Card>
            </div>
        </div>
    );
};

