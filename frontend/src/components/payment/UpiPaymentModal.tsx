import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Loader2, CheckCircle, XCircle, Copy, ExternalLink, X } from 'lucide-react';
import QRCode from 'qrcode';

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  upiQrCode: string;
  orderId: string;
  onVerify: (orderId: string) => Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }>;
  onSuccess?: (data?: Record<string, unknown>) => void;
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
  amount,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [status, setStatus] = useState<'generating' | 'waiting' | 'verifying' | 'success' | 'failed'>('generating');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);
  const MAX_POLL_ATTEMPTS = 60;

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
      try {
        const result = await onVerify(orderId);
        if (result.success && result.data?.success) {
          stopPolling();
          setStatus('success');
          onSuccess?.(result.data);
          setTimeout(() => onClose(), 2000);
        } else if (result.data?.success === false) {
          if (attemptsRef.current > 3) {
            stopPolling();
            setStatus('failed');
            const errMsg = result.data?.error || 'Payment verification failed.';
            setErrorMessage(String(errMsg));
            onError?.(String(errMsg));
          }
        }
      } catch {
        setStatus('waiting');
      }
    }, 3000);
  }, [orderId, onVerify, onSuccess, onError, onClose, stopPolling]);

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
  }, [isOpen, upiQrCode, startPolling, stopPolling]);

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
             <Button variant="ghost" 
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={18} />
            </Button>

            {/* Content */}
            <div className="p-6 pt-8">
              {/* Status icon */}
              <div className="flex justify-center mb-4">
                {status === 'generating' && (
                  <Loader2 className="w-16 h-16 text-brand-500 animate-spin" />
                )}
                {status === 'waiting' && (
                  <Smartphone className="w-16 h-16 text-brand-500" />
                )}
                {status === 'verifying' && (
                  <Loader2 className="w-16 h-16 text-brand-500 animate-spin" />
                )}
                {status === 'success' && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
                    <CheckCircle className="w-16 h-16 text-success-500" />
                  </motion.div>
                )}
                {status === 'failed' && (
                  <XCircle className="w-16 h-16 text-error-500" />
                )}
              </div>

              {/* Status text */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {status === 'generating' && 'Generating QR Code...'}
                  {status === 'waiting' && 'Scan QR Code to Pay'}
                  {status === 'verifying' && 'Verifying Payment...'}
                  {status === 'success' && 'Payment Successful!'}
                  {status === 'failed' && 'Payment Failed'}
                </h3>
                {errorMessage && (
                  <p className="text-sm text-error-500 mt-1">{errorMessage}</p>
                )}
                {status === 'waiting' && !errorMessage && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Open your UPI app and scan the QR code to complete the payment.
                  </p>
                )}
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-6">
                {qrDataUrl ? (
                  <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 dark:border-gray-800 dark:bg-gray-800">
                    <img src={qrDataUrl} alt="UPI QR Code" className="w-64 h-64" />
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
                  </div>
                )}
              </div>

              {/* UPI ID & Copy */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-4">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate max-w-[180px]">
                    {upiQrCode}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="text-gray-500 hover:text-brand-500"
                >
                  {copied ? <CheckCircle size={16} className="text-success-500" /> : <Copy size={16} />}
                  <span className="ml-1 text-[11px] font-medium">{copied ? 'Copied!' : 'Copy'}</span>
                </Button>
              </div>

              {/* Amount display */}
              {amount && (
                <div className="text-center mb-4">
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</span>
                  <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">₹{amount.toLocaleString()}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={openUpiApp}
                  disabled={!qrDataUrl || status === 'generating' || status === 'success' || status === 'failed'}
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Open UPI App
                </Button>
                <Button
                  variant={status === 'failed' ? 'primary' : 'outline'}
                  className="flex-1"
                  onClick={handleRetry}
                  disabled={status === 'generating' || status === 'verifying'}
                >
                  <Loader2 className="w-4 h-4 mr-2" />
                  {status === 'failed' ? 'Retry' : 'Regenerate QR'}
                </Button>
              </div>

              {/* Open in UPI App */}
              {qrDataUrl && (
                <Button
                  variant="ghost"
                  className="w-full mt-3 text-xs text-gray-500 hover:text-brand-500"
                  onClick={openUpiApp}
                >
                  <ExternalLink className="w-3 h-3 mr-1 inline-block" />
                  Can't scan? Open in UPI App
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};