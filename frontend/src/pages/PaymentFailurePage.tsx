import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTranslation } from 'react-i18next';

export const PaymentFailurePage: React.FC = () => {
  const { t: _t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full"
            >
                <Card className="text-center p-8 border-2 border-red-500/20 bg-red-50/10 dark:bg-red-500/5">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
                            <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Payment Failed</h1>
                    <p className="text-gray-600 dark:text-muted mb-8">
                        We couldn't process your payment. This could be due to an expired card, insufficient funds, or a temporary issue with the payment gateway.
                    </p>
                    <div className="space-y-4">
                        <Button
                            variant="primary"
                            className="w-full h-12 text-lg font-semibold"
                            onClick={() => navigate('/pricing')}
                        >
                            <RefreshCw className="mr-2" size={20} />
                            Try Again
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full h-12 font-semibold"
                            onClick={() => navigate('/settings')}
                        >
                            <ArrowLeft className="mr-2" size={20} />
                            Return to Settings
                        </Button>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
};
