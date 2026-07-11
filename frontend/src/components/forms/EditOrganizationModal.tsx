import React, { useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { adminService } from '@/services/admin.service';

interface EditOrganizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const validationSchema = Yup.object({
    name: Yup.string()
        .min(2, 'Name must be at least 2 characters')
        .max(255, 'Name must not exceed 255 characters')
        .required('Organization name is required'),
    phone: Yup.string()
        .matches(/^[0-9+\-()\s\.]*$/, 'Phone number can only contain numbers and basic symbols (+, -, (, ), .)')
        .max(20, 'Phone must not exceed 20 characters')
        .nullable(),
    email: Yup.string()
        .email('Invalid email format')
        .max(255, 'Email must not exceed 255 characters')
        .required('Email is required'),
});

export const EditOrganizationModal: React.FC<EditOrganizationModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [isLoading, setIsLoading] = React.useState(false);
    const [initialDataLoading, setInitialDataLoading] = React.useState(false);

    const formik = useFormik({
        initialValues: {
            name: '',
            phone: '',
            email: '',
            address: '',
            city: '',
            state: '',
            country: '',
        },
        validationSchema,
        onSubmit: async (values) => {
            setIsLoading(true);
            try {
                await adminService.updateTenantProfile(values);
                toast('Organization updated successfully', { icon: '✅' });
                if (onSuccess) onSuccess();
                onClose();
            } catch (err: any) {
                const message = err.response?.data?.message || err.message || 'Failed to update organization';
                toast(message, { icon: '❌' });
            } finally {
                setIsLoading(false);
            }
        },
    });

    useEffect(() => {
        if (isOpen) {
            fetchProfile();
        }
    }, [isOpen]);

    const fetchProfile = async () => {
        setInitialDataLoading(true);
        try {
            const profile = await adminService.getTenantProfile();
            formik.setValues({
                name: profile.name || '',
                phone: profile.phone || '',
                email: profile.email || '',
                address: (profile as any).address || '',
                city: profile.city || '',
                state: profile.state || '',
                country: profile.country || '',
            });
        } catch (err) {
            console.error('Failed to fetch tenant profile:', err);
        } finally {
            setInitialDataLoading(false);
        }
    };

    const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement;
        const name = target.name;
        if (name === 'name') {
            target.value = target.value.replace(/[^A-Za-z\s\-\.]/g, '');
        } else if (name === 'phone') {
            target.value = target.value.replace(/[^0-9+\-()\s\.]/g, '');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-brand-600 via-brand-500 to-teal-500 text-white">
                            <Building2 size={24} />
                        </div>
                        <DialogTitle>Edit Organization</DialogTitle>
                    </div>
                </DialogHeader>

                <form onSubmit={formik.handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Organization Name *</label>
                            <input
                                name="name"
                                value={formik.values.name}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                onInput={handleInput}
                                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 disabled:opacity-50"
                                placeholder="Acme Inc."
                                disabled={initialDataLoading}
                            />
                            {formik.touched.name && formik.errors.name && <p className="text-xs text-red-400 mt-1">{formik.errors.name}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Phone</label>
                                <input
                                    name="phone"
                                    value={formik.values.phone}
                                    onChange={formik.handleChange}
                                    onInput={handleInput}
                                    className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 disabled:opacity-50"
                                    placeholder="+1 234 567 890"
                                    disabled={initialDataLoading}
                                />
                                {formik.touched.phone && formik.errors.phone && <p className="text-xs text-red-400 mt-1">{formik.errors.phone}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Email *</label>
                                <input
                                    name="email"
                                    type="email"
                                    value={formik.values.email}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 disabled:opacity-50"
                                    placeholder="admin@company.com"
                                    disabled={initialDataLoading}
                                />
                                {formik.touched.email && formik.errors.email && <p className="text-xs text-red-400 mt-1">{formik.errors.email}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Address</label>
                            <input
                                name="address"
                                value={formik.values.address}
                                onChange={formik.handleChange}
                                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 disabled:opacity-50"
                                placeholder="123 Main St"
                                disabled={initialDataLoading}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">City</label>
                                <input
                                    name="city"
                                    value={formik.values.city}
                                    onChange={formik.handleChange}
                                    className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 disabled:opacity-50"
                                    disabled={initialDataLoading}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">State</label>
                                <input
                                    name="state"
                                    value={formik.values.state}
                                    onChange={formik.handleChange}
                                    className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 disabled:opacity-50"
                                    disabled={initialDataLoading}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Country</label>
                                <input
                                    name="country"
                                    value={formik.values.country}
                                    onChange={formik.handleChange}
                                    className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 disabled:opacity-50"
                                    disabled={initialDataLoading}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || initialDataLoading}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
