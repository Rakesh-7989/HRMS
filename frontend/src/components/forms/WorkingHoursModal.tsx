import React, { useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import { Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { adminService } from '@/services/admin.service';
import { cn } from '@/utils/cn';

interface WorkingHoursModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const validationSchema = Yup.object({
    startTime: Yup.string().required('Start time is required'),
    endTime: Yup.string().required('End time is required'),
    workingDays: Yup.array().min(1, 'Select at least one working day'),
});

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const WorkingHoursModal: React.FC<WorkingHoursModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [isLoading, setIsLoading] = React.useState(false);
    const [initialDataLoading, setInitialDataLoading] = React.useState(false);

    const formik = useFormik({
        initialValues: {
            startTime: '09:00',
            endTime: '18:00',
            workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as string[],
        },
        validationSchema,
        onSubmit: async (values) => {
            setIsLoading(true);
            try {
                // We update the tenant profile with the new settings
                // Note: The backend currently hardcodes 10 hours, so this won't affect logic yet.
                await adminService.updateTenantProfile({
                    settings: {
                        workingHours: values
                    }
                });
                toast('Working hours updated successfully', { icon: '✅' });
                if (onSuccess) onSuccess();
                onClose();
            } catch (err: any) {
                const message = err.response?.data?.message || err.message || 'Failed to update working hours';
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
            if (profile.settings?.workingHours) {
                formik.setValues({
                    startTime: profile.settings.workingHours.startTime || '09:00',
                    endTime: profile.settings.workingHours.endTime || '18:00',
                    workingDays: profile.settings.workingHours.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                });
            }
        } catch (err) {
            console.error('Failed to fetch tenant profile:', err);
        } finally {
            setInitialDataLoading(false);
        }
    };

    const toggleDay = (day: string) => {
        const currentDays = [...formik.values.workingDays];
        const index = currentDays.indexOf(day);
        if (index > -1) {
            currentDays.splice(index, 1);
        } else {
            currentDays.push(day);
        }
        formik.setFieldValue('workingDays', currentDays);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-brand-600 via-brand-500 to-teal-500 text-white">
                            <Clock size={24} />
                        </div>
                        <DialogTitle>Configure Working Hours</DialogTitle>
                    </div>
                </DialogHeader>

                <form onSubmit={formik.handleSubmit} className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-gray-900 dark:text-white">Start Time</label>
                            <input
                                name="startTime"
                                type="time"
                                value={formik.values.startTime}
                                onChange={formik.handleChange}
                                className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 disabled:opacity-50 text-gray-900 dark:text-white"
                                disabled={initialDataLoading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-gray-900 dark:text-white">End Time</label>
                            <input
                                name="endTime"
                                type="time"
                                value={formik.values.endTime}
                                onChange={formik.handleChange}
                                className="w-full px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 disabled:opacity-50 text-gray-900 dark:text-white"
                                disabled={initialDataLoading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-3 text-gray-900 dark:text-white">Working Days</label>
                        <div className="grid grid-cols-4 gap-2">
                            {DAYS.map(day => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDay(day)}
                                    className={cn(
                                        "px-2 py-2 text-xs font-medium rounded-lg border transition-all",
                                        formik.values.workingDays.includes(day)
                                            ? "bg-brand-500 text-white border-brand-500 shadow-elev-1"
                                            : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-brand-500/50"
                                    )}
                                    disabled={initialDataLoading}
                                >
                                    {day.substring(0, 3)}
                                </button>
                            ))}
                        </div>
                        {formik.touched.workingDays && formik.errors.workingDays && (
                            <p className="text-xs text-red-500 mt-2">{formik.errors.workingDays}</p>
                        )}
                    </div>

                    <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-800 text-xs text-brand-600 dark:text-brand-400">
                        <p>Total hours will be calculated based on start and end times, excluding breaks if any are added later.</p>
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
