import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Loader2, AlertCircle, ArrowLeft, Shield, CheckCircle, RefreshCw, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { tenantRegistrationService } from '@/services/tenantRegistration.service';
import { UpiPaymentModal } from '@/components/payment/UpiPaymentModal';
import { useTranslation } from 'react-i18next';

export const CompletePaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant_id');
  const email = searchParams.get('email');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upiState, setUpiState] = useState<{
    open: boolean;
    qrCode: string;
    orderId: string;
  }>({ open: false, qrCode: '', orderId: '' });

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
        const cashfree = (window as any).Cashfree({
          mode: import.meta.env.VITE_CASHFREE_ENVIRONMENT || 'sandbox'
        });

        await cashfree.checkout({
          paymentSessionId: response.data.payment_session_id,
          redirectTarget: '_self'
        });
      } else {
        setError(t('payment.errors.createSession'));
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || t('payment.errors.initPayment');
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithUpi = async () => {
    if (!tenantId || !email) return;

    setLoading(true);
    setError(null);

    try {
      const response = await tenantRegistrationService.initiatePaymentForTenant(tenantId, email);

      if (response.success && response.data?.order_id) {
        const qrResponse = await tenantRegistrationService.getUpiQr(response.data.order_id);

        if (qrResponse.success && qrResponse.data?.upi_qr_code) {
          setUpiState({
            open: true,
            qrCode: qrResponse.data.upi_qr_code,
            orderId: response.data.order_id,
          });
        } else {
          setError(qrResponse.message || t('payment.errors.upiQrFailed'));
        }
      } else {
        setError(t('payment.errors.createSession'));
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || t('payment.errors.initUpi');
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUpi = useCallback(async (orderId: string) => {
    try {
      const result = await tenantRegistrationService.verifyPaymentPublic(orderId);
      return { success: true, data: result };
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || t('payment.errors.verificationFailed');
      if (err?.response?.status === 500 || errMsg.includes('not found') || errMsg.includes('No')) {
        return { success: true, data: { success: false, error: errMsg } };
      }
      throw err;
    }
  }, []);

  const handleUpiSuccess = useCallback(() => {
    setTimeout(() => {
      navigate('/payment-success?order_id=' + upiState.orderId, { replace: true });
    }, 2000);
  }, [navigate, upiState.orderId]);

  const handleUpiError = useCallback((_message: string) => {
    setUpiState({ open: false, qrCode: '', orderId: '' });
  }, []);

  if (!tenantId || !email) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full"
      >
        <div className="flex items-center gap-2 mb-4 justify-center scale-90">
          <AnimatedLogo size="md" />
        </div>

        <Card className="p-6 border-2 border-amber-500/20 bg-amber-50/5 dark:bg-amber-500/5 shadow-elev-6">
          <div className="text-center mb-6">
            <motion.div
              className="w-16 h-16 mx-auto mb-3 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CreditCard className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </motion.div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white mb-1 uppercase tracking-tight">
              {t('payment.title')}
            </h1>
            <p className="text-xs text-gray-500 dark:text-muted leading-tight px-4 font-bold italic">
              {t('payment.subtitle')}
            </p>
          </div>

          <div className="space-y-2 mb-5">
            <div className="flex items-start gap-2 p-3 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
              <Shield className="text-brand-500 mt-0.5 shrink-0" size={14} />
              <div>
                <p className="text-[10px] font-black uppercase text-gray-900 dark:text-white">{t('payment.secureLabel')}</p>
                <p className="text-[9px] text-gray-400 leading-tight">{t('payment.secureDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
              <CheckCircle className="text-green-500 mt-0.5 shrink-0" size={14} />
              <div>
                <p className="text-[10px] font-black uppercase text-gray-900 dark:text-white">{t('payment.instantLabel')}</p>
                <p className="text-[9px] text-gray-400 leading-tight">{t('payment.instantDesc')}</p>
              </div>
            </div>
          </div>

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

          <div className="space-y-2">
            <Button
              variant="primary"
              className="w-full h-11 text-sm font-black tracking-widest uppercase relative overflow-hidden group shadow-elev-4 shadow-brand-500/20"
              onClick={handleCompletePayment}
              disabled={loading}
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              {loading ? <Loader2 className="animate-spin" size={18} /> : t('payment.gatewayCta')}
            </Button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 text-[10px] font-bold text-gray-400 bg-white dark:bg-gray-900 uppercase tracking-widest">
                  {t('payment.orDivider')}
                </span>
              </div>
            </div>

             <Button variant="ghost" 
              onClick={handlePayWithUpi}
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-black tracking-widest uppercase shadow-elev-4 shadow-green-600/20 transition-all disabled:opacity-50"
            >
              <Smartphone size={18} />
              {loading ? <Loader2 className="animate-spin" size={18} /> : t('payment.upiCta')}
            </Button>

             <Button variant="ghost" 
              className="w-full h-10 text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-500/10 rounded-xl transition-all"
              onClick={() => navigate('/register')}
              disabled={loading}
            >
              <RefreshCw size={12} />
              {t('payment.editDetails')}
            </Button>

             <Button variant="ghost" 
              className="w-full h-10 text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-500/10 rounded-xl transition-all"
              onClick={() => navigate('/login')}
              disabled={loading}
            >
              <ArrowLeft size={12} />
              {t('payment.backToLogin')}
            </Button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 text-center">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-1">{t('payment.authenticatedLabel')}</span>
            <p className="text-[11px] font-black text-brand-500 leading-none truncate underline decoration-primary/30">
              {email}
            </p>
          </div>
        </Card>
      </motion.div>

      <UpiPaymentModal
        isOpen={upiState.open}
        onClose={() => setUpiState({ open: false, qrCode: '', orderId: '' })}
        upiQrCode={upiState.qrCode}
        orderId={upiState.orderId}
        onVerify={handleVerifyUpi}
        onSuccess={handleUpiSuccess}
        onError={handleUpiError}
        email={email || undefined}
      />
    </div>
  );
};
