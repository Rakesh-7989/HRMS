import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UpgradeBanner } from './UpgradeBanner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface SubscriptionGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    mode?: 'hide' | 'disable' | 'message';
    minPlan?: number; // 1=STANDARD, 2=PREMIUM, 3=ELITE
    fullPage?: boolean; // If true, wraps fallback/message in DashboardLayout
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
    children,
    fallback,
    mode = 'message',
    minPlan = 1,
    fullPage = true
}) => {
    const { hasActivePlan, user, atLeastPlan } = useAuth() as any;

    const isAllowed = user?.role === 'SUPER_ADMIN' || (hasActivePlan && (atLeastPlan ? atLeastPlan(minPlan) : true));

    // Super admins are always allowed or if plan matches
    if (isAllowed) {
        return <>{children}</>;
    }

    if (mode === 'hide') {
        return null;
    }

    const planNames: Record<number, string> = { 1: 'STANDARD', 2: 'PREMIUM', 3: 'ELITE' };
    const requiredPlan = planNames[minPlan] || 'Active';

    const renderBanner = () => {
        if (fallback) {
            return <>{fallback}</>;
        }

        if (mode === 'disable') {
            return (
                <div className="relative opacity-60 cursor-not-allowed pointer-events-none select-none">
                    {children}
                    <div className="absolute inset-0 z-10" title={`Requires ${requiredPlan} subscription`} />
                </div>
            );
        }

        return (
            <div className="py-8">
                <UpgradeBanner
                    planName={requiredPlan}
                    message={`This feature is part of our ${requiredPlan} tier. Upgrade to access premium HR tools and advanced analytics.`}
                />
            </div>
        );
    };

    if (fullPage && (mode === 'message' || fallback)) {
        return (
            <DashboardLayout title="Access Restricted">
                {renderBanner()}
            </DashboardLayout>
        );
    }

    return renderBanner();
};
