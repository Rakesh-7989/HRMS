import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recruitmentService, Candidate } from '@/services/recruitment.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/common/PageTransition';
import { Users, Plus, Mail, Phone, Building2, IndianRupee, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { toast } from 'react-hot-toast';

const statusConfig: Record<string, { label: string; color: string }> = {
  NEW: { label: 'New', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  SCREENING: { label: 'Screening', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  INTERVIEW: { label: 'Interview', color: 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400' },
  OFFERED: { label: 'Offered', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400' },
  HIRED: { label: 'Hired', color: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400' },
  REJECTED: { label: 'Rejected', color: 'bg-error-100 dark:bg-error-900/30 text-error-500 dark:text-error-400' },
  WITHDRAWN: { label: 'Withdrawn', color: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400' },
};

const sourceConfig: Record<string, string> = {
  WEBSITE: 'Website', REFERRAL: 'Referral', PORTAL: 'Portal', AGENCY: 'Agency', DIRECT: 'Direct',
};

export const CandidatesContent: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<string | undefined>(undefined);

  const { data: candidates, isLoading } = useQuery({
    queryKey: ['recruitment-candidates', filter],
    queryFn: () => recruitmentService.getCandidates(filter).then(r => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      recruitmentService.updateCandidateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruitment-candidates'] });
      toast.success('Status updated');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            {[{ id: undefined, label: 'All' }, { id: 'NEW', label: 'New' }, { id: 'INTERVIEW', label: 'Interview' }, { id: 'HIRED', label: 'Hired' }].map(f => (
              <button
                key={f.label}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  filter === f.id ? 'bg-white dark:bg-neutral-900 text-brand-600 dark:text-brand-400 shadow-elev-1' : 'text-neutral-500 dark:text-neutral-400'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button size="sm" className="gap-2">
            <Plus size={16} />
            Add Candidate
          </Button>
        </div>

        <div className="space-y-3">
          {candidates?.map(candidate => (
            <Card key={candidate.id} padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-sm font-bold text-brand-600 dark:text-brand-400 shrink-0">
                  {candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-900 dark:text-white text-sm truncate">{candidate.name}</p>
                  <div className="flex items-center gap-3 text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                    <span className="flex items-center gap-1"><Mail size={11} /> {candidate.email}</span>
                    {candidate.phone && <span className="flex items-center gap-1"><Phone size={11} /> {candidate.phone}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  {candidate.experience_years}yrs · {sourceConfig[candidate.source] || candidate.source}
                </span>
                <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', statusConfig[candidate.status]?.color)}>
                  {statusConfig[candidate.status]?.label || candidate.status}
                </span>
              </div>
            </Card>
          ))}
          {(!candidates || candidates.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500">
              <Users className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-medium">No candidates yet</p>
              <p className="text-sm">Candidates will appear when they apply to your jobs</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};
