import React, { useState } from 'react';
import { Dialog, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';

interface PlanPrice {
    id: string;
    interval: string;
    unit_amount: string | number;
    currency: string;
}

interface Plan {
    id: string;
    name: string;
    description?: string;
    price: string | number;
    prices?: PlanPrice[];
    max_employees?: number;
}

interface UpgradePlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: (planId: string) => void;
    currentPlanName: string;
    plans: Plan[];
    isLoading?: boolean;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
    isOpen,
    onClose,
    onUpgrade,
    currentPlanName,
    plans,
    isLoading
}) => {
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');

    const handleUpgrade = () => {
        if (selectedPlanId) {
            onUpgrade(selectedPlanId);
        }
    };

    const getPlanPrice = (plan: Plan) => {
        if (plan.prices && Array.isArray(plan.prices)) {
            const monthlyPrice = plan.prices.find(p => p && p.interval === 'MONTHLY');
            if (monthlyPrice) return monthlyPrice.unit_amount;
        }
        return plan.price;
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={onClose}
            title="Upgrade Tenant Plan"
            description="Select a new subscription plan for this tenant."
        >
            <div className="py-4">
                <div className="mb-4">
                    <p className="text-sm text-muted">Current Plan: <span className="font-semibold text-brand-500">{currentPlanName}</span></p>
                </div>

                <div className="space-y-3">
                    {plans && plans.length > 0 ? (
                        plans.map((plan) => (
                            <div
                                key={plan.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedPlanId(plan.id)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPlanId(plan.id); } }}
                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${selectedPlanId === plan.id
                                    ? 'border-brand-500 bg-brand-500/5'
                                    : 'border-gray-200 dark:border-gray-800 hover:border-brand-500/50'
                                    }`}
                            >
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white uppercase tracking-wider text-xs">{plan.name}</h4>
                                    <p className="text-sm text-muted mt-1">
                                        {plan.max_employees ? `Up to ${plan.max_employees} employees` : 'Unlimited employees'}
                                    </p>
                                </div>
                                <div className="text-right text-sm">
                                    <p className="font-bold text-gray-900 dark:text-white">₹{getPlanPrice(plan)}/mo</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-muted py-4">No plans available</p>
                    )}
                </div>
            </div>

            <DialogFooter>
                <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                    Cancel
                </Button>
                <Button
                    onClick={handleUpgrade}
                    disabled={!selectedPlanId || isLoading}
                    isLoading={isLoading}
                >
                    Confirm Upgrade
                </Button>
            </DialogFooter>
        </Dialog>
    );
};
