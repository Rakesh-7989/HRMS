import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Loader2, AlertCircle, ArrowLeft, Shield, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { tenantRegistrationService } from '@/services/tenantRegistration.service';

export const CompletePaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant_id');
  const email = searchParams.get('email');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !email) {
      navigate('/login', { replace: true });
    }
  }, [tenantId, email, navigate]);

  const handleCompletePayment = async () => {
    if (!tenantId || !email) return;

    setLoading(true);
    setError(null);

    try {
      const response = await tenantRegistrationService.initiatePaymentForTenant(tenantId, email);

      if (response.success && response.data?.payment_session_id) {
        // Initialize Cashfree and redirect to payment gateway
        const cashfree = (window as any).Cashfree({
          mode: 'sandbox' // Change to 'production' for live
        });

        await cashfree.checkout({
          paymentSessionId: response.data.payment_session_id,
          redirectTarget: '_self'
        });
      } else {
        setError('Unable to create payment session. Please try again or contact support.');
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to initiate payment. Please try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!tenantId || !email) return null;

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-4 justify-center scale-90">
          <AnimatedLogo size="md" />
        </div>

        <Card className="p-6 border-2 border-amber-500/20 bg-amber-50/5 dark:bg-amber-500/5 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <motion.div
              className="w-16 h-16 mx-auto mb-3 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CreditCard className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </motion.div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white mb-1 uppercase tracking-tight">
              Complete Payment
            </h1>
            <p className="text-xs text-gray-500 dark:text-muted leading-tight px-4 font-bold italic">
              Almost there! Activate your organization's account by completing the transaction.
            </p>
          </div>

          {/* Info cards */}
          <div className="space-y-2 mb-5">
            <div className="flex items-start gap-2 p-3 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
              <Shield className="text-primary mt-0.5 shrink-0" size={14} />
              <div>
                <p className="text-[10px] font-black uppercase text-gray-900 dark:text-white">Secure Transaction</p>
                <p className="text-[9px] text-gray-400 leading-tight">Encryption powered by Cashfree Protocol.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
              <CheckCircle className="text-green-500 mt-0.5 shrink-0" size={14} />
              <div>
                <p className="text-[10px] font-black uppercase text-gray-900 dark:text-white">Instant Deployment</p>
                <p className="text-[9px] text-gray-400 leading-tight">Credentials will be dispatched to your email instantly.</p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2"
            >
              <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={14} />
              <p className="text-[10px] font-bold text-red-500 italic">{error}</p>
            </motion.div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <Button
              variant="primary"
              className="w-full h-11 text-sm font-black tracking-widest uppercase relative overflow-hidden group shadow-lg shadow-primary/20"
              onClick={handleCompletePayment}
              disabled={loading}
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Proceed to Gateway →'}
            </Button>
            
            <button
              className="w-full h-10 text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-500/10 rounded-xl transition-all"
              onClick={() => navigate('/register')}
              disabled={loading}
            >
              <RefreshCw size={12} />
              Edit My Details
            </button>

            <button
              className="w-full h-10 text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-500/10 rounded-xl transition-all"
              onClick={() => navigate('/login')}
              disabled={loading}
            >
              <ArrowLeft size={12} />
              Back to Login
            </button>
          </div>

          {/* Footer note */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 text-center">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Authenticated Account</span>
            <p className="text-[11px] font-black text-primary leading-none truncate underline decoration-primary/30">
              {email}
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
