import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { subscriptionService } from '@/services/subscription.service';
import { useTranslation } from 'react-i18next';

export const PaymentSuccessPage: React.FC = () => {
  const { t: _t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order_id');

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('Verifying your payment...');

    useEffect(() => {
        const verify = async () => {
            if (!orderId) {
                setStatus('error');
                setMessage('Invalid order reference. Please contact support if amount was deducted.');
                return;
            }

            try {
                await subscriptionService.verifyPayment({
                    order_id: orderId,
                    plan_id: '', // Backend handles lookup via orderId
                    billing_cycle: '' // Backend handles lookup via orderId
                });
                setStatus('success');
                setMessage('Thank you for choosing WellZo. Your subscription has been activated and your account is being updated.');
            } catch (error: any) {
                console.error('Verification error:', error);
                setStatus('error');
                setMessage(error.message || 'We could not verify your payment. Please contact support.');
            }
        };

        verify();
    }, [orderId]);

    return (
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full"
            >
                <Card className={`text-center p-8 border-2 transition-colors ${status === 'verifying' ? 'border-primary/20 bg-primary/5' :
                        status === 'success' ? 'border-green-500/20 bg-green-50/10 dark:bg-green-500/5' :
                            'border-red-500/20 bg-red-50/10 dark:bg-red-500/5'
                    }`}>
                    <div className="flex justify-center mb-6">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${status === 'verifying' ? 'bg-primary/10' :
                                status === 'success' ? 'bg-green-100 dark:bg-green-500/20' :
                                    'bg-red-100 dark:bg-red-500/20'
                            }`}>
                            {status === 'verifying' && <Loader2 className="w-12 h-12 text-primary animate-spin" />}
                            {status === 'success' && <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />}
                            {status === 'error' && <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />}
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
                        {status === 'verifying' ? 'Verifying Payment' :
                            status === 'success' ? 'Payment Successful!' : 'Verification Failed'}
                    </h1>

                    <p className="text-gray-600 dark:text-muted mb-8 leading-relaxed">
                        {message}
                    </p>

                    <div className="space-y-4">
                        <Button
                            variant={status === 'error' ? 'outline' : 'primary'}
                            className="w-full h-12 text-lg font-semibold"
                            onClick={() => navigate('/settings')}
                            disabled={status === 'verifying'}
                        >
                            {status === 'error' ? 'Go to Settings' : 'Go to Dashboard'}
                            <ArrowRight className="ml-2" size={20} />
                        </Button>

                        {status === 'success' && (
                            <p className="text-sm text-gray-500">
                                A confirmation email has been sent to your registered address.
                            </p>
                        )}
                    </div>
                </Card>
            </motion.div>
        </div>
    );
};
