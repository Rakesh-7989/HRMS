import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Loader2, XCircle, Mail, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { tenantRegistrationService } from '@/services/tenantRegistration.service';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

export const PaymentSuccessPage: React.FC = () => {
  const { t: _t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const verify = async () => {
      if (!orderId) {
        setStatus('error');
        setMessage('Invalid order reference. Please contact support if any amount was deducted.');
        return;
      }

      try {
        // Use public API (no auth required) for registration flow
        await tenantRegistrationService.verifyPaymentPublic(orderId);
        setStatus('success');
        setMessage('Your payment has been verified successfully. Your subscription is now active and login credentials have been sent to your email.');
      } catch (error: any) {
        console.error('Verification error:', error);
        const errMsg = error?.response?.data?.message || error?.message || 'We could not verify your payment.';
        setStatus('error');
        setMessage(errMsg);
      }
    };

    verify();
  }, [orderId]);

  // Auto-redirect countdown after success
  useEffect(() => {
    if (status !== 'success') return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(isAuthenticated ? '/dashboard' : '/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, navigate, isAuthenticated]);

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Card className={`text-center p-8 border-2 transition-colors ${
          status === 'verifying' ? 'border-primary/20 bg-primary/5' :
          status === 'success' ? 'border-green-500/20 bg-green-50/10 dark:bg-green-500/5' :
          'border-red-500/20 bg-red-50/10 dark:bg-red-500/5'
        }`}>
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <motion.div 
              className={`w-20 h-20 rounded-full flex items-center justify-center ${
                status === 'verifying' ? 'bg-primary/10' :
                status === 'success' ? 'bg-green-100 dark:bg-green-500/20' :
                'bg-red-100 dark:bg-red-500/20'
              }`}
              animate={status === 'success' ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              {status === 'verifying' && <Loader2 className="w-12 h-12 text-primary animate-spin" />}
              {status === 'success' && <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />}
              {status === 'error' && <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />}
            </motion.div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
            {status === 'verifying' ? 'Verifying Payment' :
              status === 'success' ? 'Payment Successful!' : 'Verification Failed'}
          </h1>

          {/* Message */}
          <p className="text-gray-600 dark:text-muted mb-6 leading-relaxed">
            {message}
          </p>

          {/* Success details */}
          {status === 'success' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4 mb-6"
            >
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3 mb-3">
                  <Mail className="text-green-600 dark:text-green-400" size={20} />
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    Check your email for login credentials
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="text-green-600 dark:text-green-400" size={20} />
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    Change your password on first login
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <Button
              variant={status === 'error' ? 'outline' : 'primary'}
              className="w-full h-12 text-lg font-semibold"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
              disabled={status === 'verifying'}
            >
              {status === 'verifying' ? 'Please wait...' :
                status === 'success' ? `Go to Login (${countdown}s)` :
                'Go to Login'}
              {status !== 'verifying' && <ArrowRight className="ml-2" size={20} />}
            </Button>

            {status === 'error' && (
              <Button
                variant="primary"
                className="w-full h-12 font-semibold"
                onClick={() => navigate('/payment-failure')}
              >
                View Options
              </Button>
            )}

            {status === 'success' && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                A confirmation email has been sent to your registered address.
              </p>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
