import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Loader2, CheckCircle, XCircle, AlertCircle, Copy, ExternalLink, X } from 'lucide-react';
import QRCode from 'qrcode';
import { cn } from '@/utils/cn';

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  upiQrCode: string;
  orderId: string;
  onVerify: (orderId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  onSuccess?: (data?: any) => void;
  onError?: (message: string) => void;
  email?: string;
  amount?: number;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  isOpen,
  onClose,
  upiQrCode,
  orderId,
  onVerify,
  onSuccess,
  onError,
  email,
  amount,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [status, setStatus] = useState<'generating' | 'waiting' | 'verifying' | 'success' | 'failed'>('generating');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);
  const MAX_POLL_ATTEMPTS = 60;

  useEffect(() => {
    if (isOpen && upiQrCode) {
      setStatus('generating');
      QRCode.toDataURL(upiQrCode, {
        width: 300,
        margin: 2,
        color: { dark: '#1e1e2f', light: '#ffffff' },
      })
        .then((url) => {
          setQrDataUrl(url);
          setStatus('waiting');
          startPolling();
        })
        .catch(() => {
          setStatus('failed');
          setErrorMessage('Failed to generate QR code. Please try again.');
        });
    }
    return () => stopPolling();
  }, [isOpen, upiQrCode]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    attemptsRef.current = 0;
    stopPolling();

    pollRef.current = setInterval(async () => {
      attemptsRef.current += 1;

      if (attemptsRef.current > MAX_POLL_ATTEMPTS) {
        stopPolling();
        setStatus('failed');
        setErrorMessage('Payment verification timed out. Please check your UPI app for payment status.');
        return;
      }

      setStatus('verifying');
      try {
        const result = await onVerify(orderId);
        if (result.success && result.data?.success) {
          stopPolling();
          setStatus('success');
          onSuccess?.(result.data);
        } else if (result.data?.success === false) {
          if (attemptsRef.current > 3) {
            stopPolling();
            setStatus('failed');
            const errMsg = result.data?.error || 'Payment verification failed.';
            setErrorMessage(errMsg);
            onError?.(errMsg);
          }
        }
      } catch {
        setStatus('waiting');
      }
    }, 5000);
  }, [orderId, onVerify, onSuccess, onError, stopPolling]);

  const handleCopy = () => {
    navigator.clipboard.writeText(upiQrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetry = () => {
    setStatus('generating');
    setErrorMessage('');
    QRCode.toDataURL(upiQrCode, {
      width: 300,
      margin: 2,
      color: { dark: '#1e1e2f', light: '#ffffff' },
    })
      .then((url) => {
        setQrDataUrl(url);
        setStatus('waiting');
        startPolling();
      });
  };

  const openUpiApp = () => {
    window.open(upiQrCode, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-elev-6 border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={18} />
            </button>

            {/* Content */}
            <div className="p-6 pt-8">
              {/* Status icon */}
              <div className="flex justify-center mb-4">
                {status === 'generating' && (
                  <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                  </div>
                )}
                {status === 'waiting' && (
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center animate-pulse">
                    <Smartphone className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                )}
                {status === 'verifying' && (
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                  </div>
                )}
                {status === 'success' && (
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                )}
                {status === 'failed' && (
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                )}
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white mb-1">
                {status === 'generating' && 'Generating QR Code...'}
                {status === 'waiting' && 'Scan with UPI App'}
                {status === 'verifying' && 'Verifying Payment...'}
                {status === 'success' && 'Payment Successful!'}
                {status === 'failed' && 'Payment Failed'}
              </h3>

              {amount && (
                <p className="text-center text-2xl font-black text-brand-500 mb-4">
                  ₹{amount.toLocaleString()}
                </p>
              )}

              {/* QR code or status */}
              {status === 'generating' && (
                <div className="flex justify-center py-8">
                  <div className="w-64 h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
                  </div>
                </div>
              )}

              {(status === 'waiting' || status === 'verifying') && qrDataUrl && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="p-3 bg-white rounded-xl shadow-elev-4 border border-gray-100">
                      <img src={qrDataUrl} alt="UPI QR Code" className="w-56 h-56" />
                    </div>
                  </div>

                  <div className="flex justify-center gap-2">
                    <button
                      onClick={handleCopy}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        copied
                          ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                      )}
                    >
                      <Copy size={14} />
                      {copied ? 'Copied!' : 'Copy UPI ID'}
                    </button>
                    <button
                      onClick={openUpiApp}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition-all"
                    >
                      <ExternalLink size={14} />
                      Open UPI App
                    </button>
                  </div>

                  <p className="text-[10px] text-center text-gray-400 font-medium px-4">
                    Scan the QR code using any UPI app (Google Pay, PhonePe, Paytm) to complete the payment.
                    This page will automatically detect the payment.
                  </p>

                  {status === 'verifying' && (
                    <div className="flex items-center justify-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-bold">
                      <Loader2 size={14} className="animate-spin" />
                      Checking payment status...
                    </div>
                  )}
                </div>
              )}

              {status === 'success' && (
                <div className="text-center space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your payment has been processed successfully.
                    {email && <><br />Credentials will be sent to <strong className="text-brand-500">{email}</strong></>}
                  </p>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full animate-pulse" style={{ width: '100%' }} />
                  </div>
                </div>
              )}

              {status === 'failed' && (
                <div className="text-center space-y-3">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                    {errorMessage || 'Payment could not be processed.'}
                  </p>
                  <button
                    onClick={handleRetry}
                    className="w-full py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-500-dark transition-colors"
                  >
                    Retry Payment
                  </button>
                </div>
              )}

              {errorMessage && status !== 'failed' && (
                <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] font-bold text-red-500">{errorMessage}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
