import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complianceService } from '@/services/compliance.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/ui/PageTransition';
import { Download, RefreshCw, Loader2, FileText } from 'lucide-react';
import { cn } from '@/utils/cn';
import { showToast } from '@/utils/toast';

const statusConfig: Record<string, { labelKey: string; color: string }> = {
  GENERATING: { labelKey: 'compliance.generating', color: 'bg-amber-100 text-amber-700' },
  READY: { labelKey: 'compliance.ready', color: 'bg-success-100 text-success-700' },
  FAILED: { labelKey: 'compliance.failed', color: 'bg-error-100 text-error-500' },
};

interface Props {
  type: 'PF' | 'ESI' | 'PT' | 'LWF' | 'FORM_16';
  title: string;
  icon: React.ElementType;
  color: string;
}

export const ComplianceReportsContent: React.FC<Props> = ({ type, title, icon: Icon, color }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: reports, isLoading } = useQuery({
    queryKey: ['compliance-reports', type],
    queryFn: () => complianceService.getReports(type).then(r => r.data),
  });

  const generateMutation = useMutation({
    mutationFn: () => complianceService.generateReport(type, month, year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-reports'] });
      showToast.success(`${title} report generating...`);
    },
  });

  const handleDownload = async (reportId: string) => {
    try {
      const res = await complianceService.downloadReport(reportId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report_${month}_${year}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast.error(t('compliance.downloadFailed'));
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl', color)}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{title}</h2>
              <p className="text-xs text-neutral-400">{t('compliance.description')}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <Button size="sm" onClick={() => generateMutation.mutate()} className="gap-2">
              <RefreshCw size={14} /> {t('compliance.generate')}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
        ) : (
          <div className="space-y-3">
            {reports?.map(report => (
              <Card key={report.id} padding="md" className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn('p-2.5 rounded-xl', color)}>
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white text-sm">{report.title}</p>
                    <p className="text-xs text-neutral-400">
                      {report.employee_count} {t('compliance.employees')} · {new Date(report.generated_at).toLocaleDateString()}
                      {report.total_amount ? ` · ₹${report.total_amount.toLocaleString()}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', statusConfig[report.status]?.color)}>
                    {t(statusConfig[report.status]?.labelKey || 'compliance.generating') || report.status}
                  </span>
                  {report.status === 'READY' && (
                     <Button variant="ghost" onClick={() => handleDownload(report.id)}
                      className="p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 text-brand-500 transition-colors">
                      <Download size={16} />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
            {(!reports || reports.length === 0) && (
              <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
                <FileText className="w-12 h-12 mb-3 opacity-40" />
<p className="font-medium">{t('compliance.noReportsYet')}</p>
              <p className="text-sm">{t('compliance.generateFirstReport', { month, year })}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
};
