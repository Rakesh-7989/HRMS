import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { authService } from '@/services/auth.service';
import { showToast } from '@/utils/toast';
import { Shield, Copy, Check, AlertTriangle, Key, X } from 'lucide-react';

interface TwoFactorModalProps {
    isOpen: boolean;
    onClose: () => void;
    isTwoFactorEnabled: boolean;
    onStatusChange: (enabled: boolean) => void;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
    isOpen,
    onClose,
    isTwoFactorEnabled,
    onStatusChange,
}) => {
    const [step, setStep] = useState<'setup' | 'verify' | 'recovery' | 'disable'>('setup');
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [token, setToken] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (isTwoFactorEnabled && step === 'setup') {
                setStep('disable');
            } else if (!isTwoFactorEnabled) {
                handleSetup();
            }
        } else {
            resetState();
        }
    }, [isOpen]);

    const resetState = () => {
        setStep('setup');
        setQrCode('');
        setSecret('');
        setToken('');
        setRecoveryCodes([]);
        setPassword('');
        setCopied(false);
    };

    const handleSetup = async () => {
        try {
            setLoading(true);
            const data = await authService.setup2FA();
            setQrCode(data.qrCodeDataURL);
            setSecret(data.secret);
            setStep('setup');
        } catch (error) {
            showToast.error('Failed to initialize 2FA setup');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleEnable = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await authService.enable2FA(token);
            setRecoveryCodes(data.recoveryCodes);
            setStep('recovery');
            onStatusChange(true);
            showToast.success('Two-factor authentication enabled!');
        } catch (error: any) {
            showToast.error(error.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async () => {
        if (!password) return;
        try {
            setLoading(true);
            await authService.disable2FA(password);
            onStatusChange(false);
            showToast.success('Two-factor authentication disabled');
            onClose();
        } catch (error: any) {
            showToast.error(error.response?.data?.message || 'Failed to disable 2FA');
        } finally {
            setLoading(false);
        }
    };

    const copyRecoveryCodes = () => {
        const text = recoveryCodes.join('\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="relative pr-8">
                    <button
                        onClick={onClose}
                        className="absolute right-0 top-0 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="text-primary" size={20} />
                        Two-Factor Authentication
                    </DialogTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {isTwoFactorEnabled
                            ? 'Securing your account with a secondary verification method.'
                            : 'Protect your account with an extra layer of security.'}
                    </p>
                </DialogHeader>

                <div className="py-4">
                    {step === 'setup' && (
                        <div className="space-y-6 text-center">
                            <div className="flex justify-center">
                                <div className="p-4 bg-white rounded-xl shadow-inner border border-gray-100">
                                    {qrCode ? (
                                        <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                                    ) : (
                                        <div className="w-48 h-48 flex items-center justify-center bg-gray-50">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                <p>1. Install an authenticator app (e.g., Google Authenticator, Authy, or Microsoft Authenticator).</p>
                                <p>2. Scan the QR code above or enter the code manually.</p>
                                <div className="flex items-center justify-center gap-2 mt-2">
                                    <code className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded text-xs font-mono select-all">
                                        {secret}
                                    </code>
                                </div>
                            </div>

                            <Button
                                onClick={() => setStep('verify')}
                                className="w-full"
                                disabled={!qrCode}
                            >
                                Next Step
                            </Button>
                        </div>
                    )}

                    {step === 'verify' && (
                        <div className="space-y-4">
                            <div className="text-center space-y-2 mb-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Enter the 6-digit code from your authenticator app to complete setup.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="2fa-token">Verification Code</Label>
                                <Input
                                    id="2fa-token"
                                    placeholder="000000"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="text-center text-2xl tracking-[1em] font-mono h-14"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button variant="outline" className="flex-1" onClick={() => setStep('setup')}>
                                    Back
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleEnable}
                                    isLoading={loading}
                                >
                                    Verify & Enable
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'recovery' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-fuchsia-50 dark:bg-fuchsia-900/20 rounded-xl border border-fuchsia-100 dark:border-fuchsia-800 flex gap-3">
                                <AlertTriangle className="text-fuchsia-600 shrink-0" size={20} />
                                <p className="text-xs text-fuchsia-800 dark:text-fuchsia-300">
                                    Save these recovery codes in a safe place. They are the <b>only way</b> to access your account if you lose your device.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 font-mono text-sm">
                                {recoveryCodes.map((code, i) => (
                                    <div key={i} className="text-center py-1 select-all">{code}</div>
                                ))}
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                <Button variant="outline" className="w-full gap-2" onClick={copyRecoveryCodes}>
                                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                    {copied ? 'Copied!' : 'Copy Recovery Codes'}
                                </Button>
                                <Button className="w-full" onClick={onClose}>
                                    Done
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'disable' && (
                        <div className="space-y-4">
                            <div className="text-center space-y-2 mb-4">
                                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-2 text-red-600">
                                    <Shield size={32} />
                                </div>
                                <h4 className="font-bold text-gray-900 dark:text-white">Disable 2FA?</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Are you sure you want to disable two-factor authentication? This will significantly decrease your account security.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="current-password">Enter Password to Confirm</Label>
                                <div className="relative">
                                    <Input
                                        id="current-password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10"
                                    />
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button variant="outline" className="flex-1" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={handleDisable}
                                    isLoading={loading}
                                >
                                    Disable 2FA
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
