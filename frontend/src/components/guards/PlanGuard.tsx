import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Lock } from 'lucide-react';

interface PlanGuardProps {
    minPlan: number; // 1=STANDARD, 2=PREMIUM, 3=ELITE
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showLock?: boolean;
}

export const PlanGuard: React.FC<PlanGuardProps> = ({
    minPlan,
    children,
    fallback,
    showLock = false
}) => {
    const { atLeastPlan } = useAuth() as any;

    const isAllowed = atLeastPlan ? atLeastPlan(minPlan) : false;

    if (isAllowed) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    if (showLock) {
        return (
            <div className="relative group cursor-not-allowed opacity-60">
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/20 backdrop-blur-[1px] z-10 rounded-lg">
                    <Lock className="w-5 h-5 text-gray-500" />
                </div>
                <div className="pointer-events-none">
                    {children}
                </div>
            </div>
        );
    }

    return null;
};

