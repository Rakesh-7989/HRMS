import React from 'react';
import { motion } from 'framer-motion';
import { Check, Mail, Building2, User, Users, MessageSquare, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import api from '@/services/api';

interface ContactSalesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ContactSalesModal: React.FC<ContactSalesModalProps> = ({ isOpen, onClose }) => {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isSuccess, setIsSuccess] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const formData = new FormData(e.currentTarget);
            const data = Object.fromEntries(formData.entries());

            // Simple client side validation
            if (!data.fullName || !data.workEmail || !data.message) {
                toast.error('Please fill in all required fields');
                setIsSubmitting(false);
                return;
            }

            await api.post('/common/contact-sales', data);

            setIsSuccess(true);
            toast.success('Inquiry sent successfully!');
            setTimeout(() => {
                onClose();
                setIsSuccess(false);
            }, 2000);
        } catch (error: any) {
            console.error('Submission error:', error);
            toast.error(error.message || 'Failed to send inquiry. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose} className="max-w-md">
            <DialogHeader className="relative">
                <div className="flex items-start justify-between">
                    <div>
                        <DialogTitle className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                            Contact Sales
                        </DialogTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Get a custom plan tailored to your organization's needs.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                        }}
                        className="relative z-50 p-2 -mr-2 -mt-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        aria-label="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </DialogHeader>

            <DialogContent className="py-6">
                {isSuccess ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-8 text-center"
                    >
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                            <Check className="text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Inquiry Sent!</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Our team will reach out to you shortly.
                        </p>
                    </motion.div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input required name="fullName" className="pl-10" placeholder="Enter your full name" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Work Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input required name="workEmail" type="email" className="pl-10" placeholder="example@company.com" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input required name="phoneNumber" type="tel" className="pl-10" placeholder="+91 9876543210" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Company</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input required name="company" className="pl-10" placeholder="Acme Inc" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Team Size</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input required name="teamSize" type="text" className="pl-10" placeholder="500+" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Message</label>
                            <div className="relative">
                                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <textarea
                                    required
                                    name="message"
                                    className="w-full min-h-[100px] pl-10 pt-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all text-sm outline-none"
                                    placeholder="Tell us about your requirements..."
                                />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-6 text-[10px] font-black uppercase tracking-widest"
                        >
                            {isSubmitting ? 'Sending...' : 'Send Inquiry'}
                        </Button>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};
