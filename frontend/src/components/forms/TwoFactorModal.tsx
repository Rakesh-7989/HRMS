import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Shield, Smartphone, ArrowRight, CheckCircle2, Copy, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TwoFactorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [code, setCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleVerify = () => {
        setIsVerifying(true);
        setError('');

        // Simulate verification delay
        setTimeout(() => {
            if (code === '123456' || code.length === 6) {
                setStep(4);
                onSuccess();
            } else {
                setError('Invalid verification code. Please try again.');
            }
            setIsVerifying(false);
        }, 1500);
    };

    const reset = () => {
        setStep(1);
        setCode('');
        setError('');
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader className="flex items-start justify-between">
                    <DialogTitle>Two-Factor Authentication (2FA)</DialogTitle>
                    <button
                        onClick={handleClose}
                        aria-label="Close"
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                    >
                        <X size={18} />
                    </button>
                </DialogHeader>

                <div className="py-4">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <div className="flex justify-center py-4">
                                    <div className="p-4 rounded-full bg-primary/10">
                                        <Shield size={64} className="text-primary" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Secure Your Account</h3>
                                    <p className="mt-2 text-gray-600 dark:text-muted">
                                        Two-factor authentication adds an extra layer of security to your account. To log in, you'll need to provide a 6-digit code from your authenticator app.
                                    </p>
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <Button variant="outline" className="flex-1" onClick={handleClose}>
                                        Cancel
                                    </Button>
                                    <Button className="flex-1" onClick={handleNext}>
                                        Get Started
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">1</div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Scan QR Code</h3>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-muted">
                                    Scan this QR code with your authenticator app (e.g., Google Authenticator, Authy).
                                </p>
                                <div className="flex justify-center py-4 bg-white rounded-lg border dark:border-gray-800">
                                    <div className="w-40 h-40 bg-gray-100 flex items-center justify-center relative group">
                                        <div className="grid grid-cols-4 gap-1 p-2">
                                            {Array.from({ length: 16 }).map((_, i) => (
                                                <div key={i} className={`w-8 h-8 ${Math.random() > 0.5 ? 'bg-black' : 'bg-transparent'}`} />
                                            ))}
                                        </div>
                                        <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Smartphone className="text-gray-400" size={32} />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-between border dark:border-gray-800">
                                    <div className="truncate mr-2">
                                        <p className="text-[10px] uppercase text-gray-500 font-bold">Account Key</p>
                                        <p className="font-mono text-sm select-all">HRMS-DS-2A-SIM-KEY-2026</p>
                                    </div>
                                    <Button variant="ghost" size="sm" type="button" onClick={() => navigator.clipboard.writeText('HRMS-DS-2A-SIM-KEY-2026')}>
                                        <Copy size={14} />
                                    </Button>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button variant="outline" className="flex-1" type="button" onClick={handleBack}>Back</Button>
                                    <Button className="flex-1" type="button" onClick={handleNext}>Next <ArrowRight className="ml-2" size={16} /></Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">2</div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Verify Setup</h3>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-muted">
                                    Enter the 6-digit verification code generated by your authenticator app.
                                </p>
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Enter 6-digit code (Use 123456)"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="text-center text-2xl tracking-[0.5em] font-bold py-6"
                                        disabled={isVerifying}
                                    />
                                    {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button variant="outline" className="flex-1" type="button" onClick={handleBack} disabled={isVerifying}>Back</Button>
                                    <Button
                                        className="flex-1"
                                        type="button"
                                        onClick={handleVerify}
                                        disabled={code.length !== 6 || isVerifying}
                                        isLoading={isVerifying}
                                    >
                                        Confirm
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-6 text-center py-6"
                            >
                                <div className="flex justify-center">
                                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                        <CheckCircle2 size={40} className="text-green-500" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">2FA Enabled!</h3>
                                    <p className="mt-2 text-gray-600 dark:text-muted">
                                        Your account is now more secure. You've successfully simulated the 2FA setup process.
                                    </p>
                                </div>
                                <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-100 dark:border-yellow-900/20 text-left">
                                    <p className="text-xs font-bold text-yellow-700 dark:text-yellow-500 uppercase flex items-center gap-2 mb-1">
                                        <RefreshCw size={12} /> Persisted Locally
                                    </p>
                                    <p className="text-xs text-yellow-600 dark:text-yellow-600/80">
                                        This status is saved in your browser's local storage and will persist even after page refresh.
                                    </p>
                                </div>
                                <Button className="w-full" type="button" onClick={handleClose}>
                                    Done
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
};
