import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { bonusService } from '@/services/bonus.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/common/PageTransition';
import { Gift, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const typeConfig: Record<string, string> = {
  PERFORMANCE: 'Performance', DIWALI: 'Diwali', ANNUAL: 'Annual',
  SALES_COMMISSION: 'Sales Commission', SPOT: 'Spot', OTHER: 'Other',
};

const freqConfig: Record<string, string> = {
  ONE_TIME: 'One Time', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', ANNUAL: 'Annual',
};

export const BonusPlansContent: React.FC = () => {
  const { data: plans, isLoading } = useQuery({
    queryKey: ['bonus-plans'],
    queryFn: () => bonusService.getPlans().then(r => r.data),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Bonus Plans</h2>
          <Button size="sm" className="gap-2"><Plus size={16} /> New Plan</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans?.map(plan => (
            <Card key={plan.id} hover padding="lg">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-brand-100 dark:bg-brand-900/30">
                  <Gift className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <span className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold',
                  plan.is_active ? 'bg-success-100 dark:bg-success-900/30 text-success-700' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                )}>
                  {plan.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h3 className="font-bold text-neutral-900 dark:text-white mb-1">{plan.name}</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">{typeConfig[plan.type] || plan.type}</p>
              <div className="space-y-1 text-xs text-neutral-400 dark:text-neutral-500">
                <p>Frequency: {freqConfig[plan.frequency] || plan.frequency}</p>
                <p>Calculation: {plan.calculation_method.replace(/_/g, ' ')} · {plan.calculation_value}{plan.calculation_method === 'FIXED' ? '' : '%'}</p>
                {plan.max_amount && <p>Max: ₹{plan.max_amount.toLocaleString()}</p>}
              </div>
            </Card>
          ))}
          {(!plans || plans.length === 0) && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-neutral-400">
              <Gift className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-medium">No bonus plans yet</p>
              <p className="text-sm">Create bonus plans for performance, festivals, or spot recognition</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};
