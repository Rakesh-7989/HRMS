import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { bonusService } from '@/services/bonus.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/common/PageTransition';
import { Percent, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export const CommissionStructuresContent: React.FC = () => {
  const { data: commissions, isLoading } = useQuery({
    queryKey: ['commission-structures'],
    queryFn: () => bonusService.getCommissionStructures().then(r => r.data),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Commission Structures</h2>
          <Button size="sm" className="gap-2"><Plus size={16} /> New Structure</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {commissions?.map(c => (
            <Card key={c.id} hover padding="lg">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-900/30">
                  <Percent className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <span className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold',
                  c.is_active ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-500'
                )}>{c.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <h3 className="font-bold text-neutral-900 dark:text-white mb-1">{c.name}</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 capitalize">{c.applicable_to.replace('_', ' ').toLowerCase()}</p>
              <div className="text-sm font-bold text-brand-500">
                {c.calculation_type === 'PERCENTAGE' ? `${c.value}%` : `₹${c.value}`}
                {c.threshold ? ` (above ₹${c.threshold.toLocaleString()})` : ''}
              </div>
              <p className="text-xs text-neutral-400 mt-1 capitalize">Frequency: {c.frequency.replace('_', ' ').toLowerCase()}</p>
            </Card>
          ))}
          {(!commissions || commissions.length === 0) && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-neutral-400">
              <Percent className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-medium">No commission structures yet</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};
