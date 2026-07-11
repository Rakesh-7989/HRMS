import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bonusService } from '@/services/bonus.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/common/PageTransition';
import { Users, Plus, IndianRupee, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { toast } from 'react-hot-toast';

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700' },
  APPROVED: { label: 'Approved', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700' },
  PAID: { label: 'Paid', color: 'bg-success-100 dark:bg-success-900/30 text-success-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-error-100 dark:bg-error-900/30 text-error-500' },
};

export const EmployeeBonusesContent: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<string | undefined>(undefined);

  const { data: bonuses, isLoading } = useQuery({
    queryKey: ['employee-bonuses', filter],
    queryFn: () => bonusService.getEmployeeBonuses(filter).then(r => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => bonusService.approveBonus(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employee-bonuses'] }); toast.success('Bonus approved'); },
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            {[{ id: undefined, label: 'All' }, { id: 'PENDING', label: 'Pending' }, { id: 'APPROVED', label: 'Approved' }, { id: 'PAID', label: 'Paid' }].map(f => (
              <button key={f.label} onClick={() => setFilter(f.id)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  filter === f.id ? 'bg-white dark:bg-neutral-900 text-brand-600 shadow-elev-1' : 'text-neutral-500'
                )}>{f.label}</button>
            ))}
          </div>
          <Button size="sm" className="gap-2"><Plus size={16} /> Assign Bonus</Button>
        </div>
        <div className="space-y-3">
          {bonuses?.map(b => (
            <Card key={b.id} padding="md" className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-sm font-bold text-brand-600">
                  {b.employee?.first_name?.[0]}{b.employee?.last_name?.[0]}
                </div>
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white text-sm">{b.employee?.first_name} {b.employee?.last_name}</p>
                  <p className="text-xs text-neutral-400">{b.plan?.name || 'Bonus'} · {b.payout_month}/{b.payout_year}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-brand-500">₹{b.amount.toLocaleString()}</span>
                <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', statusConfig[b.status]?.color)}>{statusConfig[b.status]?.label}</span>
                {b.status === 'PENDING' && (
                  <button onClick={() => approveMutation.mutate(b.id)} className="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-bold hover:bg-brand-600">Approve</button>
                )}
              </div>
            </Card>
          ))}
          {(!bonuses || bonuses.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
              <Users className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-medium">No bonuses assigned</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};
