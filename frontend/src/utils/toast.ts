import { toast } from 'react-hot-toast';

export const showToast = {
    success: (message: string) => {
        toast.success(message, {
            style: {
                borderRadius: '16px',
                background: '#10B981',
                color: '#fff',
                fontWeight: '700',
                fontSize: '14px',
                padding: '12px 20px',
                boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2), 0 4px 6px -2px rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
            },
            iconTheme: {
                primary: '#fff',
                secondary: '#10B981',
            },
        });
    },
    error: (error: any) => {
        let message = 'An error occurred';

        if (typeof error === 'string') {
            message = error;
        } else if (error?.response?.data?.message) {
            message = error.response.data.message;
        } else if (error?.message) {
            message = error.message;
        }

        toast.error(message, {
            style: {
                borderRadius: '16px',
                background: '#EF4444',
                color: '#fff',
                fontFamily: 'inherit',
                fontWeight: '600',
                fontSize: '14px',
                padding: '12px 20px',
                boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.2), 0 4px 6px -2px rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
            },
            iconTheme: {
                primary: '#fff',
                secondary: '#EF4444',
            },
        });
    },
    info: (message: string) => {
        toast(message, {
            icon: 'ℹ️',
            style: {
                borderRadius: '16px',
                background: '#3B82F6',
                color: '#fff',
                fontFamily: 'inherit',
                fontWeight: '600',
                fontSize: '14px',
                padding: '12px 20px',
                boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.2), 0 4px 6px -2px rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
            },
        });
    },
    loading: (message: string) => {
        return toast.loading(message, {
            style: {
                borderRadius: '16px',
                background: '#4F46E5',
                color: '#fff',
                fontWeight: '700',
                fontSize: '14px',
                padding: '12px 20px',
                boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.2), 0 4px 6px -2px rgba(79, 70, 229, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
            },
        });
    },
    promise: <T>(
        promise: Promise<T>,
        messages: { loading: string; success: string; error: string }
    ) => {
        return toast.promise(
            promise,
            {
                loading: messages.loading,
                success: messages.success,
                error: messages.error,
            },
            {
                style: {
                    borderRadius: '16px',
                    background: '#1F2937',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '14px',
                    padding: '12px 20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                },
                success: {
                    style: {
                        background: '#10B981',
                    },
                },
                error: {
                    style: {
                        background: '#EF4444',
                    },
                },
            }
        );
    },
    dismiss: (toastId?: string) => {
        toast.dismiss(toastId);
    },
};
