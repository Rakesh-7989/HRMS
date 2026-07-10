
import React, { useEffect, useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Activity, RefreshCw, Search, History, Clock } from 'lucide-react';
import { auditService, AuditLog } from '@/services/audit.service';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';

// Utility for polling
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

export const ActivityPage: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [now, setNow] = useState<Date>(new Date());

  // Ticking clock for "Live" feel
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchLogs = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await auditService.getLogs();
      setLogs(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error(error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Poll every 5 seconds if "Live"
  useInterval(() => {
    if (isLive) {
      fetchLogs(true);
    }
  }, 5000);

  const filteredLogs = logs.filter(log =>
    Object.values(log).some(val =>
      String(val).toLowerCase().includes(search.toLowerCase())
    )
  );

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800">Created</span>;
      case 'UPDATE':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 border border-fuchsia-200 dark:border-fuchsia-800">Updated</span>;
      case 'DELETE':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">Deleted</span>;
      case 'LOGIN':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800">Login</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">{action}</span>;
    }
  };

  const columns = [
    {
      header: 'Timestamp',
      accessorKey: 'created_at' as keyof AuditLog,
      cell: (row: AuditLog) => (
        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
          <Clock size={14} className="text-muted" />
          <span className="font-mono text-xs">{new Date(row.created_at).toLocaleString()}</span>
        </div>
      ),
      className: 'whitespace-nowrap w-48'
    },
    {
      header: 'Actor',
      cell: (row: AuditLog) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {(row.actor_first_name?.[0] || row.actor_email?.[0] || 'U').toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white text-sm">
              {row.actor_first_name} {row.actor_last_name}
            </div>
            <div className="text-xs text-muted">{row.actor_email || 'System User'}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Action',
      accessorKey: 'action' as keyof AuditLog,
      cell: (row: AuditLog) => getActionBadge(row.action)
    },
    {
      header: 'Target',
      cell: (row: AuditLog) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 capitalize">
            {row.target_table?.replace('_', ' ') || 'System'}
          </span>
          <span className="text-xs text-muted font-mono opacity-70">
            ID: {row.target_id?.substring(0, 8)}...
          </span>
        </div>
      )
    },
    {
      header: 'Details',
      cell: (row: AuditLog) => {
        // More detailed summary
        if (row.old_data && row.new_data) {
          const changes = Object.keys(row.new_data).filter(k => row.new_data[k] !== row.old_data[k]);
          return (
            <span className="text-xs text-muted">
              Changed: {changes.slice(0, 3).join(', ')} {changes.length > 3 ? `+${changes.length - 3} more` : ''}
            </span>
          );
        }
        if (row.new_data) return <span className="text-xs text-muted">Created record</span>;
        if (row.old_data) return <span className="text-xs text-muted">Deleted record</span>;
        return <span className="text-xs text-muted">View details</span>;
      }
    }
  ];

  return (
    <DashboardLayout
      title={t('activity.title')}
      breadcrumbs={[
        { label: t('common.breadcrumbs.dashboard'), href: '/dashboard/system' },
        { label: 'Audit Activity' },
      ]}
    >
      <div className="space-y-6">
        {/* Header Stats / Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Activity size={100} />
            </div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Activity size={24} className="text-white" />
              </div>
              <div>
                <p className="text-purple-100 text-sm font-medium">System Status</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  Active
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400 border-2 border-purple-600"></span>
                  </span>
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <History size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-muted text-sm font-medium">Total Events</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{logs.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg dark:bg-orange-900/20">
                <Clock size={24} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-muted text-sm font-medium">Current Time</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white font-mono tabular-nums">
                  {now.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              type="text"
              placeholder="Search logs by actor, action or target..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Live Updates Toggle */}
            <div
              onClick={() => setIsLive(!isLive)}
              className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 select-none">Live Updates</span>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isLive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isLive ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </div>

            <Button variant="outline" onClick={() => fetchLogs()} disabled={loading} className="gap-2 h-10">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <Card className="border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden rounded-xl bg-white dark:bg-gray-800">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Audit Trail
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted">
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              Last synced: {lastUpdated.toLocaleTimeString()}
            </div>
          </div>

          <DataTable
            data={filteredLogs}
            columns={columns}
            loading={loading}
            emptyMessage="No activity found. System events will appear here."
          />
        </Card>
      </div>
    </DashboardLayout>
  );
};
