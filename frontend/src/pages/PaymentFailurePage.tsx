import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, RefreshCw, Mail, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTranslation } from 'react-i18next';

export const PaymentFailurePage: React.FC = () => {
  const { t: _t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Card className="text-center p-8 border-2 border-red-500/20 bg-red-50/10 dark:bg-red-500/5">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <motion.div
              className="w-20 h-20 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center"
              initial={{ rotate: -10 }}
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </motion.div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Payment Unsuccessful</h1>
          <p className="text-gray-600 dark:text-muted mb-6 leading-relaxed">
            We couldn't process your payment. This could be due to an expired card,
            insufficient funds, or a temporary issue with the payment gateway.
          </p>

          {/* Info box */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800 mb-6 text-left">
            <div className="flex items-start gap-3 mb-2">
              <AlertTriangle className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" size={18} />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
                  Don't worry, no money was deducted
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  If any amount was deducted from your account, it will be refunded within 5-7 business days.
                  You can try again or contact support for help.
                </p>
              </div>
            </div>
          </div>

          {orderId && (
            <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3 mb-6 border border-gray-200 dark:border-dark-border">
              <p className="text-xs text-gray-500 dark:text-gray-400">Order Reference</p>
              <p className="text-sm font-mono font-medium text-gray-700 dark:text-gray-300">{orderId}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
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
              className="w-full h-12 font-semibold border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10"
              onClick={() => navigate('/register')}
            >
              <RefreshCw className="mr-2" size={20} />
              Update Organization Info
            </Button>

            <Button
              variant="outline"
              className="w-full h-12 font-semibold"
              onClick={() => navigate('/login')}
            >
              <ArrowLeft className="mr-2" size={20} />
              Go to Login
            </Button>
          </div>

          {/* Support info */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-dark-border">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Mail size={14} />
              <span>Need help? Contact <a href="mailto:support@WellZo.com" className="text-primary hover:underline">support@WellZo.com</a></span>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
