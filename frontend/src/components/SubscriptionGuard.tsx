import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

interface SubscriptionGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    mode?: 'hide' | 'disable' | 'message';
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
    children,
    fallback,
    mode = 'message'
}) => {
    const { hasActivePlan } = useAuth();

    if (hasActivePlan) {
        return <>{children}</>;
    }

    if (mode === 'hide') {
        return null;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    if (mode === 'disable') {
        return (
            <div className="relative opacity-60 cursor-not-allowed pointer-events-none select-none">
                {children}
                <div className="absolute inset-0 z-10" title="Requires active subscription" />
            </div>
        );
    }

    return (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-6 flex flex-col items-center text-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-500" />
            </div>
            <div>
                <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                    Subscription Plan Required
                </h3>
                <p className="text-amber-700 dark:text-amber-300 mt-1 max-w-md">
                    Your organization does not have an active subscription plan.
                    Please contact your administrator to activate a plan and access this feature.
                </p>
            </div>
        </div>
    );
};
