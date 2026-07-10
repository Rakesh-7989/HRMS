import React from 'react';
import { Toaster } from 'react-hot-toast';

export const ToastProvider: React.FC = () => (
  <Toaster
    position="top-right"
    reverseOrder={false}
    gutter={8}
    toastOptions={{
      duration: 4000,
      style: {
        borderRadius: '8px',
        padding: '12px 16px',
        fontSize: '14px',
        fontWeight: 500,
      },
      success: {
        style: {
          background: 'var(--success-bg, #ECFDF5)',
          color: 'var(--success, #059669)',
          border: '1px solid rgba(5, 150, 105, 0.2)',
        },
        iconTheme: {
          primary: '#059669',
          secondary: '#ECFDF5',
        },
      },
      error: {
        style: {
          background: 'var(--error-bg, #FEF2F2)',
          color: 'var(--error, #DC2626)',
          border: '1px solid rgba(220, 38, 38, 0.2)',
        },
        iconTheme: {
          primary: '#DC2626',
          secondary: '#FEF2F2',
        },
      },
    }}
  />
);
